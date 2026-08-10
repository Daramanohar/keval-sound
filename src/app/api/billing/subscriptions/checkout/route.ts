import { PlanCode } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { createSubscriptionCheckout } from "@/server/billing/plans";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";
import { requireIdempotencyKey } from "@/server/security/idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscriptionCheckoutSchema = z.object({
  planCode: z.enum(["KEVAL_RADIO", "STANDARD", "PRO", "ENTERPRISE"]),
});

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const idempotencyKey = requireIdempotencyKey(request);
  const { planCode } = await readJson(request, subscriptionCheckoutSchema);
  const checkout = await createSubscriptionCheckout(user, planCode as PlanCode, idempotencyKey);
  return apiJson(checkout, 201, requestId);
});
