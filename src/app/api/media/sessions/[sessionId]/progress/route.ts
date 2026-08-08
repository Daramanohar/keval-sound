import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import {
  apiJson,
  assertTrustedMutationOrigin,
  readJson,
  withApiHandler,
} from "@/server/http/api";
import { recordStreamProgress } from "@/server/media/stream-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProgressRouteContext = {
  params: Promise<{ sessionId: string }>;
};

const progressSchema = z.object({
  positionSeconds: z.number().finite().min(0).max(86_400),
  completed: z.boolean().default(false),
});

export const POST = withApiHandler<ProgressRouteContext>(async (request, context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const { sessionId } = await context.params;
  const body = await readJson(request, progressSchema);
  const progress = await recordStreamProgress({ user, sessionId, ...body });
  return apiJson(progress, 200, requestId);
});
