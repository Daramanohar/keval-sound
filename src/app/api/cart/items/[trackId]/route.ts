import { requireAppUser } from "@/server/auth/current-user";
import { removeTrackFromCart } from "@/server/cart/service";
import { apiJson, assertTrustedMutationOrigin, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartItemRouteContext = {
  params: Promise<{ trackId: string }>;
};

export const DELETE = withApiHandler<CartItemRouteContext>(async (request, context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const { trackId } = await context.params;
  return apiJson({ cart: await removeTrackFromCart(user.id, trackId) }, 200, requestId);
});
