import { PaymentProvider } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAppUser } from "@/server/auth/current-user";
import { currentPaymentLivemode } from "@/server/config/env";
import { generateInvoice, invoiceFilename } from "@/server/documents/invoice-pdf";
import { ApiError, withApiHandler } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InvoiceRouteContext = {
  params: Promise<{ paymentId: string }>;
};

export const GET = withApiHandler<InvoiceRouteContext>(async (_request, context) => {
  const user = await requireAppUser();
  const { paymentId } = await context.params;
  const payment = await getPrisma().subscriptionPayment.findFirst({
    where: {
      id: paymentId,
      provider: PaymentProvider.RAZORPAY,
      providerLivemode: currentPaymentLivemode(),
      subscription: { userId: user.id },
    },
    include: {
      subscription: {
        include: {
          plan: { select: { code: true, name: true } },
          user: {
            select: {
              kevalUserId: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
  if (!payment) {
    throw new ApiError(404, "invoice_not_found", "The subscription invoice was not found.");
  }

  const rawAddress = payment.subscription.billingAddressSnapshot;
  const snapshot =
    rawAddress && typeof rawAddress === "object" && !Array.isArray(rawAddress)
      ? (rawAddress as Record<string, unknown>)
      : null;
  const billingAddress = snapshot
    ? {
        addressLine1: String(snapshot.addressLine1 || ""),
        addressLine2: snapshot.addressLine2 ? String(snapshot.addressLine2) : null,
        city: String(snapshot.city || ""),
        stateName: String(snapshot.stateName || ""),
        stateCode: snapshot.stateCode ? String(snapshot.stateCode) : null,
        postalCode: String(snapshot.postalCode || ""),
        countryCode: String(snapshot.countryCode || "IN"),
      }
    : null;
  const accountName = [
    payment.subscription.user.firstName,
    payment.subscription.user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const customerName = snapshot?.legalName
    ? String(snapshot.legalName)
    : accountName || payment.subscription.user.kevalUserId;
  const generated = await generateInvoice({
    invoiceNumber: payment.invoiceNumber,
    orderNumber: payment.subscription.providerSubscriptionId,
    issuedAt: payment.paidAt,
    paymentProvider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    customerName,
    customerEmail: payment.subscription.user.email,
    billingAddress,
    customerGstin: payment.subscription.customerGstinSnapshot,
    placeOfSupplyCode: payment.subscription.placeOfSupplyCode,
    kevalUserId: payment.subscription.user.kevalUserId,
    currency: payment.currency,
    subtotalPaise: payment.taxableAmountPaise,
    taxPaise: payment.taxPaise,
    totalPaise: payment.amountPaise,
    taxRateBps: payment.subscription.taxRateBps,
    taxMode: payment.subscription.taxMode,
    sacCode: payment.subscription.sacCode,
    providerLivemode: payment.providerLivemode,
    items: [
      {
        title: `${payment.subscription.plan.name} monthly subscription`,
        licenseNumber: payment.subscription.plan.code,
        unitAmountPaise: payment.taxableAmountPaise,
        taxPaise: payment.taxPaise,
        totalPaise: payment.amountPaise,
      },
    ],
  });
  return new Response(Buffer.from(generated.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceFilename(payment.invoiceNumber)}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
});
