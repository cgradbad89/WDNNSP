import type { ScoredAwardOption } from "@/lib/scoring/recommendations";

export const HIGH_FEE_AWARD_THRESHOLD_USD = 500;

export interface ResultsFilters {
  bookableWithAnyPoints: boolean;
  bookableWithTransferablePoints: boolean;
  maxOneStop: boolean;
  hideHighFeeAwards: boolean;
  businessCabinOnly: boolean;
}

export function applyResultsFilters(
  options: ScoredAwardOption[],
  filters: ResultsFilters,
): ScoredAwardOption[] {
  return options.filter((option) => {
    if (
      filters.bookableWithAnyPoints &&
      option.recommendationLabel === "not_enough_points"
    ) {
      return false;
    }

    if (
      filters.bookableWithTransferablePoints &&
      (option.sufficientTransferPathCount ?? 0) < 1
    ) {
      return false;
    }

    if (filters.maxOneStop && option.stops > 1) {
      return false;
    }

    if (
      filters.hideHighFeeAwards &&
      option.taxesAndFeesUsd > HIGH_FEE_AWARD_THRESHOLD_USD
    ) {
      return false;
    }

    if (filters.businessCabinOnly && option.cabin !== "business") {
      return false;
    }

    return true;
  });
}
