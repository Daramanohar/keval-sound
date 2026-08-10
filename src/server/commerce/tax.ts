import "server-only";

import { currentPaymentLivemode } from "@/server/config/env";
import { ApiError } from "@/server/http/api";
import type { TaxPricingMode } from "./tax-math";

export {
  calculateStoredTax,
  splitTaxInclusiveAmount,
  type TaxPricingMode,
} from "./tax-math";

export type TaxCategory = "TRACK_LICENSE" | "SUBSCRIPTION";

export const KEVAL_MERCHANT = {
  legalName: "KEVAL SOUND",
  gstin: "29ACWPZ8257G1ZD",
  addressLine1: "1ST CROSS, HORAPET, AZAD NAGAR",
  city: "CHITRADURGA",
  stateName: "KARNATAKA",
  stateCode: "29",
  postalCode: "577501",
  countryCode: "IN",
} as const;

const DEFAULT_QA_GST_RATE_BPS = 1_800;
const DEFAULT_TRACK_SAC = "997332";
const DEFAULT_SUBSCRIPTION_SAC = "998439";
const TAX_CONFIG_VERSION = "keval-gst-2026-08";

function integerEnvironment(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new Error(`${name} must be an integer between 0 and 10000 basis points.`);
  }
  return parsed;
}

function pricingMode(): TaxPricingMode {
  const value = process.env.KEVAL_TAX_PRICING_MODE?.trim().toLowerCase();
  if (!value) return "inclusive";
  if (value !== "inclusive" && value !== "exclusive") {
    throw new Error("KEVAL_TAX_PRICING_MODE must be either inclusive or exclusive.");
  }
  return value;
}

function sacCode(category: TaxCategory) {
  const raw = (
    category === "TRACK_LICENSE"
      ? process.env.KEVAL_TRACK_SAC_CODE
      : process.env.KEVAL_SUBSCRIPTION_SAC_CODE
  )?.trim();
  const fallback = category === "TRACK_LICENSE" ? DEFAULT_TRACK_SAC : DEFAULT_SUBSCRIPTION_SAC;
  const value = raw || fallback;
  if (!/^\d{2,8}$/.test(value)) {
    throw new Error(`The ${category} SAC code must contain 2 to 8 digits.`);
  }
  return value;
}

export function getTaxConfiguration(category: TaxCategory) {
  const rateBps = integerEnvironment("KEVAL_GST_RATE_BPS", DEFAULT_QA_GST_RATE_BPS);
  const reviewedForLive = process.env.KEVAL_TAX_CONFIG_REVIEWED === "true";
  return {
    category,
    rateBps,
    ratePercent: rateBps / 100,
    pricingMode: pricingMode(),
    sacCode: sacCode(category),
    version: TAX_CONFIG_VERSION,
    reviewedForLive,
    merchant: KEVAL_MERCHANT,
  } as const;
}

export function assertTaxConfigurationReady(category: TaxCategory) {
  const config = getTaxConfiguration(category);
  if (currentPaymentLivemode() && !config.reviewedForLive) {
    throw new ApiError(
      503,
      "tax_configuration_review_required",
      "Live checkout is paused until KEVAL SOUND confirms its GST rate, SAC code, and tax-inclusive or tax-exclusive pricing with its tax professional."
    );
  }
  return config;
}

export function calculateTax(advertisedAmountPaise: number, category: TaxCategory) {
  if (!Number.isInteger(advertisedAmountPaise) || advertisedAmountPaise < 0) {
    throw new Error("The advertised amount must be a non-negative integer in paise.");
  }

  const config = getTaxConfiguration(category);
  if (config.rateBps === 0) {
    return {
      taxablePaise: advertisedAmountPaise,
      taxPaise: 0,
      totalPaise: advertisedAmountPaise,
      config,
    };
  }

  if (config.pricingMode === "inclusive") {
    const taxablePaise = Math.round(
      (advertisedAmountPaise * 10_000) / (10_000 + config.rateBps)
    );
    return {
      taxablePaise,
      taxPaise: advertisedAmountPaise - taxablePaise,
      totalPaise: advertisedAmountPaise,
      config,
    };
  }

  const taxPaise = Math.round((advertisedAmountPaise * config.rateBps) / 10_000);
  return {
    taxablePaise: advertisedAmountPaise,
    taxPaise,
    totalPaise: advertisedAmountPaise + taxPaise,
    config,
  };
}

export function taxBreakdown(taxPaise: number, customerCountryCode: string, stateCode: string | null) {
  const domestic = customerCountryCode.toUpperCase() === KEVAL_MERCHANT.countryCode;
  const intrastate = domestic && stateCode === KEVAL_MERCHANT.stateCode;
  if (intrastate) {
    const cgstPaise = Math.floor(taxPaise / 2);
    return {
      kind: "CGST_SGST" as const,
      cgstPaise,
      sgstPaise: taxPaise - cgstPaise,
      igstPaise: 0,
    };
  }
  return {
    kind: "IGST" as const,
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: taxPaise,
  };
}
