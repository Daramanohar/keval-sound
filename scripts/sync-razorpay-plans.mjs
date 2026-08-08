import Razorpay from "razorpay";
import { withClient } from "./lib/db.mjs";
import { loadLocalEnv, requireEnv } from "./lib/env.mjs";

loadLocalEnv();

const keyId = requireEnv("RAZORPAY_KEY_ID");
const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
const livemode = keyId.startsWith("rzp_live_");
const allowLive = process.argv.includes("--allow-live");

if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
  throw new Error("RAZORPAY_KEY_ID is not a valid Razorpay test or live key ID.");
}
if (livemode && (!allowLive || process.env.RAZORPAY_ALLOW_LIVE_MODE !== "true")) {
  throw new Error(
    "Refusing to create live Razorpay plans. Set RAZORPAY_ALLOW_LIVE_MODE=true and re-run with --allow-live only after test-mode sign-off."
  );
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
const providerColumn = livemode ? "razorpay_live_plan_id" : "razorpay_test_plan_id";

function note(plan, key) {
  const value = plan.notes?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function assertPlanMatches(providerPlan, plan) {
  const matches =
    providerPlan.period === "monthly" &&
    Number(providerPlan.interval) === 1 &&
    Number(providerPlan.item.amount) === plan.amount_paise &&
    providerPlan.item.currency.toUpperCase() === plan.currency.toUpperCase();
  if (!matches) {
    throw new Error(
      `Razorpay plan ${providerPlan.id} does not match ${plan.code}. Create a new provider plan instead of changing a live billing contract.`
    );
  }
}

async function resolveProviderPlan(plan, knownPlans) {
  if (plan.provider_plan_id) {
    const existing = await razorpay.plans.fetch(plan.provider_plan_id);
    assertPlanMatches(existing, plan);
    return existing;
  }

  const reusable = knownPlans.find(
    (candidate) =>
      note(candidate, "keval_plan_code") === plan.code &&
      candidate.period === "monthly" &&
      Number(candidate.interval) === 1 &&
      Number(candidate.item.amount) === plan.amount_paise &&
      candidate.item.currency.toUpperCase() === plan.currency.toUpperCase()
  );
  if (reusable) return reusable;

  return razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: `KEVAL SOUND - ${plan.name}`,
      description: plan.description,
      amount: plan.amount_paise,
      currency: plan.currency,
    },
    notes: {
      keval_plan_code: plan.code,
      keval_environment: livemode ? "live" : "test",
    },
  });
}

async function main() {
  const providerPlans = await razorpay.plans.all({ count: 100 });

  await withClient(async (client) => {
    const result = await client.query(`
      SELECT
        id,
        code::text AS code,
        name,
        description,
        amount_paise,
        currency,
        ${providerColumn} AS provider_plan_id
      FROM plans
      WHERE is_active = true
      ORDER BY amount_paise ASC
    `);
    if (result.rows.length === 0) {
      throw new Error("No active Keval plans exist in the database. Apply the backend foundation migration first.");
    }

    for (const plan of result.rows) {
      const providerPlan = await resolveProviderPlan(plan, providerPlans.items);
      await client.query(
        `UPDATE plans SET ${providerColumn} = $1, is_purchasable = true, updated_at = now() WHERE id = $2`,
        [providerPlan.id, plan.id]
      );
      console.log(`${livemode ? "LIVE" : "TEST"} ${plan.code}: ${providerPlan.id}`);
    }
  });

  console.log(`Razorpay ${livemode ? "live" : "test"} plans are synchronized.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
