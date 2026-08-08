import "server-only";

import {
  EntitlementKind,
  EntitlementStatus,
  PaymentProvider,
  StreamAccessMode,
  StreamFormat,
  StreamSessionStatus,
  TrackSaleStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { isWavReviewerEmail } from "@/lib/reviewer-access";
import type { AppUser } from "@/server/auth/current-user";
import { getClientIpHash } from "@/server/audit/log";
import { currentPaymentLivemode } from "@/server/config/env";
import { FREE_DAILY_STREAM_LIMIT } from "@/server/domain/constants";
import { ApiError } from "@/server/http/api";
import { createSignedMediaUrl } from "@/server/media/token";

const STREAM_SESSION_TTL_MS = 2 * 60 * 60_000;

function utcDayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function hasLosslessEntitlement(userId: string, now: Date) {
  const providerLivemode = currentPaymentLivemode();
  const entitlement = await getPrisma().entitlement.findFirst({
    where: {
      userId,
      kind: EntitlementKind.LOSSLESS_STREAM,
      status: EntitlementStatus.ACTIVE,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      subscription: {
        provider: PaymentProvider.RAZORPAY,
        providerLivemode,
      },
    },
    select: { id: true },
  });
  return Boolean(entitlement);
}

function assertTrackSupportsFormat(
  track: { hasMp3: boolean; hasWav: boolean },
  format: StreamFormat
) {
  if (format === StreamFormat.MP3 && !track.hasMp3) {
    throw new ApiError(404, "track_not_found", "This track does not have an MP3 stream.");
  }
  if (format === StreamFormat.WAV && !track.hasWav) {
    throw new ApiError(404, "track_not_found", "This track does not have a WAV stream.");
  }
}

export type StreamAuthorization = {
  streamUrl: string;
  streamSessionId: string;
  format: "mp3" | "wav";
  accessMode: StreamAccessMode;
  remainingFreeStreams: number | null;
  resetsAt: string | null;
  expiresAt: string;
};

export async function authorizeTrackStream(input: {
  user: AppUser;
  request: Request;
  trackId: string;
  requestedFormat: StreamFormat;
  clientPlaybackId: string;
}): Promise<StreamAuthorization> {
  const prisma = getPrisma();
  const now = new Date();
  const track = await prisma.track.findUnique({
    where: { id: input.trackId },
    select: {
      id: true,
      durationSeconds: true,
      hasMp3: true,
      hasWav: true,
    },
  });
  if (!track) {
    throw new ApiError(404, "track_not_found", "This track was not found.");
  }
  const reviewer = isWavReviewerEmail(input.user.email);
  const losslessSubscriber = await hasLosslessEntitlement(input.user.id, now);
  if (input.requestedFormat === StreamFormat.WAV && !reviewer && !losslessSubscriber) {
    throw new ApiError(
      403,
      "lossless_subscription_required",
      "Upgrade to KEVAL RADIO for lossless WAV streaming."
    );
  }

  const authorizedFormat =
    losslessSubscriber && track.hasWav ? StreamFormat.WAV : input.requestedFormat;
  assertTrackSupportsFormat(track, authorizedFormat);

  const accessMode = reviewer
    ? StreamAccessMode.REVIEWER
    : losslessSubscriber
      ? StreamAccessMode.SUBSCRIPTION
      : StreamAccessMode.FREE_DAILY;
  const day = utcDayBounds(now);

  const sessionResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.user.id}))`;

    const existing = await tx.streamSession.findUnique({
      where: {
        userId_clientPlaybackId: {
          userId: input.user.id,
          clientPlaybackId: input.clientPlaybackId,
        },
      },
    });
    if (existing) {
      if (existing.trackId !== track.id || existing.format !== authorizedFormat) {
        throw new ApiError(
          409,
          "playback_id_reused",
          "This playback identifier is already attached to another stream."
        );
      }
      if (existing.expiresAt <= now) {
        throw new ApiError(409, "playback_session_expired", "Start this track again to continue.");
      }

      const used = existing.accessMode === StreamAccessMode.FREE_DAILY
        ? await tx.streamSession.count({
            where: {
              userId: input.user.id,
              accessMode: StreamAccessMode.FREE_DAILY,
              reservedAt: { gte: day.start, lt: day.end },
              status: { notIn: [StreamSessionStatus.EXPIRED, StreamSessionStatus.FAILED] },
            },
          })
        : 0;
      return {
        session: existing,
        remaining: existing.accessMode === StreamAccessMode.FREE_DAILY
          ? Math.max(0, FREE_DAILY_STREAM_LIMIT - used)
          : null,
      };
    }

    let remaining: number | null = null;
    if (accessMode === StreamAccessMode.FREE_DAILY) {
      const used = await tx.streamSession.count({
        where: {
          userId: input.user.id,
          accessMode: StreamAccessMode.FREE_DAILY,
          reservedAt: { gte: day.start, lt: day.end },
          status: { notIn: [StreamSessionStatus.EXPIRED, StreamSessionStatus.FAILED] },
        },
      });
      if (used >= FREE_DAILY_STREAM_LIMIT) {
        throw new ApiError(
          429,
          "daily_stream_limit_reached",
          "You have used today's 10 free streams. Upgrade to KEVAL RADIO for INR 49/month to unlock unlimited lossless listening.",
          [{ limit: FREE_DAILY_STREAM_LIMIT, used, resetsAt: day.end.toISOString() }]
        );
      }
      remaining = FREE_DAILY_STREAM_LIMIT - used - 1;
    }

    const session = await tx.streamSession.create({
      data: {
        userId: input.user.id,
        trackId: track.id,
        clientPlaybackId: input.clientPlaybackId,
        format: authorizedFormat,
        accessMode,
        status: StreamSessionStatus.STARTED,
        startedAt: now,
        expiresAt: new Date(now.getTime() + STREAM_SESSION_TTL_MS),
        durationSeconds: track.durationSeconds,
        ipHash: getClientIpHash(input.request),
        userAgent: input.request.headers.get("user-agent")?.slice(0, 2000) ?? null,
      },
    });
    return { session, remaining };
  });

  const access = `${authorizedFormat.toLowerCase()}-stream` as
    | "mp3-stream"
    | "wav-stream";
  const signed = createSignedMediaUrl({
    subject: input.user.id,
    trackId: track.id,
    access,
    sessionId: sessionResult.session.id,
  });

  return {
    streamUrl: signed.url,
    streamSessionId: sessionResult.session.id,
    format: authorizedFormat.toLowerCase() as "mp3" | "wav",
    accessMode: sessionResult.session.accessMode,
    remainingFreeStreams: sessionResult.remaining,
    resetsAt: sessionResult.session.accessMode === StreamAccessMode.FREE_DAILY
      ? day.end.toISOString()
      : null,
    expiresAt: signed.expiresAt.toISOString(),
  };
}

export async function recordStreamProgress(input: {
  user: AppUser;
  sessionId: string;
  positionSeconds: number;
  completed: boolean;
}) {
  const prisma = getPrisma();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.streamSession.findFirst({
      where: { id: input.sessionId, userId: input.user.id },
      include: {
        track: {
          select: { exclusiveOwnerId: true, saleStatus: true },
        },
      },
    });
    if (!session) {
      throw new ApiError(404, "stream_session_not_found", "This playback session was not found.");
    }

    const safePosition = Math.max(
      session.lastPositionSeconds,
      Math.min(Math.floor(input.positionSeconds), session.durationSeconds)
    );
    const qualificationSeconds = Math.min(
      30,
      Math.max(5, Math.ceil(session.durationSeconds * 0.5))
    );
    const qualified = input.completed || safePosition >= qualificationSeconds;
    const nextStatus = input.completed
      ? StreamSessionStatus.COMPLETED
      : qualified
        ? StreamSessionStatus.QUALIFIED
        : StreamSessionStatus.STARTED;

    const updated = await tx.streamSession.update({
      where: { id: session.id },
      data: {
        lastPositionSeconds: safePosition,
        status: nextStatus,
        ...(qualified && !session.qualifiedAt ? { qualifiedAt: now } : {}),
        ...(input.completed ? { completedAt: now } : {}),
      },
    });

    if (qualified) {
      const ownerUserId = session.track.exclusiveOwnerId;
      const isMonetizable = Boolean(
        ownerUserId &&
          ownerUserId !== input.user.id &&
          session.track.saleStatus === TrackSaleStatus.SOLD
      );
      await tx.streamEvent.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          userId: input.user.id,
          trackId: session.trackId,
          ownerUserId,
          format: session.format,
          mode: session.accessMode,
          listenedSeconds: safePosition,
          qualifiedAt: now,
          isMonetizable,
          ipHash: session.ipHash,
          userAgent: session.userAgent,
        },
        update: {
          listenedSeconds: safePosition,
          ownerUserId,
          isMonetizable,
        },
      });
    }

    return {
      sessionId: updated.id,
      status: updated.status,
      positionSeconds: updated.lastPositionSeconds,
      qualified,
    };
  });
}
