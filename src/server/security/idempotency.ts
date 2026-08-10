import "server-only";

import crypto from "node:crypto";
import { ApiError } from "@/server/http/api";

export function requireIdempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new ApiError(
      400,
      "invalid_idempotency_key",
      "Idempotency-Key must contain 8 to 128 letters, numbers, dots, underscores, colons, or hyphens."
    );
  }
  return key;
}

export function hashIdempotencyKey(userId: string, scope: string, key: string) {
  return crypto.createHash("sha256").update(`${userId}:${scope}:${key}`).digest("hex");
}

export function hashRequestPayload(payload: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
