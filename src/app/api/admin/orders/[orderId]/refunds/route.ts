import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireUserRole } from "@/server/auth/current-user";
import { requestFullOrderRefund } from "@/server/commerce/refunds";
import {
  apiJson,
  assertTrustedMutationOrigin,
  readJson,
  withApiHandler,
} from "@/server/http/api";
import { requireIdempotencyKey } from "@/server/security/idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RefundRouteContext = {
  params: Promise<{ orderId: string }>;
};

const refundSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const POST = withApiHandler<RefundRouteContext>(
  async (request, context, requestId) => {
    assertTrustedMutationOrigin(request);
    const actor = await requireUserRole([UserRole.FINANCE, UserRole.ADMIN]);
    const { orderId } = await context.params;
    const { reason } = await readJson(request, refundSchema);
    const refund = await requestFullOrderRefund({
      actor,
      orderId,
      reason,
      rawIdempotencyKey: requireIdempotencyKey(request),
    });
    return apiJson(refund, refund.status === "PENDING" ? 202 : 200, requestId);
  }
);
