import "server-only";

import {
  EntitlementKind,
  EntitlementStatus,
  OrderStatus,
  PaymentProvider,
  SubscriptionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { currentPaymentLivemode } from "@/server/config/env";
import { FREE_DAILY_STREAM_LIMIT } from "@/server/domain/constants";
import { ApiError } from "@/server/http/api";

const HISTORY_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CHECKOUT_PENDING,
  OrderStatus.PAID,
  OrderStatus.FULFILLING,
  OrderStatus.FULFILLED,
  OrderStatus.REFUND_PENDING,
  OrderStatus.PARTIALLY_REFUNDED,
  OrderStatus.REFUNDED,
  OrderStatus.DISPUTED,
];

const VISIBLE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.INCOMPLETE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.PAUSED,
  SubscriptionStatus.UNPAID,
];

function utcDayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getAccountAccessSnapshot(userId: string) {
  const prisma = getPrisma();
  const now = new Date();
  const day = utcDayBounds(now);
  const mode = currentPaymentLivemode();

  const [subscription, entitlements, freeStreamsUsed] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId,
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: mode,
        status: { in: VISIBLE_SUBSCRIPTION_STATUSES },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        plan: {
          select: {
            code: true,
            name: true,
            description: true,
            amountPaise: true,
            currency: true,
            interval: true,
            features: true,
          },
        },
      },
    }),
    prisma.entitlement.findMany({
      where: {
        userId,
        status: EntitlementStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        subscription: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: mode,
        },
      },
      select: { kind: true, endsAt: true },
    }),
    prisma.streamSession.count({
      where: {
        userId,
        accessMode: "FREE_DAILY",
        reservedAt: { gte: day.start, lt: day.end },
        status: { notIn: ["EXPIRED", "FAILED"] },
      },
    }),
  ]);

  const entitlementKinds = new Set(entitlements.map((entry) => entry.kind));
  const unlimitedStreaming = entitlementKinds.has(EntitlementKind.RADIO_STREAM);
  const losslessStreaming = entitlementKinds.has(EntitlementKind.LOSSLESS_STREAM);

  return {
    environment: mode ? "live" : "test",
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          plan: {
            ...subscription.plan,
            features: Array.isArray(subscription.plan.features)
              ? subscription.plan.features.filter(
                  (feature): feature is string => typeof feature === "string"
                )
              : [],
          },
        }
      : null,
    entitlements: entitlements.map((entry) => ({
      kind: entry.kind,
      endsAt: entry.endsAt?.toISOString() ?? null,
    })),
    streaming: {
      unlimited: unlimitedStreaming,
      lossless: losslessStreaming,
      dailyLimit: FREE_DAILY_STREAM_LIMIT,
      usedToday: Math.min(freeStreamsUsed, FREE_DAILY_STREAM_LIMIT),
      remainingToday: unlimitedStreaming
        ? null
        : Math.max(0, FREE_DAILY_STREAM_LIMIT - freeStreamsUsed),
      resetsAt: day.end.toISOString(),
    },
  };
}

export async function listAccountOrders(userId: string, input: { cursor?: string; limit: number }) {
  const prisma = getPrisma();
  if (input.cursor) {
    const cursorOwner = await prisma.order.findFirst({
      where: {
        id: input.cursor,
        userId,
        paymentProvider: PaymentProvider.RAZORPAY,
        providerLivemode: currentPaymentLivemode(),
      },
      select: { id: true },
    });
    if (!cursorOwner) {
      throw new ApiError(400, "order_cursor_invalid", "The purchase history cursor is invalid.");
    }
  }

  const rows = await prisma.order.findMany({
    where: {
      userId,
      status: { in: HISTORY_ORDER_STATUSES },
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: currentPaymentLivemode(),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotalPaise: true,
      taxPaise: true,
      totalPaise: true,
      hostedInvoiceUrl: true,
      invoicePdfUrl: true,
      paidAt: true,
      fulfilledAt: true,
      refundedAt: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          trackId: true,
          titleSnapshot: true,
          packTitleSnapshot: true,
          categorySnapshot: true,
          unitAmountPaise: true,
          taxPaise: true,
          totalPaise: true,
          currency: true,
          track: {
            select: {
              saleStatus: true,
              pack: { select: { coverUrl: true } },
            },
          },
          license: {
            select: {
              licenseNumber: true,
              documentStatus: true,
              issuedAt: true,
            },
          },
        },
      },
      documents: {
        select: { type: true, status: true, providerUrl: true, generatedAt: true },
      },
    },
  });

  const hasMore = rows.length > input.limit;
  const orders = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    orders: orders.map((order) => ({
      ...order,
      paidAt: order.paidAt?.toISOString() ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
      refundedAt: order.refundedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        trackId: item.trackId,
        titleSnapshot: item.titleSnapshot,
        packTitleSnapshot: item.packTitleSnapshot,
        categorySnapshot: item.categorySnapshot,
        unitAmountPaise: item.unitAmountPaise,
        taxPaise: item.taxPaise,
        totalPaise: item.totalPaise,
        currency: item.currency,
        coverUrl: item.track.pack.coverUrl,
        saleStatus: item.track.saleStatus,
        license: item.license
          ? {
              ...item.license,
              issuedAt: item.license.issuedAt?.toISOString() ?? null,
            }
          : null,
      })),
      documents: order.documents.map((document) => ({
        ...document,
        generatedAt: document.generatedAt?.toISOString() ?? null,
      })),
    })),
    nextCursor: hasMore ? orders.at(-1)?.id ?? null : null,
  };
}

export async function listAccountDownloads(userId: string) {
  const rows = await getPrisma().orderItem.findMany({
    where: {
      order: {
        userId,
        status: OrderStatus.FULFILLED,
        paymentProvider: PaymentProvider.RAZORPAY,
        providerLivemode: currentPaymentLivemode(),
      },
      entitlements: {
        some: {
          userId,
          status: EntitlementStatus.ACTIVE,
          kind: { in: [EntitlementKind.MP3_DOWNLOAD, EntitlementKind.WAV_DOWNLOAD] },
        },
      },
    },
    orderBy: { order: { fulfilledAt: "desc" } },
    select: {
      id: true,
      trackId: true,
      titleSnapshot: true,
      packTitleSnapshot: true,
      categorySnapshot: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          fulfilledAt: true,
          hostedInvoiceUrl: true,
          invoicePdfUrl: true,
        },
      },
      track: { select: { hasMp3: true, hasWav: true, pack: { select: { coverUrl: true } } } },
      entitlements: {
        where: { userId, status: EntitlementStatus.ACTIVE },
        select: { id: true, kind: true },
      },
      license: {
        select: {
          licenseNumber: true,
          documentStatus: true,
          issuedAt: true,
        },
      },
    },
  });

  return rows.map((item) => {
    const entitlementKinds = new Set(item.entitlements.map((entry) => entry.kind));
    return {
      orderItemId: item.id,
      trackId: item.trackId,
      title: item.titleSnapshot,
      packTitle: item.packTitleSnapshot,
      category: item.categorySnapshot,
      coverUrl: item.track.pack.coverUrl,
      order: {
        ...item.order,
        fulfilledAt: item.order.fulfilledAt?.toISOString() ?? null,
      },
      assets: {
        mp3: item.track.hasMp3 && entitlementKinds.has(EntitlementKind.MP3_DOWNLOAD),
        wav: item.track.hasWav && entitlementKinds.has(EntitlementKind.WAV_DOWNLOAD),
        licensePdf: Boolean(item.license && entitlementKinds.has(EntitlementKind.TRACK_LICENSE)),
        invoice: true,
      },
      license: item.license
        ? {
            ...item.license,
            issuedAt: item.license.issuedAt?.toISOString() ?? null,
          }
        : null,
    };
  });
}
