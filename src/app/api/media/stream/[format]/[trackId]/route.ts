import crypto from "node:crypto";
import { StreamFormat } from "@prisma/client";
import { requireAppUser } from "@/server/auth/current-user";
import { apiJson, withApiHandler } from "@/server/http/api";
import { authorizeTrackStream } from "@/server/media/stream-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamRouteContext = {
  params: Promise<{
    format: string;
    trackId: string;
  }>;
};

const PLAYBACK_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export const GET = withApiHandler<StreamRouteContext>(async (request, context, requestId) => {
  const user = await requireAppUser();
  const { format, trackId } = await context.params;
  const normalizedFormat = format.toLowerCase();
  if (normalizedFormat !== "mp3" && normalizedFormat !== "wav") {
    return apiJson(
      { error: "stream_format_not_available", message: "This stream format is unavailable." },
      403,
      requestId
    );
  }

  const url = new URL(request.url);
  const suppliedPlaybackId = url.searchParams.get("playbackId")?.trim();
  if (suppliedPlaybackId && !PLAYBACK_ID_PATTERN.test(suppliedPlaybackId)) {
    return apiJson(
      { error: "playback_id_invalid", message: "The playback identifier is invalid." },
      400,
      requestId
    );
  }

  const authorization = await authorizeTrackStream({
    user,
    request,
    trackId,
    requestedFormat: normalizedFormat === "wav" ? StreamFormat.WAV : StreamFormat.MP3,
    clientPlaybackId: suppliedPlaybackId ?? crypto.randomUUID(),
  });

  if (url.searchParams.get("response") === "json") {
    return apiJson(authorization, 200, requestId);
  }

  return new Response(null, {
    status: 307,
    headers: {
      Location: authorization.streamUrl,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  });
});
