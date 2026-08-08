import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { cancelRazorpaySubscription } from "@/server/billing/plans";
import { apiJson, assertTrustedMutationOrigin, readJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cancelSchema = z.object({ cancelAtPeriodEnd: z.boolean().default(true) });

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const input = await readJson(request, cancelSchema);
  return apiJson(await cancelRazorpaySubscription(user, input.cancelAtPeriodEnd), 200, requestId);
});
