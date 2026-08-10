import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { requireAppUser } from "@/server/auth/current-user";
import { calculateTax, getTaxConfiguration, KEVAL_MERCHANT } from "@/server/commerce/tax";
import { TRACK_PRICE_PAISE } from "@/server/domain/constants";
import { currentPaymentLivemode } from "@/server/config/env";
import {
  apiJson,
  assertTrustedMutationOrigin,
  readJson,
  withApiHandler,
} from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalGstin = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/).nullable()
);

const billingProfileSchema = z
  .object({
    legalName: z.string().trim().min(2).max(160),
    addressLine1: z.string().trim().min(5).max(240),
    addressLine2: z.string().trim().max(240).optional().default(""),
    city: z.string().trim().min(2).max(120),
    stateName: z.string().trim().min(2).max(120),
    stateCode: z.string().trim().regex(/^\d{2}$/).optional().default(""),
    postalCode: z.string().trim().min(3).max(20),
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    gstin: optionalGstin,
  })
  .superRefine((value, context) => {
    if (value.countryCode === "IN" && !/^\d{2}$/.test(value.stateCode)) {
      context.addIssue({
        code: "custom",
        path: ["stateCode"],
        message: "A two-digit GST state code is required for Indian billing addresses.",
      });
    }
    if (value.gstin && value.countryCode !== "IN") {
      context.addIssue({
        code: "custom",
        path: ["gstin"],
        message: "GSTIN can be supplied only for an Indian billing address.",
      });
    }
    if (value.gstin && value.gstin.slice(0, 2) !== value.stateCode) {
      context.addIssue({
        code: "custom",
        path: ["gstin"],
        message: "The GSTIN state prefix must match the billing state code.",
      });
    }
  });

function taxSummary() {
  const quote = calculateTax(TRACK_PRICE_PAISE, "TRACK_LICENSE");
  const subscriptionConfig = getTaxConfiguration("SUBSCRIPTION");
  return {
    environment: currentPaymentLivemode() ? "live" : "test",
    merchant: KEVAL_MERCHANT,
    track: {
      advertisedPaise: TRACK_PRICE_PAISE,
      taxablePaise: quote.taxablePaise,
      taxPaise: quote.taxPaise,
      totalPaise: quote.totalPaise,
      ratePercent: quote.config.ratePercent,
      pricingMode: quote.config.pricingMode,
      sacCode: quote.config.sacCode,
    },
    subscription: {
      ratePercent: subscriptionConfig.ratePercent,
      pricingMode: subscriptionConfig.pricingMode,
      sacCode: subscriptionConfig.sacCode,
    },
    reviewedForLive:
      quote.config.reviewedForLive && subscriptionConfig.reviewedForLive,
  };
}

export const GET = withApiHandler(async (_request, _context, requestId) => {
  const user = await requireAppUser();
  const profile = await getPrisma().billingProfile.findUnique({ where: { userId: user.id } });
  return apiJson({ profile, tax: taxSummary() }, 200, requestId);
});

export const PUT = withApiHandler(async (request, _context, requestId) => {
  assertTrustedMutationOrigin(request);
  const user = await requireAppUser();
  const input = await readJson(request, billingProfileSchema);
  const profile = await getPrisma().billingProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      legalName: input.legalName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      city: input.city,
      stateName: input.stateName,
      stateCode: input.countryCode === "IN" ? input.stateCode : null,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      gstin: input.gstin,
    },
    update: {
      legalName: input.legalName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      city: input.city,
      stateName: input.stateName,
      stateCode: input.countryCode === "IN" ? input.stateCode : null,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      gstin: input.gstin,
    },
  });
  return apiJson({ profile, tax: taxSummary() }, 200, requestId);
});
