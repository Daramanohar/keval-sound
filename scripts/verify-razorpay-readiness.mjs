import Razorpay from "razorpay";
import { withClient } from "./lib/db.mjs";
import { loadLocalEnv, requireEnv } from "./lib/env.mjs";

loadLocalEnv();

const keyId = requireEnv("RAZORPAY_KEY_ID");
const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
const webhookSecret = requireEnv("RAZORPAY_WEBHOOK_SECRET");
const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS?.trim();
const appUrl = requireEnv("APP_URL");
const cronSecret = requireEnv("CRON_SECRET");
const livemode = keyId.startsWith("rzp_live_");
const allowLive = process.argv.includes("--allow-live");

if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
  throw new Error("RAZORPAY_KEY_ID is not a valid Razorpay test or live key ID.");
}
if (keySecret.length < 16) {
  throw new Error("RAZORPAY_KEY_SECRET is too short.");
}
if (webhookSecret.length < 32) {
  throw new Error("RAZORPAY_WEBHOOK_SECRET must contain at least 32 characters.");
}
if (previousWebhookSecret && previousWebhookSecret.length < 32) {
  throw new Error(
    "RAZORPAY_WEBHOOK_SECRET_PREVIOUS must contain at least 32 characters when configured."
  );
}
if (cronSecret.length < 32) {
  throw new Error("CRON_SECRET must contain at least 32 characters.");
}
if (livemode && (!allowLive || process.env.RAZORPAY_ALLOW_LIVE_MODE !== "true")) {
  throw new Error(
    "Refusing live-mode verification without RAZORPAY_ALLOW_LIVE_MODE=true and --allow-live."
  );
}

const parsedAppUrl = new URL(appUrl);
if (
  parsedAppUrl.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(parsedAppUrl.hostname)
) {
  throw new Error("APP_URL must use HTTPS outside local development.");
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
const providerColumn = livemode ? "razorpay_live_plan_id" : "razorpay_test_plan_id";

function assertProviderPlan(providerPlan, plan) {
  if (
    providerPlan.period !== "monthly" ||
    Number(providerPlan.interval) !== 1 ||
    Number(providerPlan.item.amount) !== plan.amount_paise ||
    providerPlan.item.currency.toUpperCase() !== plan.currency.toUpperCase()
  ) {
    throw new Error(`Razorpay plan mismatch for ${plan.code}.`);
  }
}

async function main() {
  await razorpay.orders.all({ count: 1 });

  const audit = await withClient(async (client) => {
    const migrations = await client.query(`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `);
    const applied = new Set(migrations.rows.map((row) => row.migration_name));
    const requiredMigrations = [
      "20260808000100_razorpay_provider",
      "20260808000200_razorpay_schema",
      "20260808000300_payment_disputes",
    ];
    const missingMigrations = requiredMigrations.filter((name) => !applied.has(name));

    const plans = await client.query(`
      SELECT
        code::text AS code,
        amount_paise,
        currency,
        is_active,
        is_purchasable,
        ${providerColumn} AS provider_plan_id
      FROM plans
      WHERE is_active = true
      ORDER BY amount_paise ASC
    `);
    const commerce = await client.query(`
      SELECT
        (SELECT count(*)::int FROM orders) AS orders,
        (SELECT count(*)::int FROM payments) AS payments,
        (SELECT count(*)::int FROM subscriptions) AS subscriptions,
        (SELECT count(*)::int FROM webhook_events WHERE provider = 'RAZORPAY') AS razorpay_webhooks
    `);
    return {
      missingMigrations,
      plans: plans.rows,
      commerce: commerce.rows[0],
    };
  });

  if (audit.missingMigrations.length > 0) {
    throw new Error(`Missing database migrations: ${audit.missingMigrations.join(", ")}`);
  }
  if (audit.plans.length !== 4) {
    throw new Error(`Expected four active plans, found ${audit.plans.length}.`);
  }

  const planResults = [];
  for (const plan of audit.plans) {
    if (!plan.provider_plan_id) {
      planResults.push({ code: plan.code, status: "provider_plan_missing" });
      continue;
    }
    const providerPlan = await razorpay.plans.fetch(plan.provider_plan_id);
    assertProviderPlan(providerPlan, plan);
    planResults.push({
      code: plan.code,
      status: plan.is_purchasable ? "ready" : "disabled_in_database",
    });
  }

  const missingPlans = planResults.filter(
    (plan) => plan.status === "provider_plan_missing"
  );
  console.log(
    JSON.stringify(
      {
        mode: livemode ? "live" : "test",
        appOrigin: parsedAppUrl.origin,
        apiCredentials: "verified",
        webhookSecret: "configured",
        webhookSecretRotation: previousWebhookSecret
          ? "previous_secret_enabled"
          : "single_secret",
        scheduledMaintenanceSecret: "configured",
        databaseMigrations: "current",
        plans: planResults,
        commerce: audit.commerce,
        readyForCheckout: missingPlans.length === 0,
      },
      null,
      2
    )
  );

  if (missingPlans.length > 0) {
    throw new Error(
      "Razorpay credentials are valid, but provider plans are not synchronized. Run npm run razorpay:sync-plans."
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
