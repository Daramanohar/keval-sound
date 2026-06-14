import crypto from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { productionSongRecords } from "@/lib/production-catalog.generated";
import { isWavReviewerEmail } from "@/lib/reviewer-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_GATE_BASE_URL = process.env.MEDIA_GATE_BASE_URL ?? "https://media.kevalsound.com";
const STREAM_TOKEN_TTL_SECONDS = 20 * 60;
const SUPPORTED_STREAM_FORMATS = new Set(["mp3", "wav"]);

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
  // Gate at the handler level instead of in proxy.ts. Proxy intentionally
  // excludes /api/media so the Worker redirect (Range, 206, etc.) stays
  // clean, but the token issuer here must only fire for signed-in users.
  const { userId } = await auth();
  if (!userId) {
    return noStoreJson({ error: "unauthorized" }, 401);
  }

  const { format, trackId } = await context.params;
  const normalizedFormat = format.toLowerCase();

  if (!SUPPORTED_STREAM_FORMATS.has(normalizedFormat)) {
    return noStoreJson({ error: "stream_format_not_available" }, 403);
  }

  const record = productionSongRecords.find((song) => song.id === trackId);
  if (!record) {
    return noStoreJson({ error: "track_not_found" }, 404);
  }

  if (normalizedFormat === "mp3" && !record.hasMp3) {
    return noStoreJson({ error: "track_not_found" }, 404);
  }

  if (normalizedFormat === "wav" && !record.hasWav) {
    return noStoreJson({ error: "track_not_found" }, 404);
  }

  if (normalizedFormat === "wav") {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!isWavReviewerEmail(email)) {
      return noStoreJson({ error: "wav_review_access_denied" }, 403);
    }
  }

  const secret = process.env.MEDIA_GATE_SIGNING_SECRET;
  if (!secret) {
    return noStoreJson({ error: "media_gate_secret_missing" }, 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const access = `${normalizedFormat}-stream`;
  const token = signPayload(
    {
      sub: userId,
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
