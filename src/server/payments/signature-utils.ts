import crypto from "node:crypto";

function hmacSha256(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function constantTimeHexEqual(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return (
    expectedBytes.length === receivedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export function verifyPaymentSignatureWithSecret(input: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  secret: string;
}) {
  return constantTimeHexEqual(
    hmacSha256(`${input.providerOrderId}|${input.providerPaymentId}`, input.secret),
    input.signature
  );
}

export function verifySubscriptionSignatureWithSecret(input: {
  providerSubscriptionId: string;
  providerPaymentId: string;
  signature: string;
  secret: string;
}) {
  return constantTimeHexEqual(
    hmacSha256(
      `${input.providerPaymentId}|${input.providerSubscriptionId}`,
      input.secret
    ),
    input.signature
  );
}

export function verifyWebhookSignatureWithSecret(input: {
  rawPayload: string;
  signature: string;
  secret: string;
}) {
  return constantTimeHexEqual(
    hmacSha256(input.rawPayload, input.secret),
    input.signature
  );
}

export function verifyWebhookSignatureWithSecrets(input: {
  rawPayload: string;
  signature: string;
  secrets: readonly string[];
}) {
  // Evaluate every secret so key rotation does not disclose which one matched.
  return input.secrets
    .map((secret) =>
      verifyWebhookSignatureWithSecret({
        rawPayload: input.rawPayload,
        signature: input.signature,
        secret,
      })
    )
    .some(Boolean);
}
