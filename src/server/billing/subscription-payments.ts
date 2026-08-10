import "server-only";

import { PaymentProvider, PaymentStatus } from "@prisma/client";
import type { Payments } from "razorpay/dist/types/payments";
import { getPrisma } from "@/lib/db";
import { calculateStoredTax, type TaxPricingMode } from "@/server/commerce/tax";
import { allocateInvoiceNumber } from "@/server/documents/invoice-number";
import { ApiError } from "@/server/http/api";
import { isRazorpayLivemode } from "@/server/payments/razorpay";

function timestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : new Date();
}

export async function recordRazorpaySubscriptionPayment(
  providerSubscriptionId: string,
  payment: Payments.RazorpayPayment
) {
  const livemode = isRazorpayLivemode();
  if (payment.status !== "captured" || !payment.captured) {
    throw new ApiError(
      409,
      "subscription_payment_not_captured",
      "Subscription access is waiting for a captured Razorpay payment."
    );
  }

  const prisma = getPrisma();
  const subscription = await prisma.subscription.findUnique({
    where: {
      provider_providerLivemode_providerSubscriptionId: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerSubscriptionId,
      },
    },
    include: { plan: { select: { amountPaise: true, currency: true } } },
  });
  if (!subscription) {
    throw new ApiError(
      404,
      "subscription_not_found",
      "The Razorpay subscription is not mapped to a KEVAL subscription."
    );
  }

  const chargedAmount = Number(payment.amount);
  const storedTax = calculateStoredTax(
    subscription.plan.amountPaise,
    subscription.taxRateBps,
    subscription.taxMode as TaxPricingMode | "none"
  );
  const expectedAmount = storedTax.totalPaise;
  if (
    !Number.isInteger(chargedAmount) ||
    chargedAmount !== expectedAmount ||
    payment.currency.toUpperCase() !== subscription.plan.currency.toUpperCase()
  ) {
    throw new ApiError(
      409,
      "subscription_amount_mismatch",
      "The captured subscription amount does not match the configured KEVAL plan."
    );
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.subscriptionPayment.findUnique({
      where: {
        provider_providerLivemode_providerPaymentId: {
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          providerPaymentId: payment.id,
        },
      },
    });
    if (previous) return previous;

    const paidAt = timestamp(payment.created_at);
    const invoiceNumber = await allocateInvoiceNumber(tx, paidAt, livemode);
    const saved = await tx.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        provider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerPaymentId: payment.id,
        providerInvoiceId: payment.invoice_id ? String(payment.invoice_id) : null,
        invoiceNumber,
        amountPaise: chargedAmount,
        taxableAmountPaise: storedTax.taxablePaise,
        taxPaise: storedTax.taxPaise,
        currency: payment.currency.toUpperCase(),
        status: PaymentStatus.SUCCEEDED,
        paidAt,
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: "subscription.payment_receipt_email",
        aggregateType: "subscription_payment",
        aggregateId: saved.id,
        payload: {
          subscriptionPaymentId: saved.id,
          subscriptionId: subscription.id,
          userId: subscription.userId,
        },
      },
    });
    return saved;
  });
}
