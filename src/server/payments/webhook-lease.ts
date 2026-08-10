export const WEBHOOK_PROCESSING_LEASE_MS = 5 * 60_000;

export function canClaimWebhookDelivery(input: {
  status: "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "IGNORED";
  updatedAt: Date;
  now: Date;
  leaseMs?: number;
}) {
  if (input.status === "PROCESSED" || input.status === "IGNORED") return false;
  if (input.status !== "PROCESSING") return true;

  const leaseMs = input.leaseMs ?? WEBHOOK_PROCESSING_LEASE_MS;
  return input.updatedAt.getTime() <= input.now.getTime() - leaseMs;
}
