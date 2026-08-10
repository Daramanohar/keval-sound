import { PaymentProvider } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAppUser } from "@/server/auth/current-user";
import { currentPaymentLivemode } from "@/server/config/env";
import { apiJson, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  const rows = await getPrisma().subscriptionPayment.findMany({
    where: {
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: currentPaymentLivemode(),
      subscription: { userId: user.id },
    },
    orderBy: { paidAt: "desc" },
    take: 100,
    select: {
      id: true,
      invoiceNumber: true,
      amountPaise: true,
      taxableAmountPaise: true,
      taxPaise: true,
      currency: true,
      status: true,
      paidAt: true,
      subscription: {
        select: {
          plan: { select: { code: true, name: true } },
        },
      },
    },
  });
  return apiJson(
    {
      payments: rows.map((row) => ({
        ...row,
        paidAt: row.paidAt.toISOString(),
        invoiceUrl: `/api/account/billing/invoices/${row.id}`,
      })),
    },
    200,
    requestId
  );
});
