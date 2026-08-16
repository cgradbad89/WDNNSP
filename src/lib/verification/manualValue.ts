import type { AwardFlightOption } from "@/types/awards";
import type {
  AwardVerificationStatus,
  ManualAwardVerificationInput,
  ManualCashInput,
  ManualCppUnavailableReason,
  ManualEstimatedCpp,
  ManualValueValidationResult,
} from "@/types/verification";

function validateNumber(
  input: unknown,
  positive: boolean,
): ManualValueValidationResult {
  if (input === undefined || input === null || input === "") {
    return {
      ok: false,
      reason: "required",
      message: "Enter a value before saving.",
    };
  }

  const value =
    typeof input === "number"
      ? input
      : typeof input === "string" && input.trim() !== ""
        ? Number(input)
        : NaN;

  if (!Number.isFinite(value)) {
    return {
      ok: false,
      reason: "not_numeric",
      message: "Enter a numeric value.",
    };
  }

  if (positive && value <= 0) {
    return {
      ok: false,
      reason: "must_be_positive",
      message: "Value must be greater than zero.",
    };
  }

  if (!positive && value < 0) {
    return {
      ok: false,
      reason: "must_be_non_negative",
      message: "Value cannot be negative.",
    };
  }

  return { ok: true, value };
}

export function validateManualCashFare(
  input: unknown,
): ManualValueValidationResult {
  return validateNumber(input, true);
}

export function validateManualTaxesAndFees(
  input: unknown,
): ManualValueValidationResult {
  return validateNumber(input, false);
}

export function validateManualPoints(
  input: unknown,
): ManualValueValidationResult {
  return validateNumber(input, true);
}

function getValidManualValue(
  input: unknown,
  validator: (value: unknown) => ManualValueValidationResult,
): number | undefined {
  const validation = validator(input);
  return validation.ok ? validation.value : undefined;
}

export interface EffectiveManualValue {
  value?: number;
  source: "manual" | "provider" | "unknown";
}

export function getEffectivePointsRequired(
  awardOption: Pick<AwardFlightOption, "pointsRequired">,
  verification?: ManualAwardVerificationInput,
): EffectiveManualValue {
  const manualPoints = getValidManualValue(
    verification?.verifiedPointsRequired,
    validateManualPoints,
  );

  if (manualPoints !== undefined) {
    return { value: manualPoints, source: "manual" };
  }

  const providerPoints = getValidManualValue(
    awardOption.pointsRequired,
    validateManualPoints,
  );

  return providerPoints === undefined
    ? { source: "unknown" }
    : { value: providerPoints, source: "provider" };
}

export function getEffectiveTaxesAndFees(
  awardOption: Pick<AwardFlightOption, "taxesAndFeesUsd">,
  verification?: ManualAwardVerificationInput,
): EffectiveManualValue {
  const manualTaxes = getValidManualValue(
    verification?.verifiedTaxesAndFeesUsd,
    validateManualTaxesAndFees,
  );

  if (manualTaxes !== undefined) {
    return { value: manualTaxes, source: "manual" };
  }

  const providerTaxes = getValidManualValue(
    awardOption.taxesAndFeesUsd,
    validateManualTaxesAndFees,
  );

  return providerTaxes === undefined
    ? { source: "unknown" }
    : { value: providerTaxes, source: "provider" };
}

function getEffectiveCashFare(
  providerCashFareUsd: unknown,
  manualCashFare?: ManualCashInput,
): EffectiveManualValue {
  const manualCash = getValidManualValue(
    manualCashFare?.amountUsd,
    validateManualCashFare,
  );

  if (manualCash !== undefined) {
    return { value: manualCash, source: "manual" };
  }

  const providerCash = getValidManualValue(
    providerCashFareUsd,
    validateManualCashFare,
  );

  return providerCash === undefined
    ? { source: "unknown" }
    : { value: providerCash, source: "provider" };
}

export function isManualVerificationExcluded(
  status: AwardVerificationStatus | undefined,
): boolean {
  return status === "no_longer_available" || status === "verification_failed";
}

export function calculateManualEstimatedCpp({
  awardOption,
  manualCashFare,
  providerCashFareUsd,
  verification,
}: {
  awardOption: Pick<AwardFlightOption, "pointsRequired" | "taxesAndFeesUsd">;
  manualCashFare?: ManualCashInput;
  providerCashFareUsd?: number;
  verification?: ManualAwardVerificationInput;
}): ManualEstimatedCpp {
  const status = verification?.status;
  const cash = getEffectiveCashFare(providerCashFareUsd, manualCashFare);
  const points = getEffectivePointsRequired(awardOption, verification);
  const taxesAndFees = getEffectiveTaxesAndFees(awardOption, verification);
  const reasons: ManualCppUnavailableReason[] = [];

  if (status === "no_longer_available") {
    reasons.push("no_longer_available");
  } else if (status === "verification_failed") {
    reasons.push("verification_failed");
  }

  if (cash.value === undefined) {
    reasons.push("cash_fare_missing");
  } else if (cash.source === "unknown") {
    reasons.push("cash_fare_invalid");
  }

  if (points.value === undefined) {
    reasons.push("points_missing");
  } else if (points.source === "unknown") {
    reasons.push("points_invalid");
  }

  if (taxesAndFees.value === undefined) {
    reasons.push("taxes_and_fees_missing");
  } else if (taxesAndFees.source === "unknown") {
    reasons.push("taxes_and_fees_invalid");
  }

  const usesManualCash = cash.source === "manual";
  const usesManualPoints = points.source === "manual";
  const usesManualTaxes = taxesAndFees.source === "manual";

  if (reasons.length > 0) {
    return {
      status: "unavailable",
      source: "manual_estimate",
      usesManualCash,
      usesManualPoints,
      usesManualTaxes,
      reasons,
    };
  }

  return {
    status: "available",
    source: "manual_estimate",
    centsPerPoint:
      Math.round(
        (((cash.value as number) - (taxesAndFees.value as number)) /
          (points.value as number)) *
          1000,
      ) / 10,
    usesManualCash,
    usesManualPoints,
    usesManualTaxes,
    reasons: [],
  };
}
