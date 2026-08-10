import "server-only";

import crypto from "node:crypto";
import { Prisma, WebhookProvider, WebhookStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  canClaimWebhookDelivery,
  WEBHOOK_PROCESSING_LEASE_MS,
} from "@/server/payments/webhook-lease";

export async function claimWebhook(input: {
  provider: WebhookProvider;
  providerEventId: string;
  providerLivemode: boolean | null;
  eventType: string;
  objectId: string | null;
  rawPayload: string;
}) {
  const prisma = getPrisma();
  const payloadHash = crypto.createHash("sha256").update(input.rawPayload).digest("hex");

  try {
    const record = await prisma.webhookEvent.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerLivemode: input.providerLivemode,
        eventType: input.eventType,
        objectId: input.objectId,
        payloadHash,
        status: WebhookStatus.PROCESSING,
        attempts: 1,
      },
      select: { id: true },
    });
    return { shouldProcess: true as const, recordId: record.id };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: input.provider,
        providerEventId: input.providerEventId,
      },
    },
  });
  if (!existing) throw new Error("Webhook idempotency record disappeared.");
  if (
    existing.payloadHash !== payloadHash ||
    existing.providerLivemode !== input.providerLivemode
  ) {
    throw new Error("Webhook identity collision detected.");
  }
  const now = new Date();
  if (
    !canClaimWebhookDelivery({
      status: existing.status,
      updatedAt: existing.updatedAt,
      now,
    })
  ) {
    return { shouldProcess: false as const, recordId: existing.id };
  }

  const reclaimed = await prisma.webhookEvent.updateMany({
    where: {
      id: existing.id,
      OR: [
        { status: { in: [WebhookStatus.RECEIVED, WebhookStatus.FAILED] } },
        {
          status: WebhookStatus.PROCESSING,
          updatedAt: {
            lte: new Date(now.getTime() - WEBHOOK_PROCESSING_LEASE_MS),
          },
        },
      ],
    },
    data: {
      status: WebhookStatus.PROCESSING,
      attempts: { increment: 1 },
      lastError: null,
      processedAt: null,
    },
  });
  if (reclaimed.count !== 1) {
    return { shouldProcess: false as const, recordId: existing.id };
  }
  return { shouldProcess: true as const, recordId: existing.id };
}

export async function completeWebhookEvent(
  recordId: string,
  status: Extract<WebhookStatus, "PROCESSED" | "IGNORED">
) {
  await getPrisma().webhookEvent.update({
    where: { id: recordId },
    data: { status, processedAt: new Date(), lastError: null },
  });
}

export async function failWebhookEvent(recordId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown webhook processing failure";
  await getPrisma().webhookEvent.update({
    where: { id: recordId },
    data: { status: WebhookStatus.FAILED, lastError: message.slice(0, 4000) },
  });
}
