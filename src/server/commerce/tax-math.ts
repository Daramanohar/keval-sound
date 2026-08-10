export type TaxPricingMode = "inclusive" | "exclusive";

export function splitTaxInclusiveAmount(totalPaise: number, rateBps: number) {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error("The charged amount must be a non-negative integer in paise.");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new Error("The stored tax rate must be between 0 and 10000 basis points.");
  }
  if (rateBps === 0) {
    return { taxablePaise: totalPaise, taxPaise: 0, totalPaise };
  }
  const taxablePaise = Math.round((totalPaise * 10_000) / (10_000 + rateBps));
  return {
    taxablePaise,
    taxPaise: totalPaise - taxablePaise,
    totalPaise,
  };
}

export function calculateStoredTax(
  advertisedAmountPaise: number,
  rateBps: number,
  mode: TaxPricingMode | "none"
) {
  if (!Number.isInteger(advertisedAmountPaise) || advertisedAmountPaise < 0) {
    throw new Error("The advertised amount must be a non-negative integer in paise.");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new Error("The stored tax rate must be between 0 and 10000 basis points.");
  }

  if (rateBps === 0 || mode === "none") {
    return {
      taxablePaise: advertisedAmountPaise,
      taxPaise: 0,
      totalPaise: advertisedAmountPaise,
    };
  }

  if (mode === "inclusive") {
    return splitTaxInclusiveAmount(advertisedAmountPaise, rateBps);
  }

  const taxPaise = Math.round((advertisedAmountPaise * rateBps) / 10_000);
  return {
    taxablePaise: advertisedAmountPaise,
    taxPaise,
    totalPaise: advertisedAmountPaise + taxPaise,
  };
}
