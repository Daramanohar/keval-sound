import "server-only";

import {
  AuditActorType,
  DocumentStatus,
  EntitlementKind,
  EntitlementStatus,
  OrderDocumentType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TrackSaleStatus,
} from "@prisma/client";
import type { Orders } from "razorpay/dist/types/orders";
import type { Payments } from "razorpay/dist/types/payments";
import { getPrisma } from "@/lib/db";
import { requestSystemPaymentRefund } from "@/server/commerce/refunds";
import { createLicenseNumber } from "@/server/domain/identifiers";
import { allocateInvoiceNumber } from "@/server/documents/invoice-number";
import { ApiError } from "@/server/http/api";
import { getRazorpay, isRazorpayLivemode } from "@/server/payments/razorpay";

type VerifiedRazorpayPayment = {
  order: Orders.RazorpayOrder;
  payment: Payments.RazorpayPayment;
};

function timestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function orderNote(order: Orders.RazorpayOrder, key: string) {
  const value = order.notes?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

async function recordCapturedPayment(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    payments: Array<{
      id: string;
      providerPaymentId: string | null;
      status: PaymentStatus;
    }>;
    payment: Payments.RazorpayPayment;
    livemode: boolean;
  }
) {
  const existingPayment = input.payments.find(
    (candidate) => candidate.providerPaymentId === input.payment.id
  );
  const pendingPayment = input.payments.find(
    (candidate) => !candidate.providerPaymentId && candidate.status === PaymentStatus.PENDING
  );
  const paymentData = {
    provider: PaymentProvider.RAZORPAY,
    providerLivemode: input.livemode,
    providerPaymentId: input.payment.id,
    status: PaymentStatus.SUCCEEDED,
    amountPaise: Number(input.payment.amount),
    currency: input.payment.currency.toUpperCase(),
    providerCreatedAt: timestamp(input.payment.created_at),
    succeededAt: new Date(),
    failureCode: null,
    failureMessage: null,
  };

  if (existingPayment) {
    const saved = await tx.payment.update({
      where: { id: existingPayment.id },
      data: paymentData,
      select: { id: true },
    });
    return saved.id;
  }
  if (pendingPayment) {
    const saved = await tx.payment.update({
      where: { id: pendingPayment.id },
      data: paymentData,
      select: { id: true },
    });
    return saved.id;
  }
  const saved = await tx.payment.create({
    data: { orderId: input.orderId, ...paymentData },
    select: { id: true },
  });
  return saved.id;
}

async function retrieveCapturedPayment(
  providerOrderId: string,
  providerPaymentId?: string
): Promise<VerifiedRazorpayPayment | null> {
  const razorpay = getRazorpay();
  const providerOrder = await razorpay.orders.fetch(providerOrderId);
  if (providerOrder.status !== "paid") return null;

  let payment: Payments.RazorpayPayment | undefined;
  if (providerPaymentId) {
    const fetched = await razorpay.payments.fetch(providerPaymentId);
    payment = fetched as Payments.RazorpayPayment;
  } else {
    const payments = await razorpay.orders.fetchPayments(providerOrderId);
    payment = payments.items.find((candidate) => candidate.status === "captured" && candidate.captured);
  }

  if (!payment || payment.status !== "captured" || !payment.captured) return null;
  if (payment.order_id !== providerOrder.id) {
    throw new ApiError(409, "razorpay_order_mismatch", "The payment is linked to another Razorpay order.");
  }
  return { order: providerOrder, payment };
}

export async function fulfillTrackPayment(providerOrderId: string, providerPaymentId?: string) {
  const verified = await retrieveCapturedPayment(providerOrderId, providerPaymentId);
  if (!verified) return { status: "payment_pending" as const };

  const livemode = isRazorpayLivemode();
  const { order: providerOrder, payment } = verified;
  const metadataOrderId = orderNote(providerOrder, "keval_order_id");
  if (orderNote(providerOrder, "keval_flow") !== "track_purchase" || !metadataOrderId) {
    throw new ApiError(400, "invalid_checkout_flow", "This Razorpay order is not a Keval track purchase.");
  }

  const result = await getPrisma().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${metadataOrderId}))`;
      const lockScope = await tx.order.findUnique({
        where: { id: metadataOrderId },
        select: { items: { select: { trackId: true } } },
      });
      if (!lockScope) throw new ApiError(404, "order_not_found", "The paid order was not found.");
      const trackIds = lockScope.items.map((item) => item.trackId).sort();
      if (trackIds.length > 0) {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "tracks" WHERE "id" IN (${Prisma.join(
            trackIds
          )}) ORDER BY "id" FOR UPDATE`
        );
      }

      const order = await tx.order.findUnique({
        where: { id: metadataOrderId },
        include: {
          items: { include: { track: true }, orderBy: { createdAt: "asc" } },
          inventoryReservations: true,
          payments: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!order) throw new ApiError(404, "order_not_found", "The paid order was not found.");
      if (order.paymentProvider !== PaymentProvider.RAZORPAY || order.providerLivemode !== livemode) {
        throw new ApiError(409, "payment_provider_mismatch", "The payment environment does not match this order.");
      }
      if (order.providerOrderId && order.providerOrderId !== providerOrder.id) {
        throw new ApiError(409, "provider_order_mismatch", "The order is linked to another Razorpay order.");
      }
      if (order.userId !== orderNote(providerOrder, "app_user_id")) {
        throw new ApiError(409, "checkout_owner_mismatch", "Checkout ownership validation failed.");
      }
      if (
        order.currency !== providerOrder.currency.toUpperCase() ||
        order.currency !== payment.currency.toUpperCase() ||
        order.totalPaise !== Number(providerOrder.amount) ||
        order.totalPaise !== Number(payment.amount) ||
        Number(providerOrder.amount_paid) !== order.totalPaise ||
        Number(providerOrder.amount_due) !== 0
      ) {
        throw new ApiError(409, "checkout_total_mismatch", "The captured amount does not match the order.");
      }

      const existingPayment = order.payments.find(
        (candidate) => candidate.providerPaymentId === payment.id
      );
      if (order.status === OrderStatus.FULFILLED) {
        if (existingPayment?.status === PaymentStatus.SUCCEEDED) {
          return { status: "already_fulfilled" as const, orderId: order.id };
        }

        const duplicatePaymentId = await recordCapturedPayment(tx, {
          orderId: order.id,
          payments: order.payments,
          payment,
          livemode,
        });
        await tx.outboxEvent.create({
          data: {
            topic: "payment.duplicate_captured",
            aggregateType: "payment",
            aggregateId: duplicatePaymentId,
            payload: {
              orderId: order.id,
              paymentId: duplicatePaymentId,
              providerPaymentId: payment.id,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.WEBHOOK,
            action: "payment.duplicate_captured",
            targetType: "payment",
            targetId: duplicatePaymentId,
            metadata: {
              orderId: order.id,
              providerOrderId,
              providerPaymentId: payment.id,
            },
          },
        });
        return {
          status: "duplicate_captured_payment" as const,
          orderId: order.id,
          paymentId: duplicatePaymentId,
        };
      }

      if (order.status === OrderStatus.REFUND_PENDING && existingPayment) {
        return { status: "refund_in_progress" as const, orderId: order.id };
      }
      if (
        order.status === OrderStatus.PARTIALLY_REFUNDED &&
        existingPayment?.status === PaymentStatus.PARTIALLY_REFUNDED
      ) {
        return { status: "already_partially_refunded" as const, orderId: order.id };
      }
      if (
        order.status === OrderStatus.REFUNDED &&
        existingPayment?.status === PaymentStatus.REFUNDED
      ) {
        return { status: "already_refunded" as const, orderId: order.id };
      }
      if (
        order.status === OrderStatus.DISPUTED &&
        existingPayment?.status === PaymentStatus.DISPUTED
      ) {
        return { status: "already_disputed" as const, orderId: order.id };
      }

      if (
        new Set<OrderStatus>([
          OrderStatus.CANCELLED,
          OrderStatus.EXPIRED,
          OrderStatus.REFUND_PENDING,
          OrderStatus.PARTIALLY_REFUNDED,
          OrderStatus.REFUNDED,
          OrderStatus.DISPUTED,
        ]).has(order.status)
      ) {
        const latePaymentId = await recordCapturedPayment(tx, {
          orderId: order.id,
          payments: order.payments,
          payment,
          livemode,
        });
        await tx.outboxEvent.create({
          data: {
            topic: "payment.late_captured",
            aggregateType: "payment",
            aggregateId: latePaymentId,
            payload: {
              orderId: order.id,
              paymentId: latePaymentId,
              providerPaymentId: payment.id,
              orderStatus: order.status,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.WEBHOOK,
            action: "payment.late_captured",
            targetType: "payment",
            targetId: latePaymentId,
            metadata: {
              orderId: order.id,
              providerOrderId,
              providerPaymentId: payment.id,
              orderStatus: order.status,
            },
          },
        });
        return {
          status: "late_captured_payment" as const,
          orderId: order.id,
          paymentId: latePaymentId,
        };
      }

      const reservationsByTrack = new Map(
        order.inventoryReservations.map((reservation) => [reservation.trackId, reservation])
      );
      const inventoryConflict = order.items.find((item) => {
        const track = item.track;
        const ownedByBuyer =
          track.saleStatus === TrackSaleStatus.SOLD && track.exclusiveOwnerId === order.userId;
        const reservedForOrder =
          track.saleStatus === TrackSaleStatus.RESERVED &&
          reservationsByTrack.get(track.id)?.orderId === order.id;
        return !ownedByBuyer && !reservedForOrder;
      });

      if (inventoryConflict) {
        const capturedPaymentId = await recordCapturedPayment(tx, {
          orderId: order.id,
          payments: order.payments,
          payment,
          livemode,
        });

        const reservedTrackIds = order.inventoryReservations.map(
          (reservation) => reservation.trackId
        );
        await tx.inventoryReservation.deleteMany({ where: { orderId: order.id } });
        if (reservedTrackIds.length > 0) {
          await tx.track.updateMany({
            where: {
              id: { in: reservedTrackIds },
              saleStatus: TrackSaleStatus.RESERVED,
            },
            data: {
              saleStatus: TrackSaleStatus.AVAILABLE,
              version: { increment: 1 },
            },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DISPUTED,
            paymentProvider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerOrderId: providerOrder.id,
            providerInvoiceId: payment.invoice_id,
            taxPaise: 0,
            totalPaise: Number(payment.amount),
            paidAt: new Date(),
          },
        });
        await tx.outboxEvent.create({
          data: {
            topic: "order.paid_inventory_conflict",
            aggregateType: "order",
            aggregateId: order.id,
            payload: {
              orderId: order.id,
              trackId: inventoryConflict.track.id,
              providerOrderId,
              providerPaymentId: payment.id,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.WEBHOOK,
            action: "order.paid_inventory_conflict",
            targetType: "order",
            targetId: order.id,
            metadata: {
              trackId: inventoryConflict.track.id,
              providerOrderId,
              providerPaymentId: payment.id,
            },
          },
        });
        return {
          status: "paid_inventory_conflict" as const,
          orderId: order.id,
          paymentId: capturedPaymentId,
          trackId: inventoryConflict.track.id,
        };
      }

      for (const item of order.items) {
        const track = item.track;
        const ownedByBuyer =
          track.saleStatus === TrackSaleStatus.SOLD && track.exclusiveOwnerId === order.userId;

        if (!ownedByBuyer) {
          await tx.track.update({
            where: { id: track.id },
            data: {
              saleStatus: TrackSaleStatus.SOLD,
              exclusiveOwnerId: order.userId,
              soldAt: new Date(),
              version: { increment: 1 },
            },
          });
        }

        for (const kind of [
          EntitlementKind.TRACK_LICENSE,
          EntitlementKind.MP3_DOWNLOAD,
          EntitlementKind.WAV_DOWNLOAD,
        ]) {
          await tx.entitlement.upsert({
            where: { orderItemId_kind: { orderItemId: item.id, kind } },
            create: {
              userId: order.userId,
              trackId: track.id,
              orderItemId: item.id,
              kind,
              status: EntitlementStatus.ACTIVE,
            },
            update: {
              status: EntitlementStatus.ACTIVE,
              revokedAt: null,
              revokeReason: null,
            },
          });
        }

        await tx.license.upsert({
          where: { orderItemId: item.id },
          create: {
            userId: order.userId,
            orderItemId: item.id,
            trackId: track.id,
            licenseNumber: createLicenseNumber(
              order.customerNameSnapshot ?? order.kevalUserIdSnapshot
            ),
            termsVersion: item.licenseTermsVersion,
            licenseeNameSnapshot: order.customerNameSnapshot ?? order.kevalUserIdSnapshot,
            licenseeEmailSnapshot: order.customerEmailSnapshot,
            kevalUserIdSnapshot: order.kevalUserIdSnapshot,
            trackTitleSnapshot: item.titleSnapshot,
            documentStatus: DocumentStatus.PENDING,
          },
          update: {},
        });
      }

      await recordCapturedPayment(tx, {
        orderId: order.id,
        payments: order.payments,
        payment,
        livemode,
      });

      const existingInvoice = await tx.orderDocument.findUnique({
        where: { orderId_type: { orderId: order.id, type: OrderDocumentType.INVOICE } },
        select: { invoiceNumber: true },
      });
      const invoiceNumber =
        existingInvoice?.invoiceNumber ??
        (await allocateInvoiceNumber(
          tx,
          timestamp(payment.created_at) ?? new Date(),
          livemode
        ));
      await tx.orderDocument.upsert({
        where: { orderId_type: { orderId: order.id, type: OrderDocumentType.INVOICE } },
        create: {
          orderId: order.id,
          type: OrderDocumentType.INVOICE,
          invoiceNumber,
          status: DocumentStatus.PENDING,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
        },
        update: {
          invoiceNumber,
          status: DocumentStatus.PENDING,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          errorMessage: null,
        },
      });

      await tx.inventoryReservation.deleteMany({ where: { orderId: order.id } });
      const cart = await tx.cart.findUnique({ where: { userId: order.userId }, select: { id: true } });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, trackId: { in: order.items.map((item) => item.trackId) } },
        });
      }

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.FULFILLED,
          paymentProvider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerOrderId: providerOrder.id,
          providerInvoiceId: payment.invoice_id,
          taxPaise: 0,
          totalPaise: Number(payment.amount),
          paidAt: now,
          fulfilledAt: now,
        },
      });

      await tx.outboxEvent.createMany({
        data: [
          {
            topic: "license.generate",
            aggregateType: "order",
            aggregateId: order.id,
            payload: { orderId: order.id },
          },
          {
            topic: "invoice.generate",
            aggregateType: "order",
            aggregateId: order.id,
            payload: { orderId: order.id },
          },
          {
            topic: "order.confirmation_email",
            aggregateType: "order",
            aggregateId: order.id,
            payload: { orderId: order.id },
          },
        ],
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.WEBHOOK,
          action: "order.fulfilled",
          targetType: "order",
          targetId: order.id,
          metadata: {
            provider: "razorpay",
            providerOrderId: providerOrder.id,
            providerPaymentId: payment.id,
            amountTotal: Number(payment.amount),
            currency: payment.currency,
          },
        },
      });

      return { status: "fulfilled" as const, orderId: order.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (result.status === "paid_inventory_conflict") {
    const refund = await requestSystemPaymentRefund({
      orderId: result.orderId,
      paymentId: result.paymentId,
      reason: "inventory_conflict",
      affectsOrderAccess: true,
    });
    return { ...result, refund };
  }
  if (result.status === "duplicate_captured_payment") {
    const refund = await requestSystemPaymentRefund({
      orderId: result.orderId,
      paymentId: result.paymentId,
      reason: "duplicate_captured_payment",
      affectsOrderAccess: false,
    });
    return { ...result, refund };
  }
  if (result.status === "late_captured_payment") {
    const refund = await requestSystemPaymentRefund({
      orderId: result.orderId,
      paymentId: result.paymentId,
      reason: "late_captured_payment",
      affectsOrderAccess: false,
    });
    return { ...result, refund };
  }
  return result;
}

export async function recordTrackPaymentAuthorization(payment: Payments.RazorpayPayment) {
  if (!payment.order_id) return { status: "order_absent" as const };

  const fetched = (await getRazorpay().payments.fetch(payment.id)) as Payments.RazorpayPayment;
  if (fetched.status === "captured" && fetched.captured) {
    return fulfillTrackPayment(fetched.order_id, fetched.id);
  }
  if (fetched.status === "failed") {
    return recordTrackPaymentFailure(fetched);
  }
  if (fetched.status !== "authorized") {
    return { status: "authorization_no_longer_pending" as const };
  }

  const livemode = isRazorpayLivemode();
  const order = await getPrisma().order.findFirst({
    where: {
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      providerOrderId: fetched.order_id,
    },
    select: { id: true, totalPaise: true, currency: true, status: true },
  });
  if (!order) return { status: "order_absent" as const };
  if (
    Number(fetched.amount) !== order.totalPaise ||
    fetched.currency.toUpperCase() !== order.currency
  ) {
    throw new ApiError(
      409,
      "authorized_payment_mismatch",
      "The authorized Razorpay payment does not match the Keval order."
    );
  }

  const saved = await getPrisma().$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: {
        provider_providerLivemode_providerPaymentId: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerPaymentId: fetched.id,
        },
      },
    });
    const pending = existing
      ? null
      : await tx.payment.findFirst({
          where: {
            orderId: order.id,
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerPaymentId: null,
            status: PaymentStatus.PENDING,
          },
          orderBy: { createdAt: "asc" },
        });
    const data = {
      providerPaymentId: fetched.id,
      status: PaymentStatus.PROCESSING,
      amountPaise: Number(fetched.amount),
      currency: fetched.currency.toUpperCase(),
      providerCreatedAt: timestamp(fetched.created_at),
      failureCode: null,
      failureMessage: null,
    };
    const recorded = existing
      ? await tx.payment.update({ where: { id: existing.id }, data })
      : pending
        ? await tx.payment.update({ where: { id: pending.id }, data })
        : await tx.payment.create({
            data: {
              orderId: order.id,
              provider: PaymentProvider.RAZORPAY,
              providerLivemode: livemode,
              ...data,
            },
          });
    if (existing?.status !== PaymentStatus.PROCESSING) {
      await tx.outboxEvent.create({
        data: {
          topic: "payment.authorized_pending_capture",
          aggregateType: "payment",
          aggregateId: recorded.id,
          payload: {
            orderId: order.id,
            paymentId: recorded.id,
            providerPaymentId: fetched.id,
            orderStatus: order.status,
          },
        },
      });
    }
    return recorded;
  });
  return {
    status: "authorized_pending_capture" as const,
    orderId: order.id,
    paymentId: saved.id,
  };
}

export async function recordTrackPaymentFailure(payment: Payments.RazorpayPayment) {
  if (!payment.order_id) return { status: "order_absent" as const };
  const livemode = isRazorpayLivemode();
  const order = await getPrisma().order.findFirst({
    where: {
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      providerOrderId: payment.order_id,
    },
    select: { id: true, status: true },
  });
  if (!order) return { status: "order_absent" as const };

  return getPrisma().$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: {
        provider_providerLivemode_providerPaymentId: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerPaymentId: payment.id,
        },
      },
    });
    if (
      existing &&
      new Set<PaymentStatus>([
        PaymentStatus.SUCCEEDED,
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUNDED,
        PaymentStatus.DISPUTED,
      ]).has(existing.status)
    ) {
      return { status: "terminal_payment_unchanged" as const, orderId: order.id };
    }
    const pending = existing
      ? null
      : await tx.payment.findFirst({
          where: {
            orderId: order.id,
            provider: PaymentProvider.RAZORPAY,
            providerLivemode: livemode,
            providerPaymentId: null,
            status: PaymentStatus.PENDING,
          },
          orderBy: { createdAt: "asc" },
        });
    const data = {
      providerPaymentId: payment.id,
      status: PaymentStatus.FAILED,
      amountPaise: Number(payment.amount),
      currency: payment.currency.toUpperCase(),
      failureCode: payment.error_code,
      failureMessage: payment.error_description,
      providerCreatedAt: timestamp(payment.created_at),
    };
    const saved = existing
      ? await tx.payment.update({ where: { id: existing.id }, data })
      : pending
        ? await tx.payment.update({ where: { id: pending.id }, data })
        : await tx.payment.create({
            data: {
              orderId: order.id,
              provider: PaymentProvider.RAZORPAY,
              providerLivemode: livemode,
              ...data,
            },
          });
    return { status: "recorded" as const, orderId: order.id, paymentId: saved.id };
  });
}

export async function releaseTrackCheckout(
  providerOrderId: string,
  nextStatus: Extract<OrderStatus, "EXPIRED" | "PAYMENT_FAILED">
) {
  const livemode = isRazorpayLivemode();
  const order = await getPrisma().order.findFirst({
    where: {
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: livemode,
      providerOrderId,
    },
    select: { id: true },
  });
  if (!order) return { status: "order_absent" as const };

  return getPrisma().$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: { inventoryReservations: true },
    });
    if (!current) return { status: "order_absent" as const };
    if (
      new Set<OrderStatus>([
        OrderStatus.PAID,
        OrderStatus.FULFILLING,
        OrderStatus.FULFILLED,
      ]).has(current.status)
    ) {
      return { status: "already_paid" as const };
    }

    const trackIds = current.inventoryReservations.map((reservation) => reservation.trackId);
    await tx.inventoryReservation.deleteMany({ where: { orderId: current.id } });
    if (trackIds.length > 0) {
      await tx.track.updateMany({
        where: { id: { in: trackIds }, saleStatus: TrackSaleStatus.RESERVED },
        data: { saleStatus: TrackSaleStatus.AVAILABLE, version: { increment: 1 } },
      });
    }
    await tx.payment.updateMany({
      where: {
        orderId: current.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      data: {
        status:
          nextStatus === OrderStatus.EXPIRED ? PaymentStatus.CANCELLED : PaymentStatus.FAILED,
      },
    });
    await tx.order.update({ where: { id: current.id }, data: { status: nextStatus } });
    return { status: "released" as const, orderId: current.id };
  });
}
