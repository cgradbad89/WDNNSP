import { describe, expect, it } from "vitest";
import {
  calculateManualEstimatedCpp,
  getEffectivePointsRequired,
  getEffectiveTaxesAndFees,
  validateManualCashFare,
  validateManualPoints,
  validateManualTaxesAndFees,
} from "@/lib/verification/manualValue";
import type { ManualAwardVerificationInput, ManualCashInput } from "@/types/verification";

const manualCashFare: ManualCashInput = {
  amountUsd: 5200,
  source: "manual",
  updatedAt: "2026-08-16T00:00:00.000Z",
};

const verification: ManualAwardVerificationInput = {
  awardOptionId: "award-1",
  status: "price_changed",
  verifiedTaxesAndFeesUsd: 120,
  updatedAt: "2026-08-16T00:00:00.000Z",
};

describe("manual verification value helpers", () => {
  it("accepts a valid positive manual cash fare", () => {
    expect(validateManualCashFare("1250.50")).toEqual({
      ok: true,
      value: 1250.5,
    });
  });

  it.each(["", "0", "-10", "not-a-number"])(
    "rejects invalid manual cash fare %s",
    (value) => {
      expect(validateManualCashFare(value).ok).toBe(false);
    },
  );

  it("accepts zero fees and rejects negative fees", () => {
    expect(validateManualTaxesAndFees("0")).toEqual({ ok: true, value: 0 });
    expect(validateManualTaxesAndFees("-1").ok).toBe(false);
  });

  it("requires positive verified points", () => {
    expect(validateManualPoints("90000")).toEqual({ ok: true, value: 90000 });
    expect(validateManualPoints("0").ok).toBe(false);
    expect(validateManualPoints("nope").ok).toBe(false);
  });

  it("prefers valid manual points and fees over provider values", () => {
    const award = { pointsRequired: 100000, taxesAndFeesUsd: 250 };

    expect(getEffectivePointsRequired(award, {
      ...verification,
      verifiedPointsRequired: 95000,
    })).toEqual({ value: 95000, source: "manual" });
    expect(getEffectiveTaxesAndFees(award, verification)).toEqual({
      value: 120,
      source: "manual",
    });
  });

  it("falls back to provider values when manual overrides are invalid or absent", () => {
    const award = { pointsRequired: 100000, taxesAndFeesUsd: 250 };

    expect(getEffectivePointsRequired(award, {
      ...verification,
      verifiedPointsRequired: 0,
    })).toEqual({ value: 100000, source: "provider" });
    expect(getEffectiveTaxesAndFees(award)).toEqual({
      value: 250,
      source: "provider",
    });
  });

  it("calculates manual CPP from manual cash, provider points, and manual fees", () => {
    const result = calculateManualEstimatedCpp({
      awardOption: { pointsRequired: 100000, taxesAndFeesUsd: undefined },
      manualCashFare,
      verification,
    });

    expect(result).toMatchObject({
      status: "available",
      centsPerPoint: 5.1,
      usesManualCash: true,
      usesManualPoints: false,
      usesManualTaxes: true,
    });
  });

  it("calculates manual CPP from manual cash, manual points, and manual fees", () => {
    const result = calculateManualEstimatedCpp({
      awardOption: { pointsRequired: 100000, taxesAndFeesUsd: undefined },
      manualCashFare,
      verification: {
        ...verification,
        verifiedPointsRequired: 90000,
      },
    });

    expect(result).toMatchObject({
      status: "available",
      centsPerPoint: 5.6,
      usesManualCash: true,
      usesManualPoints: true,
      usesManualTaxes: true,
    });
  });

  it("does not calculate CPP while taxes are unknown", () => {
    const result = calculateManualEstimatedCpp({
      awardOption: { pointsRequired: 100000, taxesAndFeesUsd: undefined },
      manualCashFare,
    });

    expect(result).toMatchObject({
      status: "unavailable",
      reasons: ["taxes_and_fees_missing"],
    });
  });

  it.each([
    "no_longer_available",
    "verification_failed",
  ] as const)("does not calculate CPP for %s awards", (status) => {
    const result = calculateManualEstimatedCpp({
      awardOption: { pointsRequired: 100000, taxesAndFeesUsd: 100 },
      manualCashFare,
      verification: { ...verification, status },
    });

    expect(result.status).toBe("unavailable");
    expect(result.reasons).toContain(status);
  });

  it("does not overwrite provider-backed CPP data", () => {
    const award = {
      pointsRequired: 100000,
      taxesAndFeesUsd: 100,
      centsPerPoint: 4.2,
    };

    calculateManualEstimatedCpp({
      awardOption: award,
      manualCashFare,
      verification,
    });

    expect(award.centsPerPoint).toBe(4.2);
  });
});
