import "server-only";

import {
  AuditActorType,
  DocumentStatus,
  EntitlementStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
  TrackSaleStatus,
} from "@prisma/client";
import type { Refunds } from "razorpay/dist/types/refunds";
import { getPrisma } from "@/lib/db";
import type { AppUser } from "@/server/auth/current-user";
import { ApiError } from "@/server/http/api";
import {
  createRazorpayRefund,
  getRazorpay,
  isRazorpayLivemode,
} from "@/server/payments/razorpay";
import { hashIdempotencyKey } from "@/server/security/idempotency";

type RazorpayRefund = Refunds.RazorpayRefund & {
  failure_reason?: string | null;
};

function refundNote(refund: RazorpayRefund, key: string) {
  const value = refund.notes?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

async function revokeOrderAccess(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: string
) {
  const now = new Date();
  await tx.entitlement.updateMany({
    where: { orderItem: { orderId }, status: EntitlementStatus.ACTIVE },
    data: {
      status: EntitlementStatus.REVOKED,
      revokedAt: now,
      revokeReason: reason,
    },
  });
  await tx.downloadGrant.updateMany({
    where: { entitlement: { orderItem: { orderId } }, revokedAt: null },
    data: { revokedAt: now },
  });
}

async function restoreOrderAccess(tx: Prisma.TransactionClient, orderId: string) {
  await tx.entitlement.updateMany({
    where: {
      orderItem: { orderId },
      status: EntitlementStatus.REVOKED,
      revokeReason: { in: ["refund_pending", "refund_processed", "partial_refund_review"] },
    },
    data: {
      status: EntitlementStatus.ACTIVE,
      revokedAt: null,
      revokeReason: null,
    },
  });
}

export async function syncRazorpayRefund(providerRefund: RazorpayRefund) {
  const livemode = isRazorpayLivemode();
  const metadataRefundId = refundNote(providerRefund, "keval_refund_id");

  return getPrisma().$transaction(
    async (tx) => {
      let refund = await tx.refund.findFirst({
        where: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          OR: [
            { providerRefundId: providerRefund.id },
            ...(metadataRefundId ? [{ id: metadataRefundId }] : []),
          ],
        },
        include: {
          payment: true,
          order: { include: { items: { select: { trackId: true } } } },
        },
      });
      if (!refund) {
        const payment = await tx.payment.findFirst({
          where: {
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerPaymentId: providerRefund.payment_id,
          },
          include: {
            order: { include: { items: { select: { trackId: true } } } },
          },
        });
        if (!payment) {
          throw new ApiError(
            404,
            "refund_payment_not_found",
            "The Razorpay refund payment is not mapped to a Keval order."
          );
        }
        const otherSuccessfulPayments = await tx.payment.count({
          where: {
            orderId: payment.orderId,
            id: { not: payment.id },
            status: PaymentStatus.SUCCEEDED,
          },
        });
        const created = await tx.refund.create({
          data: {
            orderId: payment.orderId,
            paymentId: payment.id,
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerRefundId: providerRefund.id,
            idempotencyKey: hashIdempotencyKey(
              "razorpay",
              "provider_refund",
              providerRefund.id
            ),
            status: RefundStatus.PENDING,
            amountPaise: Number(providerRefund.amount),
            currency: providerRefund.currency.toUpperCase(),
            reason: "provider_initiated_refund",
            affectsOrderAccess: otherSuccessfulPayments === 0,
          },
        });
        refund = await tx.refund.findUnique({
          where: { id: created.id },
          include: {
            payment: true,
            order: { include: { items: { select: { trackId: true } } } },
          },
        });
        if (!refund) throw new Error("Provider refund record disappeared after creation.");
      }
      if (
        !refund.payment.providerPaymentId ||
        refund.payment.providerPaymentId !== providerRefund.payment_id ||
        refund.amountPaise !== Number(providerRefund.amount) ||
        refund.currency !== providerRefund.currency.toUpperCase()
      ) {
        throw new ApiError(409, "refund_mismatch", "The Razorpay refund does not match the Keval payment.");
      }

      if (providerRefund.status === "pending") {
        if (refund.affectsOrderAccess) {
          await revokeOrderAccess(tx, refund.orderId, "refund_pending");
          await tx.order.update({
            where: { id: refund.orderId },
            data: { status: OrderStatus.REFUND_PENDING },
          });
        }
        return tx.refund.update({
          where: { id: refund.id },
          data: {
            providerRefundId: providerRefund.id,
            status: RefundStatus.PENDING,
            failureReason: null,
          },
        });
      }

      if (providerRefund.status === "failed") {
        if (refund.affectsOrderAccess) {
          await restoreOrderAccess(tx, refund.orderId);
          await tx.order.update({
            where: { id: refund.orderId },
            data: { status: OrderStatus.FULFILLED },
          });
        }
        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: PaymentStatus.SUCCEEDED },
        });
        return tx.refund.update({
          where: { id: refund.id },
          data: {
            providerRefundId: providerRefund.id,
            status: RefundStatus.FAILED,
            failureReason: providerRefund.failure_reason || "Razorpay reported that the refund failed.",
            completedAt: new Date(),
          },
        });
      }

      const wasCompleted = refund.status === RefundStatus.SUCCEEDED;
      const otherSucceededRefunds = await tx.refund.aggregate({
        where: {
          paymentId: refund.paymentId,
          id: { not: refund.id },
          status: RefundStatus.SUCCEEDED,
        },
        _sum: { amountPaise: true },
      });
      const cumulativeRefundPaise =
        (otherSucceededRefunds._sum.amountPaise ?? 0) + refund.amountPaise;
      const fullyRefunded = cumulativeRefundPaise >= refund.payment.amountPaise;

      if (refund.affectsOrderAccess) {
        await revokeOrderAccess(
          tx,
          refund.orderId,
          fullyRefunded ? "refund_processed" : "partial_refund_review"
        );
        await tx.license.updateMany({
          where: { orderItem: { orderId: refund.orderId } },
          data: { documentStatus: DocumentStatus.REVOKED },
        });
        if (fullyRefunded) {
          const trackIds = refund.order.items.map((item) => item.trackId);
          if (trackIds.length > 0) {
            await tx.track.updateMany({
              where: {
                id: { in: trackIds },
                saleStatus: TrackSaleStatus.SOLD,
                exclusiveOwnerId: refund.order.userId,
              },
              data: {
                saleStatus: TrackSaleStatus.AVAILABLE,
                exclusiveOwnerId: null,
                soldAt: null,
                version: { increment: 1 },
              },
            });
          }
        }
      }
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: {
          status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
      });
      if (refund.affectsOrderAccess) {
        await tx.order.update({
          where: { id: refund.orderId },
          data: fullyRefunded
            ? { status: OrderStatus.REFUNDED, refundedAt: new Date() }
            : { status: OrderStatus.PARTIALLY_REFUNDED },
        });
      }
      const saved = await tx.refund.update({
        where: { id: refund.id },
        data: {
          providerRefundId: providerRefund.id,
          status: RefundStatus.SUCCEEDED,
          failureReason: null,
          completedAt: new Date(),
        },
      });
      if (!wasCompleted) {
        await tx.outboxEvent.create({
          data: {
            topic: "order.refund_confirmation_email",
            aggregateType: "order",
            aggregateId: refund.orderId,
            payload: { orderId: refund.orderId, refundId: refund.id },
          },
        });
        if (!fullyRefunded && refund.affectsOrderAccess) {
          await tx.outboxEvent.create({
            data: {
              topic: "finance.partial_refund_review",
              aggregateType: "order",
              aggregateId: refund.orderId,
              payload: {
                orderId: refund.orderId,
                refundId: refund.id,
                cumulativeRefundPaise,
                paymentAmountPaise: refund.payment.amountPaise,
              },
            },
          });
        }
      }
      return saved;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function submitPreparedRefund(
  prepared: Prisma.RefundGetPayload<{ include: { order: true; payment: true } }>,
  fallbackReason: string
) {
  if (!prepared.payment.providerPaymentId) {
    throw new ApiError(409, "payment_not_refundable", "The Razorpay payment identifier is missing.");
  }

  const providerRefund = prepared.providerRefundId
    ? ((await getRazorpay().payments.fetchRefund(
        prepared.payment.providerPaymentId,
        prepared.providerRefundId
      )) as RazorpayRefund)
    : await createRazorpayRefund({
        providerPaymentId: prepared.payment.providerPaymentId,
        refundId: prepared.id,
        orderId: prepared.orderId,
        orderNumber: prepared.order.orderNumber,
        amountPaise: prepared.amountPaise,
        reason: prepared.reason ?? fallbackReason,
      });

  return syncRazorpayRefund(providerRefund);
}

export async function requestSystemPaymentRefund(input: {
  orderId: string;
  paymentId: string;
  reason:
    | "inventory_conflict"
    | "duplicate_captured_payment"
    | "late_captured_payment";
  affectsOrderAccess: boolean;
}) {
  const prisma = getPrisma();
  const livemode = isRazorpayLivemode();
  const idempotencyKey = hashIdempotencyKey(
    "system",
    input.reason,
    `${input.orderId}:${input.paymentId}`
  );

  const prepared = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.orderId}))`;
      const previous = await tx.refund.findUnique({
        where: { idempotencyKey },
        include: { order: true, payment: true },
      });
      if (previous) return previous;

      const payment = await tx.payment.findFirst({
        where: {
          id: input.paymentId,
          orderId: input.orderId,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          status: PaymentStatus.SUCCEEDED,
        },
        include: { order: true },
      });
      if (!payment?.providerPaymentId) {
        throw new ApiError(
          409,
          "payment_not_refundable",
          "The captured Razorpay payment is unavailable for automatic refund."
        );
      }

      const refund = await tx.refund.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          idempotencyKey,
          status: RefundStatus.PENDING,
          amountPaise: payment.amountPaise,
          currency: payment.currency,
          reason: input.reason,
          affectsOrderAccess: input.affectsOrderAccess,
        },
        include: { order: true, payment: true },
      });

      if (input.affectsOrderAccess) {
        await revokeOrderAccess(tx, payment.orderId, "refund_pending");
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.REFUND_PENDING },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.SYSTEM,
          action: `payment.${input.reason}_refund_requested`,
          targetType: "payment",
          targetId: payment.id,
          metadata: {
            orderId: payment.orderId,
            refundId: refund.id,
            affectsOrderAccess: input.affectsOrderAccess,
          },
        },
      });
      return refund;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  const saved = await submitPreparedRefund(prepared, input.reason);
  return {
    refundId: saved.id,
    providerRefundId: saved.providerRefundId,
    status: saved.status,
  };
}

export async function requestFullOrderRefund(input: {
  actor: AppUser;
  orderId: string;
  reason: string;
  rawIdempotencyKey: string;
}) {
  const prisma = getPrisma();
  const livemode = isRazorpayLivemode();
  const idempotencyKey = hashIdempotencyKey(
    input.actor.id,
    `order_refund:${input.orderId}`,
    input.rawIdempotencyKey
  );

  const prepared = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.orderId}))`;
      const previous = await tx.refund.findUnique({
        where: { idempotencyKey },
        include: { order: true, payment: true },
      });
      if (previous) return previous;

      const order = await tx.order.findFirst({
        where: {
          id: input.orderId,
          paymentProvider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
        },
        include: {
          payments: {
            where: { status: PaymentStatus.SUCCEEDED },
            orderBy: { succeededAt: "desc" },
          },
          refunds: {
            where: { status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] } },
          },
        },
      });
      if (!order) throw new ApiError(404, "order_not_found", "The order was not found.");
      if (order.status !== OrderStatus.FULFILLED) {
        throw new ApiError(409, "order_not_refundable", "Only fulfilled orders can be refunded.");
      }
      if (order.refunds.length > 0) {
        throw new ApiError(409, "refund_already_exists", "This order already has a pending or completed refund.");
      }
      const payment = order.payments[0];
      if (!payment?.providerPaymentId) {
        throw new ApiError(409, "payment_not_refundable", "No captured Razorpay payment is attached to this order.");
      }

      const refund = await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          idempotencyKey,
          status: RefundStatus.PENDING,
          amountPaise: order.totalPaise,
          currency: order.currency,
          reason: input.reason,
        },
      });
      await revokeOrderAccess(tx, order.id, "refund_pending");
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REFUND_PENDING },
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          actorUserId: input.actor.id,
          action: "order.refund_requested",
          targetType: "order",
          targetId: order.id,
          metadata: { refundId: refund.id, reason: input.reason },
        },
      });
      return { ...refund, order, payment };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  const saved = await submitPreparedRefund(prepared, input.reason);
  return {
    refundId: saved.id,
    providerRefundId: saved.providerRefundId,
    status: saved.status,
    amountPaise: saved.amountPaise,
    currency: saved.currency,
  };
}
