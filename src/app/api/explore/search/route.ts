import { auth } from "@clerk/nextjs/server";
import { searchExploreTracksSmart } from "@/lib/vector-explore-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 96;
const MAX_PAGE_SIZE = 120;
const MAX_SEARCH_WINDOW = 3000;

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
  const limitParam = Number(url.searchParams.get("limit") ?? `${DEFAULT_PAGE_SIZE}`);
  const offsetParam = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetParam)
    ? Math.min(Math.max(Math.trunc(offsetParam), 0), MAX_SEARCH_WINDOW)
    : 0;
  const searchWindow = Math.min(offset + limit, MAX_SEARCH_WINDOW);
  const result = await searchExploreTracksSmart(query, genre, searchWindow);

  return json({
    ...result,
    limit,
    offset,
    tracks: result.tracks.slice(offset, offset + limit),
  });
}
