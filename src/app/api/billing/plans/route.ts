import { requireAppUser } from "@/server/auth/current-user";
import { listActivePlans } from "@/server/billing/plans";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  await requireAppUser();
  return apiJson({ plans: await listActivePlans() }, 200, requestId);
});
