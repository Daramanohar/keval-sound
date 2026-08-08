import "server-only";

import crypto from "node:crypto";
import { AuditActorType, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { getOptionalAuditIpSecret } from "@/server/config/env";

function getClientIp(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}

export function getClientIpHash(request: Request) {
  const ip = getClientIp(request);
  const secret = getOptionalAuditIpSecret();
  if (!ip || !secret) return null;
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

type AuditInput = {
  actorType?: AuditActorType;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  requestId?: string | null;
  ipHash?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput) {
  await getPrisma().auditLog.create({
    data: {
      actorType: input.actorType ?? AuditActorType.SYSTEM,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      requestId: input.requestId ?? null,
      ipHash: input.ipHash ?? null,
      metadata: input.metadata,
    },
  });
}
