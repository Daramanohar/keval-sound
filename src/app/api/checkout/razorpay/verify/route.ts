import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAppUser } from "@/server/auth/current-user";
import { fulfillTrackPayment } from "@/server/commerce/fulfillment";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";
import { isRazorpayLivemode, verifyRazorpayPaymentSignature } from "@/server/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  appOrderId: z.string().trim().min(1).max(200),
  razorpay_order_id: z.string().trim().min(1).max(200),
  razorpay_payment_id: z.string().trim().min(1).max(200),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const input = await readJson(request, verifySchema);
  const order = await getPrisma().order.findFirst({
    where: {
      id: input.appOrderId,
      userId: user.id,
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: isRazorpayLivemode(),
    },
    select: { providerOrderId: true },
  });
  if (!order?.providerOrderId || order.providerOrderId !== input.razorpay_order_id) {
    return apiJson({ error: "checkout_order_mismatch", message: "Payment order validation failed." }, 409, requestId);
  }
  if (
    !verifyRazorpayPaymentSignature({
      providerOrderId: order.providerOrderId,
      providerPaymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    })
  ) {
    return apiJson({ error: "razorpay_signature_invalid", message: "Payment signature validation failed." }, 400, requestId);
  }

  const result = await fulfillTrackPayment(order.providerOrderId, input.razorpay_payment_id);
  if (result.status === "paid_inventory_conflict") {
    return apiJson(
      {
        ...result,
        error: "paid_inventory_conflict",
        message:
          "Payment was captured, but the track could not be allocated. An automatic full refund has been started and no license was issued.",
      },
      409,
      requestId
    );
  }
  if (result.status === "duplicate_captured_payment") {
    return apiJson(
      {
        ...result,
        error: "duplicate_captured_payment",
        message:
          "A second payment was detected for an already completed order. The valid purchase remains active and the duplicate payment is being refunded.",
      },
      409,
      requestId
    );
  }
  if (result.status === "late_captured_payment") {
    return apiJson(
      {
        ...result,
        error: "late_captured_payment",
        message:
          "Payment completed after this checkout had closed. An automatic full refund has been started and no license was issued.",
      },
      409,
      requestId
    );
  }
  return apiJson(result, result.status === "payment_pending" ? 202 : 200, requestId);
});
