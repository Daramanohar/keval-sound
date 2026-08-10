import { DownloadAssetType } from "@prisma/client";
import { z } from "zod";
import { requireAppUser } from "@/server/auth/current-user";
import { createTrackDownloadGrant } from "@/server/downloads/grants";
import {
  apiJson,
  assertTrustedMutationOrigin,
  readJson,
  withApiHandler,
} from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantSchema = z.object({
  trackId: z.string().trim().min(1).max(240),
  assetType: z.enum(["MP3", "WAV", "LICENSE_PDF", "INVOICE_PDF"]),
});

export const POST = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const body = await readJson(request, grantSchema);
  const grant = await createTrackDownloadGrant({
    user,
    request,
    requestId,
    trackId: body.trackId,
    assetType: body.assetType as DownloadAssetType,
  });
  return apiJson(grant, 201, requestId);
});
