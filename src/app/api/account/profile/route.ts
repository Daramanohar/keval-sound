import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUserFromClerk } from "@/lib/clerk-user-sync";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return json({ error: "unauthorized" }, 401);
  if (!isDatabaseConfigured()) return json({ error: "database_not_configured" }, 503);

  const prisma = getPrisma();
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { kevalUserId: true },
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return json({ error: "user_not_found" }, 404);

    const synced = await upsertUserFromClerk(clerkUser);
    if (!synced.ok) return json({ error: synced.reason }, 503);

    user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { kevalUserId: true },
    });
  }

  if (!user) return json({ error: "user_not_found" }, 404);

  return json({ kevalUserId: user.kevalUserId });
}
