import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { addTrackToCart } from "@/server/cart/service";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addCartItemSchema = z.object({
  trackId: z.string().trim().min(1).max(200),
});

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const { trackId } = await readJson(request, addCartItemSchema);
  return apiJson({ cart: await addTrackToCart(user.id, trackId) }, 200, requestId);
});
