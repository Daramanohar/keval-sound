import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readyProductionPacks } from "@/lib/production-catalog";
import SongDetailPageClient from "./SongDetailPageClient";

interface SongPageProps {
  params: Promise<{ id: string }>;
}

function findProductionSong(id: string) {
  for (const pack of readyProductionPacks) {
    const track = pack.tracks.find((candidate) => candidate.id === id);
    if (track) return { track, pack };
  }

  return null;
}

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = findProductionSong(id);

  if (!result) return { title: "Track not found | Keval Sound" };

  return {
    title: `${result.track.title} | Keval Sound`,
    description: `Preview ${result.track.title} by ${result.track.artist} from ${result.pack.title}.`,
  };
}

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;
  const result = findProductionSong(id);

  if (!result) notFound();

  return <SongDetailPageClient track={result.track} pack={result.pack} />;
}
