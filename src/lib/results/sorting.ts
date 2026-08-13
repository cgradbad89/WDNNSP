import type { ScoredAwardOption } from "@/lib/scoring/recommendations";

export type ResultsSortOption =
  | "best_match"
  | "fewest_points"
  | "lowest_fees"
  | "fastest";

export interface ResultsSortOptionConfig {
  value: ResultsSortOption;
  label: string;
}

// "Fastest" is included because AwardFlightOption.routeDetail.totalDurationMinutes
// (and the durationMinutes fallback) are confirmed real fields - see
// src/types/flights.ts (RouteDetail) and src/types/awards.ts.
export const RESULTS_SORT_OPTIONS: ResultsSortOptionConfig[] = [
  { value: "best_match", label: "Best match" },
  { value: "fewest_points", label: "Fewest points" },
  { value: "lowest_fees", label: "Lowest taxes/fees" },
  { value: "fastest", label: "Fastest" },
];

function getDurationMinutes(option: ScoredAwardOption): number {
  // Options with no known duration sort to the end rather than falsely
  // appearing "fastest" at 0 minutes.
  return (
    option.routeDetail?.totalDurationMinutes ??
    option.durationMinutes ??
    Number.POSITIVE_INFINITY
  );
}

function getTaxesAndFeesUsd(option: ScoredAwardOption): number {
  // Options with unreported fees sort to the end rather than falsely
  // appearing "lowest fees" at $0.
  return option.taxesAndFeesUsd ?? Number.POSITIVE_INFINITY;
}

/**
 * Reorders already-scored, already-labeled award options for display.
 * Does not touch score/recommendationLabel - those are assigned once by
 * scoreAwardOptions() against the canonical "best match" order and must
 * stay stable regardless of how the list is currently sorted for display.
 */
export function sortAwardOptions(
  options: ScoredAwardOption[],
  sort: ResultsSortOption,
): ScoredAwardOption[] {
  if (sort === "fewest_points") {
    return options.toSorted(
      (firstOption, secondOption) =>
        firstOption.pointsRequired - secondOption.pointsRequired,
    );
  }

  if (sort === "lowest_fees") {
    return options.toSorted(
      (firstOption, secondOption) =>
        getTaxesAndFeesUsd(firstOption) - getTaxesAndFeesUsd(secondOption),
    );
  }

  if (sort === "fastest") {
    return options.toSorted(
      (firstOption, secondOption) =>
        getDurationMinutes(firstOption) - getDurationMinutes(secondOption),
    );
  }

  // "best_match": no explicit sort - the incoming order (score descending,
  // set by scoreAwardOptions/applyResultsFilters) is the default ordering.
  return options;
}
