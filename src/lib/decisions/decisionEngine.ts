import {
  DEFAULT_POINT_VALUATIONS,
  FALLBACK_POINT_VALUATION_CENTS,
} from "@/data/pointValuations";
import type {
  DecisionLabel,
  DecisionOption,
  DecisionResultSet,
  DecisionScoreBreakdown,
  PointValuation,
} from "@/types/decisions";
import type { ComparabilityStatus } from "@/types/comparison";
import type {
  ScoredAwardOption,
  ScoredCashOption,
} from "@/lib/scoring/recommendations";
import type { SavedSearch } from "@/types/search";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("en-US");

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasLimitation(
  option: { limitations?: { code: string }[] },
  code: string,
): boolean {
  return option.limitations?.some((limitation) => limitation.code === code) ?? false;
}

function getValuationForProgram(
  programId: string | undefined,
  valuations: PointValuation[],
): PointValuation {
  return (
    valuations.find((valuation) => valuation.programId === programId) ?? {
      programId: programId ?? "unknown-program",
      centsPerPoint: FALLBACK_POINT_VALUATION_CENTS,
      source: "default",
    }
  );
}

function getCashConfidenceScore(cashOption: ScoredCashOption): number {
  if (cashOption.freshness?.isStale || cashOption.source === "travelpayouts") {
    return 35;
  }

  if (cashOption.freshness?.isLive) {
    return 75;
  }

  return 85;
}

function getSimplicityScore(stops: number | undefined): number {
  if (stops === undefined) {
    return 45;
  }

  if (stops <= 0) {
    return 100;
  }

  if (stops === 1) {
    return 80;
  }

  if (stops === 2) {
    return 55;
  }

  return 30;
}

function getCashDecisionOption({
  cashOption,
  search,
}: {
  cashOption: ScoredCashOption;
  search: SavedSearch;
}): DecisionOption {
  const reasons: string[] = [];
  const priceKnown = Number.isFinite(cashOption.cashPriceUsd);
  const passengerBasisValid =
    Number.isFinite(search.passengers) &&
    search.passengers > 0 &&
    cashOption.comparison?.passengerCount === search.passengers;
  const isBenchmarkOnly =
    cashOption.comparison?.isBenchmarkOnly === true ||
    cashOption.comparison?.isExactDateComparable === false ||
    cashOption.cabinConfirmed === false ||
    hasLimitation(cashOption, "provider_benchmark_only");
  const isEligibleForRecommendation =
    priceKnown && passengerBasisValid && !isBenchmarkOnly;

  if (!priceKnown) {
    reasons.push("cash price missing");
  }

  if (!passengerBasisValid) {
    reasons.push("cash passenger basis missing or mismatched");
  }

  if (isBenchmarkOnly) {
    reasons.push("cash result is benchmark-only");
  }

  const confidenceScore = getCashConfidenceScore(cashOption);
  const simplicityScore = getSimplicityScore(cashOption.stops);
  const outOfPocketScore = 100;
  const valueScore = isEligibleForRecommendation ? 70 : 35;
  const totalScore = clampScore(
    valueScore * 0.35 +
      outOfPocketScore * 0.35 +
      confidenceScore * 0.2 +
      simplicityScore * 0.1,
  );
  const scoreBreakdown: DecisionScoreBreakdown = {
    valueScore,
    outOfPocketScore,
    confidenceScore,
    simplicityScore,
    totalScore,
    estimatedOutOfPocketUsd: cashOption.cashPriceUsd,
  };

  return {
    id: `decision-cash-${cashOption.id}`,
    type: "cash",
    sourceOptionId: cashOption.id,
    searchId: search.id,
    label: isBenchmarkOnly ? "cash_baseline" : undefined,
    score: totalScore,
    scoreBreakdown,
    isEligibleForRecommendation,
    comparabilityStatus: isBenchmarkOnly ? "not_comparable" : "comparable",
    reasons,
    display: {
      title: "Pay cash",
      subtitle: cashOption.airline,
      priceSummary: formatCurrency(cashOption.cashPriceUsd),
      caveat: isBenchmarkOnly
        ? "This cash result is a benchmark only, not exact itinerary pricing."
        : "Cash is evaluated as a direct out-of-pocket option.",
    },
  };
}

function getAwardDecisionOption({
  awardOption,
  cashOption,
  search,
  valuations,
}: {
  awardOption: ScoredAwardOption;
  cashOption: ScoredCashOption | undefined;
  search: SavedSearch;
  valuations: PointValuation[];
}): DecisionOption {
  const valuation = getValuationForProgram(awardOption.sourceProgramId, valuations);
  const comparabilityStatus: ComparabilityStatus =
    awardOption.comparability?.status ?? (cashOption ? "unknown" : "unknown");
  const reasons = [...(awardOption.comparability?.reasons ?? [])];
  const hasEnoughPoints = awardOption.recommendationLabel !== "not_enough_points";
  const isEligibleForRecommendation =
    comparabilityStatus === "comparable" &&
    hasEnoughPoints &&
    awardOption.centsPerPoint !== undefined;
  const estimatedPointsValueUsd =
    (awardOption.pointsRequired * valuation.centsPerPoint) / 100;
  const estimatedOutOfPocketUsd =
    estimatedPointsValueUsd + (awardOption.taxesAndFeesUsd ?? 0);
  const cashPrice = cashOption?.cashPriceUsd;
  const valueAdvantageScore =
    cashPrice && cashPrice > 0
      ? clampScore(50 + ((cashPrice - estimatedOutOfPocketUsd) / cashPrice) * 100)
      : 35;
  const cppSpread =
    awardOption.centsPerPoint === undefined
      ? 0
      : (awardOption.centsPerPoint - valuation.centsPerPoint) /
        valuation.centsPerPoint;
  const valueScore = isEligibleForRecommendation
    ? clampScore(50 + cppSpread * 30)
    : 0;
  const outOfPocketScore =
    awardOption.taxesAndFeesUsd === undefined
      ? 0
      : clampScore(100 - awardOption.taxesAndFeesUsd / 8);
  const confidenceScore = awardOption.score.availabilityConfidenceScore;
  const simplicityScore = awardOption.score.transferSimplicityScore;
  const totalScore = isEligibleForRecommendation
    ? clampScore(
        valueScore * 0.35 +
          valueAdvantageScore * 0.25 +
          outOfPocketScore * 0.15 +
          confidenceScore * 0.15 +
          simplicityScore * 0.1,
      )
    : 0;
  const scoreBreakdown: DecisionScoreBreakdown = {
    valueScore,
    outOfPocketScore,
    confidenceScore,
    simplicityScore,
    totalScore,
    estimatedOutOfPocketUsd,
    estimatedPointsValueUsd,
    centsPerPoint: awardOption.centsPerPoint,
  };
  const label: DecisionLabel | undefined = isEligibleForRecommendation
    ? undefined
    : comparabilityStatus === "not_comparable"
      ? "not_comparable"
      : "needs_verification";

  return {
    id: `decision-award-${awardOption.id}`,
    type: "award",
    sourceOptionId: awardOption.id,
    searchId: search.id,
    label,
    score: totalScore,
    scoreBreakdown,
    isEligibleForRecommendation,
    comparabilityStatus,
    reasons,
    display: {
      title: awardOption.airlineProgram,
      subtitle: `${formatNumber(awardOption.pointsRequired)} points + ${
        awardOption.taxesAndFeesUsd === undefined
          ? "fees not reported"
          : formatCurrency(awardOption.taxesAndFeesUsd)
      }`,
      priceSummary:
        awardOption.centsPerPoint === undefined
          ? "CPP unavailable"
          : `${awardOption.centsPerPoint.toFixed(1)} cpp`,
      caveat: isEligibleForRecommendation
        ? `Compared using a default ${valuation.centsPerPoint.toFixed(
            1,
          )} cpp valuation for ${awardOption.airlineProgram}.`
        : "Review provider details before treating this award as a booking path.",
    },
  };
}

function withLabel(
  option: DecisionOption | undefined,
  label: DecisionLabel,
): DecisionOption | undefined {
  return option ? { ...option, label } : undefined;
}

function byScoreDescending(
  firstOption: DecisionOption,
  secondOption: DecisionOption,
): number {
  return (secondOption.score ?? 0) - (firstOption.score ?? 0);
}

function byOutOfPocketAscending(
  firstOption: DecisionOption,
  secondOption: DecisionOption,
): number {
  return (
    (firstOption.scoreBreakdown?.estimatedOutOfPocketUsd ?? Number.POSITIVE_INFINITY) -
    (secondOption.scoreBreakdown?.estimatedOutOfPocketUsd ?? Number.POSITIVE_INFINITY)
  );
}

function byCentsPerPointDescending(
  firstOption: DecisionOption,
  secondOption: DecisionOption,
): number {
  return (
    (secondOption.scoreBreakdown?.centsPerPoint ?? 0) -
    (firstOption.scoreBreakdown?.centsPerPoint ?? 0)
  );
}

export function buildDecisionResultSet({
  awardOptions,
  cashOption,
  search,
  valuations = DEFAULT_POINT_VALUATIONS,
}: {
  awardOptions: ScoredAwardOption[];
  cashOption: ScoredCashOption | undefined;
  search: SavedSearch;
  valuations?: PointValuation[];
}): DecisionResultSet {
  const cashDecision = cashOption
    ? getCashDecisionOption({ cashOption, search })
    : undefined;
  const awardDecisions = awardOptions.map((awardOption) =>
    getAwardDecisionOption({
      awardOption,
      cashOption,
      search,
      valuations,
    }),
  );
  const eligibleOptions = [cashDecision, ...awardDecisions].filter(
    (option): option is DecisionOption =>
      option !== undefined && option.isEligibleForRecommendation,
  );
  const bestOverallOption = withLabel(
    eligibleOptions.toSorted(byScoreDescending)[0],
    "best_overall",
  );
  const lowestOutOfPocketOption = withLabel(
    eligibleOptions.toSorted(byOutOfPocketAscending)[0],
    "lowest_out_of_pocket",
  );
  const bestPointsValueOption = withLabel(
    awardDecisions
      .filter((option) => option.isEligibleForRecommendation)
      .toSorted(byCentsPerPointDescending)[0],
    "best_points_value",
  );
  const cashBaselineOption = withLabel(cashDecision, "cash_baseline");
  const labeledOptions = [cashDecision, ...awardDecisions]
    .filter((option): option is DecisionOption => option !== undefined)
    .map((option) => {
      if (option.id === bestOverallOption?.id) {
        return bestOverallOption;
      }

      if (option.id === bestPointsValueOption?.id) {
        return bestPointsValueOption;
      }

      if (option.id === lowestOutOfPocketOption?.id) {
        return lowestOutOfPocketOption;
      }

      if (option.id === cashBaselineOption?.id) {
        return cashBaselineOption;
      }

      return option;
    });

  return {
    options: labeledOptions,
    bestOverallOption,
    bestPointsValueOption,
    lowestOutOfPocketOption,
    cashBaselineOption,
    valuationAssumptions: valuations,
    warnings: [
      "Decision scores use default point valuations, not personalized user valuations.",
    ],
  };
}
