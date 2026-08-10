import "server-only";

import {
  AuditActorType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  StreamSessionStatus,
  TrackSaleStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";

const RELEASABLE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.CHECKOUT_PENDING,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.EXPIRED,
  OrderStatus.CANCELLED,
]);

export async function cleanupExpiredCommerceState(input?: {
  now?: Date;
  batchSize?: number;
}) {
  const prisma = getPrisma();
  const now = input?.now ?? new Date();
  const batchSize = Math.min(Math.max(input?.batchSize ?? 100, 1), 500);
  const candidates = await prisma.inventoryReservation.findMany({
    where: { expiresAt: { lte: now } },
    orderBy: { expiresAt: "asc" },
    distinct: ["orderId"],
    take: batchSize,
    select: { orderId: true },
  });

  let releasedOrders = 0;
  let releasedTracks = 0;

  for (const candidate of candidates) {
    const released = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.orderId}))`;
        const order = await tx.order.findUnique({
          where: { id: candidate.orderId },
          include: { inventoryReservations: true },
        });
        if (!order || !RELEASABLE_ORDER_STATUSES.has(order.status)) {
          return { order: false, tracks: 0 };
        }

        // Reservations for one order share a deadline. If any remain valid, defer
        // cleanup rather than partially releasing an exclusive checkout.
        if (order.inventoryReservations.some((reservation) => reservation.expiresAt > now)) {
          return { order: false, tracks: 0 };
        }

        const trackIds = order.inventoryReservations.map((reservation) => reservation.trackId);
        if (trackIds.length === 0) return { order: false, tracks: 0 };

        await tx.inventoryReservation.deleteMany({ where: { orderId: order.id } });
        const tracks = await tx.track.updateMany({
          where: {
            id: { in: trackIds },
            saleStatus: TrackSaleStatus.RESERVED,
          },
          data: {
            saleStatus: TrackSaleStatus.AVAILABLE,
            version: { increment: 1 },
          },
        });
        await tx.payment.updateMany({
          where: {
            orderId: order.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          },
          data: { status: PaymentStatus.CANCELLED },
        });
        if (
          order.status === OrderStatus.DRAFT ||
          order.status === OrderStatus.CHECKOUT_PENDING
        ) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.EXPIRED },
          });
        }
        await tx.auditLog.create({
          data: {
            actorType: AuditActorType.SYSTEM,
            action: "checkout.reservation_expired",
            targetType: "order",
            targetId: order.id,
            metadata: {
              previousStatus: order.status,
              releasedTrackCount: tracks.count,
              expiredAt: now.toISOString(),
            },
          },
        });
        return { order: true, tracks: tracks.count };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (released.order) releasedOrders += 1;
    releasedTracks += released.tracks;
  }

  const [idempotencyRecords, streamSessions] = await prisma.$transaction([
    prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.streamSession.updateMany({
      where: {
        expiresAt: { lte: now },
        status: {
          in: [StreamSessionStatus.RESERVED, StreamSessionStatus.STARTED],
        },
      },
      data: { status: StreamSessionStatus.EXPIRED },
    }),
  ]);

  return {
    processedAt: now.toISOString(),
    candidateOrders: candidates.length,
    releasedOrders,
    releasedTracks,
    deletedIdempotencyRecords: idempotencyRecords.count,
    expiredStreamSessions: streamSessions.count,
    hasMore: candidates.length === batchSize,
  };
}
