import type { ScoredAwardOption } from "@/lib/scoring/recommendations";

export const HIGH_FEE_AWARD_THRESHOLD_USD = 500;

export interface ResultsFilters {
  bookableWithAnyPoints: boolean;
  bookableWithTransferablePoints: boolean;
  maxOneStop: boolean;
  hideHighFeeAwards: boolean;
  businessCabinOnly: boolean;
  /** Hides options whose AwardFlightOption.source is "mock" rather than a
   * real provider response (e.g. "seats_aero"). Off by default. */
  liveOnly: boolean;
}

export function applyResultsFilters(
  options: ScoredAwardOption[],
  filters: ResultsFilters,
): ScoredAwardOption[] {
  return options.filter((option) => {
    if (
      filters.bookableWithAnyPoints &&
      (option.recommendationLabel === "not_enough_points" ||
        option.recommendationLabel === "not_comparable")
    ) {
      return false;
    }

    if (
      filters.bookableWithTransferablePoints &&
      (option.sufficientTransferPathCount ?? 0) < 1
    ) {
      return false;
    }

    // Unconfirmed stop count can't be proven to satisfy "max one stop", so
    // it is excluded rather than silently passed through as if it were
    // known to be <=1 stop.
    if (
      filters.maxOneStop &&
      (option.stops === undefined || option.stops > 1)
    ) {
      return false;
    }

    // Unreported fees can't be confirmed as low, so they are excluded
    // rather than silently passed through as if they were known to be $0.
    if (
      filters.hideHighFeeAwards &&
      (option.taxesAndFeesUsd === undefined ||
        option.taxesAndFeesUsd > HIGH_FEE_AWARD_THRESHOLD_USD)
    ) {
      return false;
    }

    if (filters.businessCabinOnly && option.cabin !== "business") {
      return false;
    }

    if (filters.liveOnly && option.source === "mock") {
      return false;
    }

    return true;
  });
}
