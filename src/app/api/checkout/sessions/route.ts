import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { createTrackCheckout } from "@/server/commerce/checkout";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";
import { requireIdempotencyKey } from "@/server/security/idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("direct"), trackId: z.string().trim().min(1).max(200) }),
  z.object({
    mode: z.literal("tracks"),
    trackIds: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  }),
  z.object({ mode: z.literal("cart") }),
]);

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const idempotencyKey = requireIdempotencyKey(request);
  const selection = await readJson(request, checkoutSchema);
  const checkout = await createTrackCheckout(user, selection, idempotencyKey);
  return apiJson(checkout, 201, requestId);
});
