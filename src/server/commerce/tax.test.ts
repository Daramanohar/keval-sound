import { describe, expect, it } from "vitest";
import { calculateStoredTax, splitTaxInclusiveAmount } from "./tax-math";

describe("stored commerce tax", () => {
  it("keeps an inclusive advertised price unchanged", () => {
    expect(calculateStoredTax(9_900, 1_800, "inclusive")).toEqual({
      taxablePaise: 8_390,
      taxPaise: 1_510,
      totalPaise: 9_900,
    });
  });

  it("adds tax to an exclusive advertised price", () => {
    expect(calculateStoredTax(9_900, 1_800, "exclusive")).toEqual({
      taxablePaise: 9_900,
      taxPaise: 1_782,
      totalPaise: 11_682,
    });
  });

  it("supports tax-free stored subscriptions", () => {
    expect(calculateStoredTax(4_900, 0, "none")).toEqual({
      taxablePaise: 4_900,
      taxPaise: 0,
      totalPaise: 4_900,
    });
  });

  it("reverses an inclusive amount consistently", () => {
    expect(splitTaxInclusiveAmount(999, 1_800)).toEqual({
      taxablePaise: 847,
      taxPaise: 152,
      totalPaise: 999,
    });
  });
});
