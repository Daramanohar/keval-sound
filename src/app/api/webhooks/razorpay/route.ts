import crypto from "node:crypto";
import { PaymentProvider, WebhookProvider, WebhookStatus } from "@prisma/client";
import type { Payments } from "razorpay/dist/types/payments";
import type { Refunds } from "razorpay/dist/types/refunds";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import type { Disputes } from "razorpay/dist/types/disputes";
import { getPrisma } from "@/lib/db";
import { syncRazorpaySubscription } from "@/server/billing/plans";
import { syncRazorpayDispute } from "@/server/commerce/disputes";
import {
  fulfillTrackPayment,
  recordTrackPaymentAuthorization,
  recordTrackPaymentFailure,
} from "@/server/commerce/fulfillment";
import { syncRazorpayRefund } from "@/server/commerce/refunds";
import { apiJson } from "@/server/http/api";
import {
  getRazorpay,
  isRazorpayLivemode,
  verifyRazorpayWebhookSignature,
} from "@/server/payments/razorpay";
import {
  claimWebhook,
  completeWebhookEvent,
  failWebhookEvent,
} from "@/server/payments/webhook-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 1024 * 1024;

type RazorpayWebhook = {
  event: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: Payments.RazorpayPayment };
    refund?: {
      entity?: Refunds.RazorpayRefund & { failure_reason?: string | null };
    };
    order?: { entity?: { id?: string } };
    subscription?: { entity?: Subscriptions.RazorpaySubscription };
    dispute?: { entity?: Disputes.RazorpayDispute };
  };
};

function eventObjectId(event: RazorpayWebhook) {
  return (
    event.payload?.dispute?.entity?.id ??
    event.payload?.payment?.entity?.id ??
    event.payload?.refund?.entity?.id ??
    event.payload?.subscription?.entity?.id ??
    event.payload?.order?.entity?.id ??
    null
  );
}

async function isTrackPurchaseOrder(providerOrderId: string) {
  const order = await getPrisma().order.findFirst({
    where: {
      paymentProvider: PaymentProvider.RAZORPAY,
      providerLivemode: isRazorpayLivemode(),
      providerOrderId,
    },
    select: { id: true },
  });
  return Boolean(order);
}

async function processEvent(event: RazorpayWebhook) {
  switch (event.event) {
    case "order.paid": {
      const providerOrderId = event.payload?.order?.entity?.id;
      const payment = event.payload?.payment?.entity;
      if (!providerOrderId) throw new Error("Razorpay order.paid payload has no order id.");
      if (!(await isTrackPurchaseOrder(providerOrderId))) return false;
      await fulfillTrackPayment(providerOrderId, payment?.id);
      return true;
    }
    case "payment.captured": {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id) throw new Error("Razorpay payment.captured payload has no order id.");
      if (!(await isTrackPurchaseOrder(payment.order_id))) return false;
      await fulfillTrackPayment(payment.order_id, payment.id);
      return true;
    }
    case "payment.authorized": {
      const payment = event.payload?.payment?.entity;
      if (!payment) throw new Error("Razorpay payment.authorized payload has no payment entity.");
      await recordTrackPaymentAuthorization(payment);
      return true;
    }
    case "payment.failed": {
      const payment = event.payload?.payment?.entity;
      if (!payment) throw new Error("Razorpay payment.failed payload has no payment entity.");
      await recordTrackPaymentFailure(payment);
      return true;
    }
    case "refund.created":
    case "refund.processed":
    case "refund.failed":
    case "refund.speed_changed": {
      const refund = event.payload?.refund?.entity;
      if (!refund) throw new Error(`${event.event} payload has no refund entity.`);
      const currentRefund = await getRazorpay().payments.fetchRefund(refund.payment_id, refund.id);
      await syncRazorpayRefund(currentRefund);
      return true;
    }
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.completed":
    case "subscription.updated":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.paused":
    case "subscription.resumed": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) throw new Error(`${event.event} payload has no subscription entity.`);
      await syncRazorpaySubscription(subscription);
      return true;
    }
    case "payment.dispute.created":
    case "payment.dispute.won":
    case "payment.dispute.lost":
    case "payment.dispute.closed":
    case "payment.dispute.under_review":
    case "payment.dispute.action_required": {
      const dispute = event.payload?.dispute?.entity;
      if (!dispute) throw new Error(`${event.event} payload has no dispute entity.`);
      await syncRazorpayDispute(event.event, dispute);
      return true;
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return apiJson({ error: "razorpay_signature_missing" }, 400);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return apiJson({ error: "webhook_payload_too_large" }, 413);
  }
  const rawPayload = await request.text();
  if (Buffer.byteLength(rawPayload, "utf8") > MAX_WEBHOOK_BYTES) {
    return apiJson({ error: "webhook_payload_too_large" }, 413);
  }

  try {
    if (!verifyRazorpayWebhookSignature(rawPayload, signature)) {
      return apiJson({ error: "razorpay_signature_invalid" }, 400);
    }
  } catch (error) {
    console.error("[razorpay-webhook] signature verification failed", error);
    return apiJson({ error: "razorpay_signature_invalid" }, 400);
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(rawPayload) as RazorpayWebhook;
  } catch {
    return apiJson({ error: "webhook_payload_invalid" }, 400);
  }
  if (!event.event || typeof event.event !== "string") {
    return apiJson({ error: "webhook_event_invalid" }, 400);
  }

  const headerEventId = request.headers.get("x-razorpay-event-id")?.trim();
  const providerEventId =
    headerEventId || crypto.createHash("sha256").update(rawPayload).digest("hex");
  let claim: Awaited<ReturnType<typeof claimWebhook>>;
  try {
    claim = await claimWebhook({
      provider: WebhookProvider.RAZORPAY,
      providerEventId,
      providerLivemode: isRazorpayLivemode(),
      eventType: event.event,
      objectId: eventObjectId(event),
      rawPayload,
    });
  } catch (error) {
    console.error("[razorpay-webhook] could not claim event", { providerEventId, error });
    return apiJson({ error: "webhook_claim_failed" }, 500);
  }
  if (!claim.shouldProcess) {
    return apiJson({ received: true, duplicate: true }, 200);
  }

  try {
    const handled = await processEvent(event);
    await completeWebhookEvent(
      claim.recordId,
      handled ? WebhookStatus.PROCESSED : WebhookStatus.IGNORED
    );
    return apiJson({ received: true }, 200);
  } catch (error) {
    await failWebhookEvent(claim.recordId, error).catch((recordError) => {
      console.error("[razorpay-webhook] could not record failure", {
        providerEventId,
        recordError,
      });
    });
    console.error("[razorpay-webhook] processing failed", {
      providerEventId,
      type: event.event,
      error,
    });
    return apiJson({ error: "webhook_processing_failed" }, 500);
  }
}
