import "server-only";

import crypto from "node:crypto";
import { MEDIA_TOKEN_TTL_SECONDS } from "@/server/domain/constants";
import { ApiError } from "@/server/http/api";

type MediaAccess = "mp3-stream" | "wav-stream" | "mp3-download" | "wav-download";

type MediaTokenInput = {
  subject: string;
  trackId: string;
  access: MediaAccess;
  sessionId?: string;
  ttlSeconds?: number;
};

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: Record<string, unknown>, secret: string) {
  const payloadPart = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

export function createSignedMediaUrl(input: MediaTokenInput) {
  const secret = process.env.MEDIA_GATE_SIGNING_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new ApiError(503, "media_gate_unavailable", "Secure media playback is temporarily unavailable.");
  }

  const baseUrl = process.env.MEDIA_GATE_BASE_URL?.trim() || "https://media.kevalsound.com";
  const [format, mode] = input.access.split("-") as ["mp3" | "wav", "stream" | "download"];
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = input.ttlSeconds ?? MEDIA_TOKEN_TTL_SECONDS;
  const token = signPayload(
    {
      sub: input.subject,
      trackId: input.trackId,
      access: input.access,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      iat: now,
      exp: now + ttlSeconds,
      jti: crypto.randomUUID(),
    },
    secret
  );

  const mediaUrl = new URL(
    `/v1/${format}/${mode}/${encodeURIComponent(input.trackId)}`,
    baseUrl
  );
  mediaUrl.searchParams.set("token", token);

  return {
    url: mediaUrl.toString(),
    expiresAt: new Date((now + ttlSeconds) * 1000),
  };
}
