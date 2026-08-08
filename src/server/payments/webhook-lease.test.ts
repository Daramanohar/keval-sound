import { describe, expect, it } from "vitest";
import { canClaimWebhookDelivery } from "./webhook-lease";

const now = new Date("2026-08-08T08:00:00.000Z");

describe("webhook processing leases", () => {
  it.each(["PROCESSED", "IGNORED"] as const)(
    "does not reclaim terminal %s events",
    (status) => {
      expect(
        canClaimWebhookDelivery({ status, updatedAt: new Date(0), now })
      ).toBe(false);
    }
  );

  it.each(["RECEIVED", "FAILED"] as const)("reclaims %s events", (status) => {
    expect(canClaimWebhookDelivery({ status, updatedAt: now, now })).toBe(true);
  });

  it("does not process a concurrent delivery while its lease is active", () => {
    expect(
      canClaimWebhookDelivery({
        status: "PROCESSING",
        updatedAt: new Date(now.getTime() - 60_000),
        now,
      })
    ).toBe(false);
  });

  it("reclaims a processing event after a crashed worker lease expires", () => {
    expect(
      canClaimWebhookDelivery({
        status: "PROCESSING",
        updatedAt: new Date(now.getTime() - 6 * 60_000),
        now,
      })
    ).toBe(true);
  });
});
