import { requireAppUser } from "@/server/auth/current-user";
import { clearCart, getCart } from "@/server/cart/service";
import { apiJson, assertTrustedMutationOrigin, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  return apiJson({ cart: await getCart(user.id) }, 200, requestId);
});

export const DELETE = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  return apiJson({ cart: await clearCart(user.id) }, 200, requestId);
});
