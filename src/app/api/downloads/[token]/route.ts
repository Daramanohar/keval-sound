import { requireAppUser } from "@/server/auth/current-user";
import { redeemTrackDownloadGrant } from "@/server/downloads/grants";
import { ApiError, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DownloadRouteContext = {
  params: Promise<{ token: string }>;
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,80}$/;

export const GET = withApiHandler<DownloadRouteContext>(async (request, context, requestId) => {
  const user = await requireAppUser();
  const { token } = await context.params;
  if (!TOKEN_PATTERN.test(token)) {
    throw new ApiError(404, "download_grant_not_found", "This download link is invalid.");
  }
  const result = await redeemTrackDownloadGrant({ user, request, requestId, rawToken: token });
  if (result.kind === "document") {
    return new Response(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.bytes.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  }
  return new Response(null, {
    status: 307,
    headers: {
      Location: result.url,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  });
});
