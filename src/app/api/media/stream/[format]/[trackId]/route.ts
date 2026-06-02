import crypto from "node:crypto";
import { productionSongRecords } from "@/lib/production-catalog.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_GATE_BASE_URL = process.env.MEDIA_GATE_BASE_URL ?? "https://media.kevalsound.com";
const STREAM_TOKEN_TTL_SECONDS = 20 * 60;
const SUPPORTED_STREAM_FORMATS = new Set(["mp3"]);

type StreamRouteContext = {
  params: Promise<{
    format: string;
    trackId: string;
  }>;
};

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: Record<string, unknown>, secret: string) {
  const payloadPart = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(_request: Request, context: StreamRouteContext) {
  const { format, trackId } = await context.params;
  const normalizedFormat = format.toLowerCase();

  if (!SUPPORTED_STREAM_FORMATS.has(normalizedFormat)) {
    return noStoreJson({ error: "stream_format_not_available" }, 403);
  }

  const record = productionSongRecords.find((song) => song.id === trackId);
  if (!record || !record.hasMp3) {
    return noStoreJson({ error: "track_not_found" }, 404);
  }

  const secret = process.env.MEDIA_GATE_SIGNING_SECRET;
  if (!secret) {
    return noStoreJson({ error: "media_gate_secret_missing" }, 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const access = `${normalizedFormat}-stream`;
  const token = signPayload(
    {
      sub: "preview",
      trackId,
      access,
      iat: now,
      exp: now + STREAM_TOKEN_TTL_SECONDS,
      jti: crypto.randomUUID(),
    },
    secret
  );

  const mediaUrl = new URL(`/v1/${normalizedFormat}/stream/${encodeURIComponent(trackId)}`, MEDIA_GATE_BASE_URL);
  mediaUrl.searchParams.set("token", token);

  return Response.redirect(mediaUrl, 307);
}
