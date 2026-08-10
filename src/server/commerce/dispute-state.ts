import { PaymentDisputeStatus } from "@prisma/client";

export function paymentDisputeStatusForEvent(
  eventType: string,
  previousStatus: PaymentDisputeStatus | null
): PaymentDisputeStatus {
  const candidate = (() => {
    switch (eventType) {
      case "payment.dispute.created":
        return PaymentDisputeStatus.OPEN;
      case "payment.dispute.action_required":
        return PaymentDisputeStatus.ACTION_REQUIRED;
      case "payment.dispute.under_review":
        return PaymentDisputeStatus.UNDER_REVIEW;
      case "payment.dispute.won":
        return PaymentDisputeStatus.WON;
      case "payment.dispute.lost":
        return PaymentDisputeStatus.LOST;
      case "payment.dispute.closed":
        return previousStatus === PaymentDisputeStatus.WON ||
          previousStatus === PaymentDisputeStatus.LOST
          ? previousStatus
          : PaymentDisputeStatus.CLOSED;
      default:
        throw new Error(`Unsupported Razorpay dispute event: ${eventType}`);
    }
  })();

  if (
    previousStatus === PaymentDisputeStatus.WON ||
    previousStatus === PaymentDisputeStatus.LOST
  ) {
    return previousStatus;
  }
  return candidate;
}
