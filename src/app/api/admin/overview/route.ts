import { UserRole } from "@prisma/client";
import { getOperationsOverview } from "@/server/admin/operations";
import { requireUserRole } from "@/server/auth/current-user";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  await requireUserRole([UserRole.ADMIN, UserRole.FINANCE]);
  return apiJson(await getOperationsOverview(), 200, requestId);
});
