import crypto from "node:crypto";
import { cleanupExpiredCommerceState } from "@/server/commerce/maintenance";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function matchesCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

export const GET = withApiHandler(async (request, _context, requestId) => {
  if (!matchesCronSecret(request)) {
    return apiJson(
      { error: "cron_unauthorized", message: "Maintenance authorization failed." },
      401,
      requestId
    );
  }
  return apiJson(await cleanupExpiredCommerceState(), 200, requestId);
});
