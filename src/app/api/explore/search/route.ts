import { auth } from "@clerk/nextjs/server";
import { searchExploreTracksSmart } from "@/lib/vector-explore-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const genre = url.searchParams.get("genre") ?? "All Genres";
  const limitParam = Number(url.searchParams.get("limit") ?? "3000");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 3000)
    : 3000;

  return json(await searchExploreTracksSmart(query, genre, limit));
}
