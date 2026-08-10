import "server-only";

import {
  OrderStatus,
  PaymentProvider,
  SubscriptionStatus,
  WebhookStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { currentPaymentLivemode } from "@/server/config/env";

export async function getOperationsOverview() {
  const prisma = getPrisma();
  const livemode = currentPaymentLivemode();
  const [
    userCount,
    orderCount,
    activeSubscriptionCount,
    failedWebhookCount,
    revenue,
    orders,
    users,
    subscriptions,
    failedWebhooks,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.order.count({
      where: {
        paymentProvider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLING, OrderStatus.FULFILLED] },
      },
    }),
    prisma.subscription.count({
      where: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        status: SubscriptionStatus.ACTIVE,
      },
    }),
    prisma.webhookEvent.count({
      where: {
        providerLivemode: livemode,
        status: WebhookStatus.FAILED,
      },
    }),
    prisma.payment.aggregate({
      where: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        status: "SUCCEEDED",
      },
      _sum: { amountPaise: true },
    }),
    prisma.order.findMany({
      where: {
        paymentProvider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPaise: true,
        taxPaise: true,
        currency: true,
        createdAt: true,
        paidAt: true,
        fulfilledAt: true,
        user: { select: { kevalUserId: true, email: true, firstName: true, lastName: true } },
        items: { select: { titleSnapshot: true } },
        refunds: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amountPaise: true } },
      },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        kevalUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findMany({
      where: { provider: PaymentProvider.RAZORPAY, providerLivemode: livemode },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        user: { select: { kevalUserId: true, email: true } },
        plan: { select: { code: true, name: true, amountPaise: true, currency: true } },
      },
    }),
    prisma.webhookEvent.findMany({
      where: { providerLivemode: livemode, status: WebhookStatus.FAILED },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        eventType: true,
        objectId: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    environment: livemode ? "live" : "test",
    generatedAt: new Date().toISOString(),
    summary: {
      users: userCount,
      paidOrders: orderCount,
      activeSubscriptions: activeSubscriptionCount,
      failedWebhooks: failedWebhookCount,
      capturedRevenuePaise: revenue._sum.amountPaise ?? 0,
      currency: "INR",
    },
    orders: orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    })),
    users: users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
    subscriptions: subscriptions.map((subscription) => ({
      ...subscription,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    })),
    failedWebhooks: failedWebhooks.map((event) => ({
      ...event,
      updatedAt: event.updatedAt.toISOString(),
    })),
  };
}
