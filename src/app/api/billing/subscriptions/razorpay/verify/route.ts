import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAppUser } from "@/server/auth/current-user";
import { syncRazorpaySubscription } from "@/server/billing/plans";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";
import {
  getRazorpay,
  isRazorpayLivemode,
  verifyRazorpaySubscriptionSignature,
} from "@/server/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  appSubscriptionId: z.string().trim().min(1).max(200),
  razorpay_subscription_id: z.string().trim().min(1).max(200),
  razorpay_payment_id: z.string().trim().min(1).max(200),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const input = await readJson(request, verifySchema);
  const subscription = await getPrisma().subscription.findFirst({
    where: {
      id: input.appSubscriptionId,
      userId: user.id,
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: isRazorpayLivemode(),
    },
    select: { providerSubscriptionId: true },
  });
  if (
    !subscription ||
    subscription.providerSubscriptionId !== input.razorpay_subscription_id
  ) {
    return apiJson({ error: "subscription_mismatch", message: "Subscription validation failed." }, 409, requestId);
  }
  if (
    !verifyRazorpaySubscriptionSignature({
      providerSubscriptionId: subscription.providerSubscriptionId,
      providerPaymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    })
  ) {
    return apiJson({ error: "razorpay_signature_invalid", message: "Subscription signature validation failed." }, 400, requestId);
  }

  const providerSubscription = await getRazorpay().subscriptions.fetch(
    subscription.providerSubscriptionId
  );
  const saved = await syncRazorpaySubscription(providerSubscription);
  return apiJson(
    {
      subscriptionId: saved.id,
      status: saved.status,
      currentPeriodEnd: saved.currentPeriodEnd?.toISOString() ?? null,
    },
    saved.status === "ACTIVE" ? 200 : 202,
    requestId
  );
});
