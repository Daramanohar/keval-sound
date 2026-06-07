import { verifyWebhook } from "@clerk/backend/webhooks";
import {
  markUserDeletedFromClerk,
  upsertUserFromClerk,
  type ClerkUserSyncPayload,
} from "@/lib/clerk-user-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error);
    return json({ error: "webhook_verification_failed" }, 400);
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const result = await upsertUserFromClerk(event.data as ClerkUserSyncPayload);

      if (!result.ok && result.reason === "database_not_configured") {
        return json({ error: result.reason }, 503);
      }

      if (!result.ok) {
        console.error("[clerk-webhook] user sync failed", {
          type: event.type,
          reason: result.reason,
        });
        return json({ error: result.reason }, 400);
      }

      return json({ ok: true, type: event.type, userId: result.userId });
    }

    if (event.type === "user.deleted") {
      const clerkUserId = event.data.id;
      if (!clerkUserId) {
        return json({ error: "missing_clerk_user_id" }, 400);
      }

      const result = await markUserDeletedFromClerk(clerkUserId);
      if (!result.ok && result.reason === "database_not_configured") {
        return json({ error: result.reason }, 503);
      }

      return json({
        ok: true,
        type: event.type,
        status: result.ok ? "deleted" : "already_absent",
      });
    }

    return json({ ok: true, type: event.type, ignored: true });
  } catch (error) {
    console.error("[clerk-webhook] handler failed", error);
    return json({ error: "webhook_handler_failed" }, 500);
  }
}
