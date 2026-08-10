import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { listLikedSongs, setTrackLiked } from "@/server/account/liked-songs";
import {
  apiJson,
  assertTrustedMutationOrigin,
  readJson,
  withApiHandler,
} from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateLikeSchema = z.object({
  trackId: z.string().trim().min(1).max(240),
  liked: z.boolean(),
});

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  return apiJson({ likedSongs: await listLikedSongs(user.id) }, 200, requestId);
});

export const PUT = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const body = await readJson(request, updateLikeSchema);
  const result = await setTrackLiked({ user, request, requestId, ...body });
  return apiJson(result, 200, requestId);
});
