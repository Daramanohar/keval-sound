import { requireAppUser } from "@/server/auth/current-user";
import { getAccountAccessSnapshot } from "@/server/account/library";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  return apiJson(await getAccountAccessSnapshot(user.id), 200, requestId);
});
