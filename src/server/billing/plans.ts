import "server-only";

import {
  EntitlementKind,
  EntitlementStatus,
  PaymentProvider,
  PlanCode,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import { getPrisma } from "@/lib/db";
import type { RazorpaySubscriptionCheckout } from "@/lib/razorpay-types";
import type { AppUser } from "@/server/auth/current-user";
import { CHECKOUT_RESERVATION_MINUTES } from "@/server/domain/constants";
import { ApiError } from "@/server/http/api";
import {
  assertTaxConfigurationReady,
  calculateTax,
} from "@/server/commerce/tax";
import {
  getRazorpay,
  getRazorpayPublicKey,
  isRazorpayLivemode,
} from "@/server/payments/razorpay";
import { hashIdempotencyKey, hashRequestPayload } from "@/server/security/idempotency";

const ACTIVE_ACCESS_STATUSES = new Set<SubscriptionStatus>([SubscriptionStatus.ACTIVE]);

const BLOCKING_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.INCOMPLETE,
  SubscriptionStatus.PAUSED,
];

const PLAN_ENTITLEMENTS: Record<PlanCode, readonly EntitlementKind[]> = {
  [PlanCode.KEVAL_RADIO]: [EntitlementKind.RADIO_STREAM, EntitlementKind.LOSSLESS_STREAM],
  [PlanCode.STANDARD]: [EntitlementKind.SAMPLES_ACCESS],
  [PlanCode.PRO]: [
    EntitlementKind.RADIO_STREAM,
    EntitlementKind.LOSSLESS_STREAM,
    EntitlementKind.SAMPLES_ACCESS,
    EntitlementKind.STEMS_ACCESS,
    EntitlementKind.CREATIVE_TOOLS,
  ],
  [PlanCode.ENTERPRISE]: [
    EntitlementKind.RADIO_STREAM,
    EntitlementKind.LOSSLESS_STREAM,
    EntitlementKind.SAMPLES_ACCESS,
    EntitlementKind.STEMS_ACCESS,
    EntitlementKind.CREATIVE_TOOLS,
    EntitlementKind.ENTERPRISE_SUPPORT,
  ],
};

function timestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function subscriptionNote(subscription: Subscriptions.RazorpaySubscription, key: string) {
  const value = subscription.notes?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function mapSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "created":
    case "authenticated":
      return SubscriptionStatus.INCOMPLETE;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "pending":
      return SubscriptionStatus.PAST_DUE;
    case "halted":
      return SubscriptionStatus.UNPAID;
    case "paused":
      return SubscriptionStatus.PAUSED;
    case "cancelled":
    case "completed":
      return SubscriptionStatus.CANCELED;
    case "expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    default:
      throw new ApiError(
        409,
        "subscription_status_unknown",
        `Unsupported Razorpay subscription status: ${status}`
      );
  }
}

function planIdForMode(plan: {
  razorpayTestPlanId: string | null;
  razorpayLivePlanId: string | null;
}) {
  return isRazorpayLivemode() ? plan.razorpayLivePlanId : plan.razorpayTestPlanId;
}

function subscriptionCount() {
  const configured = Number(process.env.RAZORPAY_SUBSCRIPTION_TOTAL_COUNT ?? "120");
  return Number.isInteger(configured) && configured >= 1 && configured <= 1_200
    ? configured
    : 120;
}

function parseStoredCheckout(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, Prisma.JsonValue>;
  if (
    body.provider !== "razorpay" ||
    body.flow !== "subscription" ||
    typeof body.appSubscriptionId !== "string" ||
    typeof body.providerSubscriptionId !== "string" ||
    typeof body.keyId !== "string" ||
    typeof body.amount !== "number" ||
    typeof body.currency !== "string" ||
    typeof body.planCode !== "string"
  ) {
    return null;
  }
  return body as unknown as RazorpaySubscriptionCheckout;
}

export async function listActivePlans() {
  const plans = await getPrisma().plan.findMany({
    where: { isActive: true },
    orderBy: { amountPaise: "asc" },
    select: {
      code: true,
      name: true,
      description: true,
      amountPaise: true,
      currency: true,
      interval: true,
      features: true,
      isPurchasable: true,
      razorpayTestPlanId: true,
      razorpayLivePlanId: true,
    },
  });

  return plans.map((plan) => {
    const quote = calculateTax(plan.amountPaise, "SUBSCRIPTION");
    return {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      amountPaise: quote.totalPaise,
      advertisedAmountPaise: plan.amountPaise,
      taxableAmountPaise: quote.taxablePaise,
      taxPaise: quote.taxPaise,
      taxRateBps: quote.config.rateBps,
      taxMode: quote.config.pricingMode,
      sacCode: quote.config.sacCode,
      currency: plan.currency,
      interval: plan.interval,
      features: Array.isArray(plan.features)
        ? plan.features.filter((feature): feature is string => typeof feature === "string")
        : [],
      available: plan.isPurchasable && Boolean(planIdForMode(plan)),
    };
  });
}

function subscriptionCheckoutResponse(input: {
  user: AppUser;
  plan: {
    code: PlanCode;
    name: string;
    description: string;
    amountPaise: number;
    currency: string;
  };
  taxRateBps: number;
  sacCode: string;
  appSubscriptionId: string;
  providerSubscriptionId: string;
}) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const name = [input.user.firstName, input.user.lastName].filter(Boolean).join(" ").trim();
  const response: RazorpaySubscriptionCheckout = {
    provider: "razorpay",
    flow: "subscription",
    appSubscriptionId: input.appSubscriptionId,
    providerSubscriptionId: input.providerSubscriptionId,
    planCode: input.plan.code,
    keyId: getRazorpayPublicKey(),
    amount: calculateTax(input.plan.amountPaise, "SUBSCRIPTION").totalPaise,
    currency: input.plan.currency,
    name: "KEVAL SOUND",
    description: `${input.plan.name} monthly plan`,
    ...(appUrl ? { image: `${appUrl}/logo/keval-logo.png` } : {}),
    prefill: {
      ...(name ? { name } : {}),
      ...(input.user.email ? { email: input.user.email } : {}),
    },
    notes: {
      keval_plan_code: input.plan.code,
      keval_user_id: input.user.kevalUserId,
      gst_rate_bps: String(input.taxRateBps),
      sac_code: input.sacCode,
    },
    theme: { color: "#e5422e", backdropColor: "#0c0d1c" },
    timeoutSeconds: CHECKOUT_RESERVATION_MINUTES * 60,
  };
  return response;
}

async function findOrCreateProviderSubscription(input: {
  planId: string;
  planCode: PlanCode;
  planDatabaseId: string;
  user: AppUser;
  checkoutKeyHash: string;
  taxRateBps: number;
  sacCode: string;
}) {
  const razorpay = getRazorpay();
  const existing = await razorpay.subscriptions.all({ plan_id: input.planId, count: 100 });
  const matching = existing.items.find(
    (candidate) => subscriptionNote(candidate, "keval_checkout_key") === input.checkoutKeyHash
  );
  if (matching) return matching;

  return razorpay.subscriptions.create({
    plan_id: input.planId,
    total_count: subscriptionCount(),
    quantity: 1,
    customer_notify: true,
    expire_by: Math.floor(Date.now() / 1000) + CHECKOUT_RESERVATION_MINUTES * 60,
    notes: {
      keval_flow: "subscription",
      keval_plan_code: input.planCode,
      keval_plan_id: input.planDatabaseId,
      keval_user_id: input.user.kevalUserId,
      app_user_id: input.user.id,
      keval_checkout_key: input.checkoutKeyHash,
      gst_rate_bps: String(input.taxRateBps),
      sac_code: input.sacCode,
    },
  });
}

export async function createSubscriptionCheckout(
  user: AppUser,
  planCode: PlanCode,
  rawIdempotencyKey: string
) {
  const prisma = getPrisma();
  const livemode = isRazorpayLivemode();
  const taxConfig = assertTaxConfigurationReady("SUBSCRIPTION");
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  const providerPlanId = plan ? planIdForMode(plan) : null;
  if (!plan || !plan.isActive || !plan.isPurchasable || !providerPlanId) {
    throw new ApiError(409, "plan_not_available", "This plan is not available for checkout yet.");
  }
  const billingProfile = await prisma.billingProfile.findUnique({
    where: { userId: user.id },
  });
  if (!billingProfile) {
    throw new ApiError(
      409,
      "billing_profile_required",
      "Add your billing address before starting a subscription."
    );
  }
  const billingAddressSnapshot = {
    legalName: billingProfile.legalName,
    addressLine1: billingProfile.addressLine1,
    addressLine2: billingProfile.addressLine2,
    city: billingProfile.city,
    stateName: billingProfile.stateName,
    stateCode: billingProfile.stateCode,
    postalCode: billingProfile.postalCode,
    countryCode: billingProfile.countryCode,
  } satisfies Prisma.InputJsonObject;

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      status: { in: BLOCKING_SUBSCRIPTION_STATUSES },
    },
    select: { id: true },
  });
  if (existingSubscription) {
    throw new ApiError(
      409,
      "subscription_already_exists",
      "Cancel or finish the current subscription before starting another plan."
    );
  }

  const scope = "subscription_checkout";
  const keyHash = hashIdempotencyKey(user.id, scope, rawIdempotencyKey);
  const requestHash = hashRequestPayload({ planCode });
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { userId_scope_key: { userId: user.id, scope, key: keyHash } },
  });
  if (existing && existing.requestHash !== requestHash) {
    throw new ApiError(409, "idempotency_key_reused", "This idempotency key was used for another plan.");
  }
  const stored = parseStoredCheckout(existing?.responseBody ?? null);
  if (stored) return stored;

  if (!existing) {
    try {
      await prisma.idempotencyRecord.create({
        data: {
          userId: user.id,
          scope,
          key: keyHash,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }
  }

  const providerSubscription = await findOrCreateProviderSubscription({
    planId: providerPlanId,
    planCode: plan.code,
    planDatabaseId: plan.id,
    user,
    checkoutKeyHash: keyHash,
    taxRateBps: taxConfig.rateBps,
    sacCode: taxConfig.sacCode,
  });
  const saved = await prisma.subscription.upsert({
    where: {
      provider_providerLivemode_providerSubscriptionId: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerSubscriptionId: providerSubscription.id,
      },
    },
    create: {
      userId: user.id,
      planId: plan.id,
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      providerSubscriptionId: providerSubscription.id,
      providerPlanId,
      billingAddressSnapshot,
      customerGstinSnapshot: billingProfile.gstin,
      placeOfSupplyCode:
        billingProfile.countryCode === "IN" ? billingProfile.stateCode : "96",
      taxRateBps: taxConfig.rateBps,
      taxMode: taxConfig.pricingMode,
      sacCode: taxConfig.sacCode,
      taxConfigVersion: taxConfig.version,
      status: mapSubscriptionStatus(providerSubscription.status),
      currentPeriodStart: timestamp(providerSubscription.current_start),
      currentPeriodEnd: timestamp(providerSubscription.current_end),
      endedAt: timestamp(providerSubscription.ended_at),
    },
    update: {
      userId: user.id,
      planId: plan.id,
      providerPlanId,
      billingAddressSnapshot,
      customerGstinSnapshot: billingProfile.gstin,
      placeOfSupplyCode:
        billingProfile.countryCode === "IN" ? billingProfile.stateCode : "96",
      taxRateBps: taxConfig.rateBps,
      taxMode: taxConfig.pricingMode,
      sacCode: taxConfig.sacCode,
      taxConfigVersion: taxConfig.version,
      status: mapSubscriptionStatus(providerSubscription.status),
      currentPeriodStart: timestamp(providerSubscription.current_start),
      currentPeriodEnd: timestamp(providerSubscription.current_end),
      endedAt: timestamp(providerSubscription.ended_at),
    },
  });
  const response = subscriptionCheckoutResponse({
    user,
    plan,
    appSubscriptionId: saved.id,
    providerSubscriptionId: providerSubscription.id,
    taxRateBps: taxConfig.rateBps,
    sacCode: taxConfig.sacCode,
  });
  await prisma.idempotencyRecord.update({
    where: { userId_scope_key: { userId: user.id, scope, key: keyHash } },
    data: { responseStatus: 201, responseBody: response },
  });
  return response;
}

async function findPlanForSubscription(subscription: Subscriptions.RazorpaySubscription) {
  const planCode = subscriptionNote(subscription, "keval_plan_code");
  const livemode = isRazorpayLivemode();
  return getPrisma().plan.findFirst({
    where: {
      isActive: true,
      OR: [
        ...(planCode && Object.values(PlanCode).includes(planCode as PlanCode)
          ? [{ code: planCode as PlanCode }]
          : []),
        livemode
          ? { razorpayLivePlanId: subscription.plan_id }
          : { razorpayTestPlanId: subscription.plan_id },
      ],
    },
  });
}

export async function syncRazorpaySubscription(subscription: Subscriptions.RazorpaySubscription) {
  const livemode = isRazorpayLivemode();
  const plan = await findPlanForSubscription(subscription);
  if (!plan) {
    throw new ApiError(409, "subscription_plan_unknown", "The Razorpay subscription is not mapped to a Keval plan.");
  }

  const existing = await getPrisma().subscription.findUnique({
    where: {
      provider_providerLivemode_providerSubscriptionId: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerSubscriptionId: subscription.id,
      },
    },
    select: { id: true, userId: true, status: true },
  });
  const metadataUserId = subscriptionNote(subscription, "app_user_id");
  const userId = metadataUserId ?? existing?.userId;
  if (!userId) {
    throw new ApiError(404, "subscription_user_unknown", "The Razorpay subscription is not mapped to a Keval user.");
  }
  const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new ApiError(404, "subscription_user_unknown", "The Keval subscription owner was not found.");
  }

  const status = mapSubscriptionStatus(subscription.status);
  const periodStart = timestamp(subscription.current_start);
  const periodEnd = timestamp(subscription.current_end);
  const cancelAtPeriodEnd =
    subscription.has_scheduled_changes && Boolean(subscription.change_scheduled_at);

  return getPrisma().$transaction(async (tx) => {
    const saved = await tx.subscription.upsert({
      where: {
        provider_providerLivemode_providerSubscriptionId: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerSubscriptionId: subscription.id,
        },
      },
      create: {
        userId: user.id,
        planId: plan.id,
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerSubscriptionId: subscription.id,
        providerPlanId: subscription.plan_id,
        status,
        cancelAtPeriodEnd,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: status === SubscriptionStatus.CANCELED ? timestamp(subscription.ended_at) : null,
        endedAt: timestamp(subscription.ended_at),
      },
      update: {
        userId: user.id,
        planId: plan.id,
        providerPlanId: subscription.plan_id,
        status,
        cancelAtPeriodEnd,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: status === SubscriptionStatus.CANCELED ? timestamp(subscription.ended_at) : null,
        endedAt: timestamp(subscription.ended_at),
      },
    });

    const expectedKinds = PLAN_ENTITLEMENTS[plan.code];
    if (ACTIVE_ACCESS_STATUSES.has(status)) {
      for (const kind of expectedKinds) {
        await tx.entitlement.upsert({
          where: { subscriptionId_kind: { subscriptionId: saved.id, kind } },
          create: {
            userId: user.id,
            subscriptionId: saved.id,
            kind,
            status: EntitlementStatus.ACTIVE,
            startsAt: periodStart ?? new Date(),
            endsAt: periodEnd,
          },
          update: {
            status: EntitlementStatus.ACTIVE,
            startsAt: periodStart ?? new Date(),
            endsAt: periodEnd,
            revokedAt: null,
            revokeReason: null,
          },
        });
      }
      await tx.entitlement.updateMany({
        where: {
          subscriptionId: saved.id,
          kind: { notIn: [...expectedKinds] },
          status: EntitlementStatus.ACTIVE,
        },
        data: {
          status: EntitlementStatus.REVOKED,
          revokedAt: new Date(),
          revokeReason: "plan_changed",
        },
      });
    } else {
      await tx.entitlement.updateMany({
        where: { subscriptionId: saved.id, status: EntitlementStatus.ACTIVE },
        data: {
          status: EntitlementStatus.REVOKED,
          revokedAt: new Date(),
          revokeReason: `subscription_${subscription.status}`,
        },
      });
    }

    if (existing?.status !== SubscriptionStatus.ACTIVE && status === SubscriptionStatus.ACTIVE) {
      await tx.outboxEvent.create({
        data: {
          topic: "subscription.welcome_email",
          aggregateType: "subscription",
          aggregateId: saved.id,
          payload: { subscriptionId: saved.id, userId: user.id, planCode: plan.code },
        },
      });
    }
    return saved;
  });
}

export async function cancelRazorpaySubscription(
  user: AppUser,
  cancelAtPeriodEnd = true
) {
  const livemode = isRazorpayLivemode();
  const subscription = await getPrisma().subscription.findFirst({
    where: {
      userId: user.id,
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      status: { in: BLOCKING_SUBSCRIPTION_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!subscription) {
    throw new ApiError(404, "subscription_not_found", "No active subscription was found.");
  }

  const cancelled = await getRazorpay().subscriptions.cancel(
    subscription.providerSubscriptionId,
    cancelAtPeriodEnd
  );
  const saved = await syncRazorpaySubscription(cancelled);
  return {
    subscriptionId: saved.id,
    status: saved.status,
    cancelAtPeriodEnd: saved.cancelAtPeriodEnd,
    currentPeriodEnd: saved.currentPeriodEnd?.toISOString() ?? null,
  };
}
