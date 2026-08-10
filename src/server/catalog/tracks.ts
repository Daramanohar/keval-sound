import "server-only";

import { TrackSaleStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { ApiError } from "@/server/http/api";

export async function getTrackPurchaseCandidate(trackId: string) {
  return getPrisma().track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      title: true,
      category: true,
      saleStatus: true,
      pricePaise: true,
      currency: true,
      hasMp3: true,
      hasWav: true,
      version: true,
      pack: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
        },
      },
    },
  });
}

export async function requirePurchasableTrack(trackId: string) {
  const track = await getTrackPurchaseCandidate(trackId);
  if (!track) {
    throw new ApiError(404, "track_not_found", "This track does not exist.");
  }
  if (track.saleStatus !== TrackSaleStatus.AVAILABLE) {
    throw new ApiError(409, "track_not_available", "This exclusive track is no longer available to purchase.");
  }
  if (!track.hasMp3 || !track.hasWav) {
    throw new ApiError(409, "track_assets_incomplete", "This track is not ready for purchase.");
  }

  return track;
}
