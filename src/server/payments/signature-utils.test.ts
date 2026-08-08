import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyPaymentSignatureWithSecret,
  verifySubscriptionSignatureWithSecret,
  verifyWebhookSignatureWithSecret,
  verifyWebhookSignatureWithSecrets,
} from "./signature-utils";

const secret = "razorpay_test_secret_for_unit_tests";

function sign(message: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

describe("Razorpay signature verification", () => {
  it("accepts the documented order and payment signature order", () => {
    const providerOrderId = "order_keval_001";
    const providerPaymentId = "pay_keval_001";

    expect(
      verifyPaymentSignatureWithSecret({
        providerOrderId,
        providerPaymentId,
        signature: sign(`${providerOrderId}|${providerPaymentId}`),
        secret,
      })
    ).toBe(true);
  });

  it("rejects payment signatures with changed identifiers or malformed hex", () => {
    const validSignature = sign("order_keval_001|pay_keval_001");

    expect(
      verifyPaymentSignatureWithSecret({
        providerOrderId: "order_keval_001",
        providerPaymentId: "pay_changed",
        signature: validSignature,
        secret,
      })
    ).toBe(false);
    expect(
      verifyPaymentSignatureWithSecret({
        providerOrderId: "order_keval_001",
        providerPaymentId: "pay_keval_001",
        signature: "not-a-signature",
        secret,
      })
    ).toBe(false);
  });

  it("accepts the documented payment and subscription signature order", () => {
    const providerPaymentId = "pay_keval_subscription_001";
    const providerSubscriptionId = "sub_keval_001";

    expect(
      verifySubscriptionSignatureWithSecret({
        providerPaymentId,
        providerSubscriptionId,
        signature: sign(`${providerPaymentId}|${providerSubscriptionId}`),
        secret,
      })
    ).toBe(true);
    expect(
      verifySubscriptionSignatureWithSecret({
        providerPaymentId,
        providerSubscriptionId,
        signature: sign(`${providerSubscriptionId}|${providerPaymentId}`),
        secret,
      })
    ).toBe(false);
  });

  it("verifies the exact raw webhook body without reserializing it", () => {
    const rawPayload = '{"event":"payment.captured","payload":{"value":1}}\n';
    const signature = sign(rawPayload);

    expect(
      verifyWebhookSignatureWithSecret({ rawPayload, signature, secret })
    ).toBe(true);
    expect(
      verifyWebhookSignatureWithSecret({
        rawPayload: rawPayload.trim(),
        signature,
        secret,
      })
    ).toBe(false);
  });

  it("accepts a webhook signed with the previous rotation secret", () => {
    const currentSecret = "current-webhook-secret-that-is-long-enough";
    const previousSecret = "previous-webhook-secret-that-is-long-enough";
    const rawPayload = JSON.stringify({ event: "order.paid" });
    const signature = crypto
      .createHmac("sha256", previousSecret)
      .update(rawPayload)
      .digest("hex");

    expect(
      verifyWebhookSignatureWithSecrets({
        rawPayload,
        signature,
        secrets: [currentSecret, previousSecret],
      })
    ).toBe(true);
  });

  it("rejects a webhook that matches no configured rotation secret", () => {
    const rawPayload = JSON.stringify({ event: "order.paid" });
    const signature = crypto
      .createHmac("sha256", "unknown-webhook-secret-that-is-long-enough")
      .update(rawPayload)
      .digest("hex");

    expect(
      verifyWebhookSignatureWithSecrets({
        rawPayload,
        signature,
        secrets: [
          "current-webhook-secret-that-is-long-enough",
          "previous-webhook-secret-that-is-long-enough",
        ],
      })
    ).toBe(false);
  });
});
