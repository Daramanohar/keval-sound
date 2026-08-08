import { requireAppUser } from "@/server/auth/current-user";
import { listAccountDownloads } from "@/server/account/library";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  return apiJson({ downloads: await listAccountDownloads(user.id) }, 200, requestId);
});
