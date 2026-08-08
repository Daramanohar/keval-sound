import { requireAppUser } from "@/server/auth/current-user";
import { listAccountOrders } from "@/server/account/library";
import { ApiError, apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request, _context, requestId) => {
  const user = await requireAppUser();
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
    throw new ApiError(400, "limit_invalid", "Purchase history limit must be between 1 and 50.");
  }
  const history = await listAccountOrders(user.id, {
    cursor: url.searchParams.get("cursor")?.trim() || undefined,
    limit: requestedLimit,
  });
  return apiJson(history, 200, requestId);
});
