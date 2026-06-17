import { notFound } from "next/navigation";
import PlaylistDetailClient from "./PlaylistDetailClient";
import { CURATED_PLAYLISTS, getCuratedPlaylistBySlug } from "@/lib/playlist-catalog";

export function generateStaticParams() {
  return CURATED_PLAYLISTS.map((playlist) => ({ slug: playlist.slug }));
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const playlist = getCuratedPlaylistBySlug(slug);

  if (!playlist) {
    notFound();
  }

  return <PlaylistDetailClient playlist={playlist} />;
}
