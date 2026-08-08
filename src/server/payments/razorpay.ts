import "server-only";

import Razorpay from "razorpay";
import type { Refunds } from "razorpay/dist/types/refunds";
import {
  currentPaymentLivemode,
  getRazorpayApiConfig,
  getRazorpayWebhookConfig,
} from "@/server/config/env";
import {
  verifyPaymentSignatureWithSecret,
  verifySubscriptionSignatureWithSecret,
  verifyWebhookSignatureWithSecrets,
} from "@/server/payments/signature-utils";

let razorpayClient: Razorpay | undefined;

export function getRazorpay() {
  if (razorpayClient) return razorpayClient;

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = getRazorpayApiConfig();
  razorpayClient = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  return razorpayClient;
}

export function isRazorpayLivemode() {
  getRazorpayApiConfig();
  return currentPaymentLivemode();
}

export function getRazorpayPublicKey() {
  return getRazorpayApiConfig().RAZORPAY_KEY_ID;
}

export function verifyRazorpayPaymentSignature(input: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}) {
  const { RAZORPAY_KEY_SECRET } = getRazorpayApiConfig();
  return verifyPaymentSignatureWithSecret({
    ...input,
    secret: RAZORPAY_KEY_SECRET,
  });
}

export function verifyRazorpaySubscriptionSignature(input: {
  providerSubscriptionId: string;
  providerPaymentId: string;
  signature: string;
}) {
  const { RAZORPAY_KEY_SECRET } = getRazorpayApiConfig();
  return verifySubscriptionSignatureWithSecret({
    ...input,
    secret: RAZORPAY_KEY_SECRET,
  });
}

export function verifyRazorpayWebhookSignature(rawPayload: string, signature: string) {
  const {
    RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_WEBHOOK_SECRET_PREVIOUS,
  } = getRazorpayWebhookConfig();
  return verifyWebhookSignatureWithSecrets({
    rawPayload,
    signature,
    secrets: [
      RAZORPAY_WEBHOOK_SECRET,
      ...(RAZORPAY_WEBHOOK_SECRET_PREVIOUS
        ? [RAZORPAY_WEBHOOK_SECRET_PREVIOUS]
        : []),
    ],
  });
}

export async function createRazorpayRefund(input: {
  providerPaymentId: string;
  refundId: string;
  orderId: string;
  orderNumber: string;
  amountPaise: number;
  reason: string;
}) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = getRazorpayApiConfig();
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
        "X-Refund-Idempotency": input.refundId,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        speed: "normal",
        receipt: `KEVAL-${input.refundId}`.slice(0, 40),
        notes: {
          keval_refund_id: input.refundId,
          keval_order_id: input.orderId,
          keval_order_number: input.orderNumber,
          reason: input.reason.slice(0, 240),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }
  );
  const body = (await response.json().catch(() => null)) as
    | Refunds.RazorpayRefund
    | { error?: { code?: string; description?: string } }
    | null;
  if (!response.ok || !body || !("id" in body)) {
    const message =
      body && "error" in body
        ? body.error?.description || body.error?.code
        : null;
    throw new Error(message || `Razorpay refund request failed with HTTP ${response.status}.`);
  }
  return body;
}
