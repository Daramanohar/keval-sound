import "server-only";

import {
  AuditActorType,
  DocumentStatus,
  EntitlementStatus,
  OrderStatus,
  PaymentDisputeStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
  TrackSaleStatus,
} from "@prisma/client";
import type { Disputes } from "razorpay/dist/types/disputes";
import { getPrisma } from "@/lib/db";
import { paymentDisputeStatusForEvent } from "@/server/commerce/dispute-state";
import { ApiError } from "@/server/http/api";
import { isRazorpayLivemode } from "@/server/payments/razorpay";

const PROTECTIVE_STATUSES = new Set<PaymentDisputeStatus>([
  PaymentDisputeStatus.OPEN,
  PaymentDisputeStatus.ACTION_REQUIRED,
  PaymentDisputeStatus.UNDER_REVIEW,
]);

function timestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

async function revokeDisputedOrderAccess(tx: Prisma.TransactionClient, orderId: string) {
  const now = new Date();
  await tx.entitlement.updateMany({
    where: { orderItem: { orderId }, status: EntitlementStatus.ACTIVE },
    data: {
      status: EntitlementStatus.REVOKED,
      revokedAt: now,
      revokeReason: "payment_dispute",
    },
  });
  await tx.downloadGrant.updateMany({
    where: { entitlement: { orderItem: { orderId } }, revokedAt: null },
    data: { revokedAt: now },
  });
  await tx.license.updateMany({
    where: { orderItem: { orderId } },
    data: { documentStatus: DocumentStatus.REVOKED },
  });
}

async function restoreWonDisputeAccess(tx: Prisma.TransactionClient, orderId: string) {
  await tx.entitlement.updateMany({
    where: {
      orderItem: { orderId },
      status: EntitlementStatus.REVOKED,
      revokeReason: "payment_dispute",
    },
    data: {
      status: EntitlementStatus.ACTIVE,
      revokedAt: null,
      revokeReason: null,
    },
  });
  await tx.license.updateMany({
    where: { orderItem: { orderId }, documentStatus: DocumentStatus.REVOKED },
    data: { documentStatus: DocumentStatus.PENDING },
  });
}

export async function syncRazorpayDispute(
  eventType: string,
  providerDispute: Disputes.RazorpayDispute
) {
  const prisma = getPrisma();
  const livemode = isRazorpayLivemode();

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${providerDispute.payment_id}))`;

      const payment = await tx.payment.findFirst({
        where: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerPaymentId: providerDispute.payment_id,
        },
        include: {
          order: {
            include: {
              items: { select: { trackId: true } },
              refunds: {
                where: { status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] } },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!payment) {
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.WEBHOOK,
            action: "payment.dispute_unmapped",
            targetType: "razorpay_payment",
            targetId: providerDispute.payment_id,
            metadata: {
              eventType,
              providerDisputeId: providerDispute.id,
            },
          },
        });
        await tx.outboxEvent.create({
          data: {
            topic: "finance.dispute_unmapped",
            aggregateType: "razorpay_payment",
            aggregateId: providerDispute.payment_id,
            payload: {
              eventType,
              providerDisputeId: providerDispute.id,
              providerPaymentId: providerDispute.payment_id,
            },
          },
        });
        return { status: "payment_absent" as const };
      }

      const amountPaise = Number(providerDispute.amount);
      const currency = providerDispute.currency.toUpperCase();
      if (
        !Number.isSafeInteger(amountPaise) ||
        amountPaise <= 0 ||
        amountPaise > payment.amountPaise ||
        currency !== payment.currency
      ) {
        throw new ApiError(
          409,
          "dispute_payment_mismatch",
          "The Razorpay dispute does not match the recorded payment."
        );
      }

      const existing = await tx.paymentDispute.findUnique({
        where: {
          provider_providerLivemode_providerDisputeId: {
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerDisputeId: providerDispute.id,
          },
        },
      });
      if (existing && (existing.paymentId !== payment.id || existing.orderId !== payment.orderId)) {
        throw new ApiError(
          409,
          "dispute_identity_collision",
          "The Razorpay dispute is already linked to another payment."
        );
      }

      let status: PaymentDisputeStatus;
      try {
        status = paymentDisputeStatusForEvent(eventType, existing?.status ?? null);
      } catch {
        throw new ApiError(
          400,
          "dispute_event_unsupported",
          "Unsupported Razorpay dispute event."
        );
      }
      const otherSuccessfulPayments = await tx.payment.count({
        where: {
          orderId: payment.orderId,
          id: { not: payment.id },
          status: PaymentStatus.SUCCEEDED,
        },
      });
      const affectsOrderAccess = existing?.affectsOrderAccess ?? otherSuccessfulPayments === 0;
      const resolved = new Set<PaymentDisputeStatus>([
        PaymentDisputeStatus.WON,
        PaymentDisputeStatus.LOST,
        PaymentDisputeStatus.CLOSED,
      ]).has(status);
      const saved = await tx.paymentDispute.upsert({
        where: {
          provider_providerLivemode_providerDisputeId: {
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerDisputeId: providerDispute.id,
          },
        },
        create: {
          orderId: payment.orderId,
          paymentId: payment.id,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerDisputeId: providerDispute.id,
          status,
          lastEventType: eventType,
          affectsOrderAccess,
          amountPaise,
          currency,
          reasonCode: providerDispute.reason_code || null,
          phase: providerDispute.phase || null,
          respondBy: timestamp(providerDispute.respond_by),
          providerCreatedAt: timestamp(providerDispute.created_at),
          resolvedAt: resolved ? new Date() : null,
        },
        update: {
          status,
          lastEventType: eventType,
          affectsOrderAccess,
          amountPaise,
          currency,
          reasonCode: providerDispute.reason_code || null,
          phase: providerDispute.phase || null,
          respondBy: timestamp(providerDispute.respond_by),
          resolvedAt: resolved ? new Date() : null,
        },
      });

      const stateChanged = existing?.status !== status || existing?.lastEventType !== eventType;
      if (PROTECTIVE_STATUSES.has(status)) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.DISPUTED },
        });
        if (affectsOrderAccess) {
          await revokeDisputedOrderAccess(tx, payment.orderId);
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.DISPUTED },
          });
        }
      } else if (status === PaymentDisputeStatus.WON) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCEEDED },
        });
        if (
          affectsOrderAccess &&
          payment.order.refunds.length === 0 &&
          payment.order.status === OrderStatus.DISPUTED
        ) {
          await restoreWonDisputeAccess(tx, payment.orderId);
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.FULFILLED },
          });
        }
      } else if (status === PaymentDisputeStatus.LOST) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.DISPUTED },
        });
        if (affectsOrderAccess) {
          await revokeDisputedOrderAccess(tx, payment.orderId);
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.DISPUTED },
          });
          const trackIds = payment.order.items.map((item) => item.trackId);
          if (trackIds.length > 0) {
            await tx.track.updateMany({
              where: {
                id: { in: trackIds },
                saleStatus: TrackSaleStatus.SOLD,
                exclusiveOwnerId: payment.order.userId,
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

      if (stateChanged) {
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.WEBHOOK,
            action: eventType,
            targetType: "payment_dispute",
            targetId: saved.id,
            metadata: {
              orderId: payment.orderId,
              paymentId: payment.id,
              providerDisputeId: providerDispute.id,
              status,
              affectsOrderAccess,
              amountPaise,
              currency,
              respondBy: timestamp(providerDispute.respond_by)?.toISOString() ?? null,
            },
          },
        });
        await tx.outboxEvent.create({
          data: {
            topic: `finance.${eventType}`,
            aggregateType: "payment_dispute",
            aggregateId: saved.id,
            payload: {
              disputeId: saved.id,
              orderId: payment.orderId,
              paymentId: payment.id,
              status,
              affectsOrderAccess,
              respondBy: timestamp(providerDispute.respond_by)?.toISOString() ?? null,
            },
          },
        });
      }

      return { status: "recorded" as const, disputeId: saved.id, orderId: payment.orderId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
