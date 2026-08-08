import { requireAppUser } from "@/server/auth/current-user";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();

  return apiJson(
    {
      kevalUserId: user.kevalUserId,
      role: user.role,
      onboardingComplete: Boolean(user.onboardingCompletedAt),
    },
    200,
    requestId
  );
});
