import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import type { AwardFlightOption } from "@/types/awards";
import type {
  ComparabilityReason,
  ComparabilityResult,
  ComparisonMetadata,
} from "@/types/comparison";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

const BOOKABLE_AVAILABILITY = new Set(["available", "limited"]);

function addReason(
  reasons: Set<ComparabilityReason>,
  reason: ComparabilityReason,
): void {
  reasons.add(reason);
}

function hasLimitation(option: { limitations?: { code: string }[] }, code: string): boolean {
  return option.limitations?.some((limitation) => limitation.code === code) ?? false;
}

function getComparisonMetadata(
  search: SavedSearch,
  option: { comparison?: ComparisonMetadata },
): ComparisonMetadata {
  return {
    searchFingerprint: createSearchFingerprint(search),
    tripType: search.tripType,
    passengerCount: Math.max(1, search.passengers),
    ...option.comparison,
  };
}

function isAwardBookable(awardOption: AwardFlightOption): boolean {
  const status =
    awardOption.availabilityStatus ??
    awardOption.comparison?.availabilityStatus ??
    "unknown";

  return BOOKABLE_AVAILABILITY.has(status);
}

export function getCashAwardComparability({
  awardOption,
  cashOption,
  search,
}: {
  awardOption: AwardFlightOption;
  cashOption: CashFlightOption;
  search: SavedSearch;
}): ComparabilityResult {
  const reasons = new Set<ComparabilityReason>();
  const fingerprint = createSearchFingerprint(search);
  const cashComparison = getComparisonMetadata(search, cashOption);
  const awardComparison = getComparisonMetadata(search, awardOption);

  if (cashComparison.searchFingerprint !== fingerprint) {
    addReason(reasons, "unknown_itinerary_relationship");
  }

  if (awardComparison.searchFingerprint !== fingerprint) {
    addReason(reasons, "unknown_itinerary_relationship");
  }

  if (cashComparison.tripType !== search.tripType) {
    addReason(reasons, "trip_type_mismatch");
  }

  if (awardComparison.tripType !== search.tripType) {
    addReason(reasons, "trip_type_mismatch");
  }

  if (search.tripType === "round_trip" && !search.returnDate) {
    addReason(reasons, "return_date_missing");
  }

  if (awardOption.departureDateTime.slice(0, 10) !== search.departDate) {
    addReason(reasons, "date_mismatch");
  }

  if (cashOption.departureDateTime.slice(0, 10) !== search.departDate) {
    addReason(reasons, "date_mismatch");
  }

  if (
    cashComparison.passengerCount !== Math.max(1, search.passengers) ||
    awardComparison.passengerCount !== Math.max(1, search.passengers)
  ) {
    addReason(reasons, "passenger_mismatch");
  }

  if (
    awardOption.cabin !== search.cabin ||
    cashOption.cabin !== search.cabin ||
    awardComparison.cabin !== search.cabin ||
    cashComparison.cabin !== search.cabin ||
    awardComparison.cabinConfirmed === false ||
    cashComparison.cabinConfirmed === false
  ) {
    addReason(reasons, "cabin_mismatch");
  }

  if (awardOption.taxesAndFeesUsd === undefined) {
    addReason(reasons, "unknown_award_fees");
  }

  if (!Number.isFinite(cashOption.cashPriceUsd)) {
    addReason(reasons, "missing_cash_price");
  }

  if (
    !Number.isFinite(awardOption.pointsRequired) ||
    awardOption.pointsRequired <= 0
  ) {
    addReason(reasons, "missing_award_points");
  }

  if (!awardOption.sourceProgramId) {
    addReason(reasons, "unresolved_program");
  }

  if (!isAwardBookable(awardOption)) {
    addReason(reasons, "availability_not_bookable");
  }

  if (
    cashComparison.isBenchmarkOnly === true ||
    awardComparison.isBenchmarkOnly === true ||
    hasLimitation(cashOption, "provider_benchmark_only") ||
    hasLimitation(awardOption, "provider_benchmark_only")
  ) {
    addReason(reasons, "provider_benchmark_only");
  }

  if (
    cashComparison.isExactDateComparable === false ||
    awardComparison.isExactDateComparable === false
  ) {
    addReason(reasons, "unknown_itinerary_relationship");
  }

  const reasonList = Array.from(reasons);

  return {
    status: reasonList.length === 0 ? "comparable" : "not_comparable",
    reasons: reasonList,
  };
}

export function isEligibleForBookableRecommendation(
  awardOption: AwardFlightOption,
): boolean {
  return isAwardBookable(awardOption);
}
