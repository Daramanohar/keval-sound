import { PaymentDisputeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { paymentDisputeStatusForEvent } from "./dispute-state";

describe("Razorpay dispute state transitions", () => {
  it.each([
    ["payment.dispute.created", PaymentDisputeStatus.OPEN],
    ["payment.dispute.action_required", PaymentDisputeStatus.ACTION_REQUIRED],
    ["payment.dispute.under_review", PaymentDisputeStatus.UNDER_REVIEW],
    ["payment.dispute.won", PaymentDisputeStatus.WON],
    ["payment.dispute.lost", PaymentDisputeStatus.LOST],
    ["payment.dispute.closed", PaymentDisputeStatus.CLOSED],
  ])("maps %s to %s", (eventType, expectedStatus) => {
    expect(paymentDisputeStatusForEvent(eventType, null)).toBe(expectedStatus);
  });

  it("does not downgrade a won dispute when stale events arrive", () => {
    expect(
      paymentDisputeStatusForEvent(
        "payment.dispute.created",
        PaymentDisputeStatus.WON
      )
    ).toBe(PaymentDisputeStatus.WON);
    expect(
      paymentDisputeStatusForEvent(
        "payment.dispute.closed",
        PaymentDisputeStatus.WON
      )
    ).toBe(PaymentDisputeStatus.WON);
  });

  it("does not downgrade a lost dispute when stale events arrive", () => {
    expect(
      paymentDisputeStatusForEvent(
        "payment.dispute.under_review",
        PaymentDisputeStatus.LOST
      )
    ).toBe(PaymentDisputeStatus.LOST);
  });

  it("rejects unsupported event types", () => {
    expect(() => paymentDisputeStatusForEvent("payment.dispute.unknown", null)).toThrow(
      "Unsupported Razorpay dispute event"
    );
  });
});
