export type AwardVerificationStatus =
  | "not_verified"
  | "provider_reported"
  | "manually_verified"
  | "price_changed"
  | "no_longer_available"
  | "verification_failed";

export type ManualCashInput = {
  amountUsd: number;
  source: "manual";
  note?: string;
  updatedAt: string;
};

export type ManualAwardVerificationInput = {
  awardOptionId: string;
  status: AwardVerificationStatus;
  verifiedPointsRequired?: number;
  verifiedTaxesAndFeesUsd?: number;
  note?: string;
  updatedAt: string;
};

export type ManualValueValidationReason =
  | "required"
  | "not_numeric"
  | "must_be_positive"
  | "must_be_non_negative";

export type ManualValueValidationResult =
  | { ok: true; value: number }
  | {
      ok: false;
      reason: ManualValueValidationReason;
      message: string;
    };

export type ManualCppUnavailableReason =
  | "cash_fare_missing"
  | "cash_fare_invalid"
  | "points_missing"
  | "points_invalid"
  | "taxes_and_fees_missing"
  | "taxes_and_fees_invalid"
  | "no_longer_available"
  | "verification_failed";

export type ManualEstimatedCpp =
  | {
      status: "available";
      source: "manual_estimate";
      centsPerPoint: number;
      usesManualCash: boolean;
      usesManualPoints: boolean;
      usesManualTaxes: boolean;
      reasons: [];
    }
  | {
      status: "unavailable";
      source: "manual_estimate";
      usesManualCash: boolean;
      usesManualPoints: boolean;
      usesManualTaxes: boolean;
      reasons: ManualCppUnavailableReason[];
    };

export interface AwardVerificationState {
  manualCashFare?: ManualCashInput;
  awards: Record<string, ManualAwardVerificationInput>;
}
