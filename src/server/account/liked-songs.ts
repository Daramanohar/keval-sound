import "server-only";

import { AuditActorType } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AppUser } from "@/server/auth/current-user";
import { getClientIpHash, writeAuditLog } from "@/server/audit/log";
import { ApiError } from "@/server/http/api";

function stringTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export async function listLikedSongs(userId: string) {
  const likes = await getPrisma().trackLike.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      createdAt: true,
      track: {
        select: {
          id: true,
          title: true,
          category: true,
          durationSeconds: true,
          hasMp3: true,
          tags: true,
          saleStatus: true,
          exclusiveOwnerId: true,
          pricePaise: true,
          currency: true,
          pack: {
            select: {
              id: true,
              title: true,
              category: true,
              coverUrl: true,
            },
          },
        },
      },
    },
  });

  return likes.map((like) => ({
    likedAt: like.createdAt.toISOString(),
    track: {
      ...like.track,
      owned: like.track.exclusiveOwnerId === userId,
      exclusiveOwnerId: undefined,
      tags: stringTags(like.track.tags),
    },
  }));
}

export async function setTrackLiked(input: {
  user: AppUser;
  request: Request;
  requestId: string;
  trackId: string;
  liked: boolean;
}) {
  const prisma = getPrisma();
  const track = await prisma.track.findUnique({
    where: { id: input.trackId },
    select: { id: true },
  });
  if (!track) {
    throw new ApiError(404, "track_not_found", "This song is not in the Keval catalog.");
  }

  let likedAt: Date | null = null;
  if (input.liked) {
    const like = await prisma.trackLike.upsert({
      where: {
        userId_trackId: {
          userId: input.user.id,
          trackId: input.trackId,
        },
      },
      create: { userId: input.user.id, trackId: input.trackId },
      update: {},
      select: { createdAt: true },
    });
    likedAt = like.createdAt;
  } else {
    await prisma.trackLike.deleteMany({
      where: { userId: input.user.id, trackId: input.trackId },
    });
  }

  await writeAuditLog({
    actorType: AuditActorType.USER,
    actorUserId: input.user.id,
    action: input.liked ? "track.like_added" : "track.like_removed",
    targetType: "track",
    targetId: input.trackId,
    requestId: input.requestId,
    ipHash: getClientIpHash(input.request),
  });

  return {
    trackId: input.trackId,
    liked: input.liked,
    likedAt: likedAt?.toISOString() ?? null,
  };
}
