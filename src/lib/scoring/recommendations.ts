import type { AwardFlightOption } from "@/types/awards";
import type {
  ComparabilityReason,
  ComparabilityResult,
} from "@/types/comparison";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { RecommendationScore } from "@/types/scoring";
import type { SavedSearch } from "@/types/search";
import type { TransferPartner } from "@/types/transferPartners";
import {
  getCashAwardComparability,
  isEligibleForBookableRecommendation,
} from "@/lib/comparison/comparability";
import { normalizeLoyaltyProgram } from "@/lib/points/loyaltyPrograms";
import { calculateCentsPerPoint } from "@/lib/scoring/cpp";

export type RecommendationLabel =
  | "best_overall"
  | "best_value"
  | "lowest_fees"
  | "cash_check"
  | "not_comparable"
  | "not_enough_points";

export interface ScoredAwardOption extends AwardFlightOption {
  recommendationLabel: RecommendationLabel;
  score: RecommendationScore;
  comparability?: ComparabilityResult;
  sufficientTransferPathCount?: number;
}

export interface ScoredCashOption extends CashFlightOption {
  recommendationLabel: RecommendationLabel;
}

export interface RecommendationResultSet {
  bestAwardOption?: ScoredAwardOption;
  rankedAwardOptions: ScoredAwardOption[];
  cashOption?: ScoredCashOption;
  warnings: string[];
}

export const TRANSFER_WARNING =
  "Confirm award availability directly with the airline before transferring points. Transfers are often irreversible, and award space can disappear.";

type TransferBalance = {
  fromProgram: string;
  convertedBalance: number;
  estimatedTransferTime?: string;
};

type PointsFit = {
  directBalance: number;
  transferBalances: TransferBalance[];
  hasEnoughPoints: boolean;
  hasTransferPath: boolean;
  pointsFitScore: number;
  transferSimplicityScore: number;
};

type AwardProgramIdentity = {
  programId?: string;
  programName: string;
};

const SCORE_WEIGHTS = {
  valueScore: 0.35,
  pointsFitScore: 0.2,
  convenienceScore: 0.2,
  availabilityConfidenceScore: 0.15,
  transferSimplicityScore: 0.1,
};

function normalizeProgramName(programName: string): string {
  return programName.trim().toLowerCase();
}

function addProgramBalance(
  balances: Map<string, number>,
  key: string,
  balance: number,
): void {
  balances.set(key, (balances.get(key) ?? 0) + balance);
}

function createProgramBalanceMap(
  accounts: PointsAccount[],
  programType: PointsAccount["programType"],
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const account of accounts) {
    if (account.programType !== programType) {
      continue;
    }

    addProgramBalance(balances, account.programId, account.balance);
    addProgramBalance(
      balances,
      normalizeProgramName(account.programName),
      account.balance,
    );
  }

  return balances;
}

function getProgramBalance(
  balances: Map<string, number>,
  programId: string,
  programName: string,
): number {
  return (
    balances.get(programId) ?? balances.get(normalizeProgramName(programName)) ?? 0
  );
}

function getAwardProgramIdentity(
  awardOption: AwardFlightOption,
): AwardProgramIdentity {
  const normalization = normalizeLoyaltyProgram({
    provider: awardOption.provider?.providerId ?? awardOption.source,
    rawProgramId: awardOption.sourceProgramId,
    rawProgramName: awardOption.airlineProgram,
  });

  return {
    programId: normalization.programId,
    programName: normalization.displayName ?? awardOption.airlineProgram,
  };
}

function matchesAwardProgram(
  partner: TransferPartner,
  awardProgram: AwardProgramIdentity,
): boolean {
  if (!awardProgram.programId) {
    return false;
  }

  return (
    partner.toProgramId === awardProgram.programId ||
    normalizeProgramName(partner.toProgram) ===
      normalizeProgramName(awardProgram.programName)
  );
}

function getValueScore(centsPerPoint: number): number {
  if (centsPerPoint <= 0) {
    return 0;
  }

  return Math.min(100, centsPerPoint * 25);
}

function getConvenienceScore(stops: number | undefined): number {
  // Unconfirmed stop count is unknown, not nonstop. Scored below the worst
  // known tier (3+ stops = 25) so an unreported option never ties or beats
  // an option with an honestly-reported bad stop count.
  if (stops === undefined) {
    return 0;
  }

  if (stops <= 0) {
    return 100;
  }

  if (stops === 1) {
    return 80;
  }

  if (stops === 2) {
    return 50;
  }

  return 25;
}

function getAvailabilityConfidenceScore(
  confidence: AwardFlightOption["confidence"],
): number {
  // No confidence signal from the provider is unknown, not "medium".
  // Scored below the worst known tier ("low" = 35) so an unreported option
  // never ties or beats an option with honestly-reported low confidence.
  if (confidence === undefined) {
    return 0;
  }

  if (confidence === "high") {
    return 100;
  }

  if (confidence === "medium") {
    return 70;
  }

  return 35;
}

function getTransferBalances(
  awardOption: AwardFlightOption,
  flexibleBalances: Map<string, number>,
  transferPartners: TransferPartner[],
): TransferBalance[] {
  const transferBalances = new Map<string, TransferBalance>();
  const awardProgram = getAwardProgramIdentity(awardOption);

  for (const partner of transferPartners) {
    if (!partner.isActive || !matchesAwardProgram(partner, awardProgram)) {
      continue;
    }

    const sourceBalance = getProgramBalance(
      flexibleBalances,
      partner.fromProgramId,
      partner.fromProgram,
    );

    if (sourceBalance <= 0) {
      continue;
    }

    const convertedBalance = Math.floor(sourceBalance * partner.transferRatio);
    const currentBalance = transferBalances.get(partner.fromProgramId);

    if (!currentBalance || convertedBalance > currentBalance.convertedBalance) {
      transferBalances.set(partner.fromProgramId, {
        fromProgram: partner.fromProgram,
        convertedBalance,
        estimatedTransferTime: partner.estimatedTransferTime,
      });
    }
  }

  return Array.from(transferBalances.values());
}

function getPointsFit(
  awardOption: AwardFlightOption,
  accounts: PointsAccount[],
  transferPartners: TransferPartner[],
): PointsFit {
  const airlineBalances = createProgramBalanceMap(accounts, "airline");
  const flexibleBalances = createProgramBalanceMap(accounts, "credit_card");
  const awardProgram = getAwardProgramIdentity(awardOption);
  const directBalance = getProgramBalance(
    airlineBalances,
    awardProgram.programId ?? awardOption.airlineProgram,
    awardProgram.programName,
  );
  const transferBalances = getTransferBalances(
    awardOption,
    flexibleBalances,
    transferPartners,
  );
  const sufficientTransferBalances = transferBalances.filter(
    (transferBalance) =>
      transferBalance.convertedBalance + directBalance >=
      awardOption.pointsRequired,
  );
  const totalReachableBalance = transferBalances.reduce(
    (sum, balance) => sum + balance.convertedBalance,
    directBalance,
  );
  const bestReachableBalance = Math.max(
    directBalance,
    totalReachableBalance,
  );
  const hasEnoughPoints =
    directBalance >= awardOption.pointsRequired ||
    sufficientTransferBalances.length > 0 ||
    totalReachableBalance >= awardOption.pointsRequired;
  const pointsFitScore = hasEnoughPoints
    ? 100
    : bestReachableBalance >= awardOption.pointsRequired / 2
      ? 50
      : 0;
  let transferSimplicityScore = 0;

  if (directBalance >= awardOption.pointsRequired) {
    transferSimplicityScore = 100;
  } else if (sufficientTransferBalances.length === 1) {
    transferSimplicityScore = 85;
  } else if (sufficientTransferBalances.length > 1) {
    transferSimplicityScore = 75;
  } else if (transferBalances.length > 0) {
    transferSimplicityScore = 40;
  }

  return {
    directBalance,
    transferBalances,
    hasEnoughPoints,
    hasTransferPath: transferBalances.length > 0,
    pointsFitScore,
    transferSimplicityScore,
  };
}

function buildScoreExplanation(
  awardOption: AwardFlightOption,
  centsPerPoint: number,
  pointsFit: PointsFit,
): string[] {
  const explanation: string[] = [];

  if (pointsFit.hasEnoughPoints) {
    explanation.push(
      `You have enough direct or transferable points for ${awardOption.airlineProgram}.`,
    );
  }

  if (centsPerPoint >= 3) {
    explanation.push(
      `This redemption is strong at ${centsPerPoint.toFixed(1)} cpp against the cash fare estimate.`,
    );
  }

  if (
    awardOption.taxesAndFeesUsd !== undefined &&
    awardOption.taxesAndFeesUsd <= 100
  ) {
    explanation.push("Taxes and fees are low for this award option.");
  }

  return explanation;
}

function buildScoreWarnings(
  awardOption: AwardFlightOption,
  pointsFit: PointsFit,
  comparability: ComparabilityResult | undefined,
): string[] {
  const warnings: string[] = [];

  if (!pointsFit.hasEnoughPoints) {
    warnings.push(
      "You do not currently have enough direct or transferable points for this option.",
    );
  }

  if (awardOption.confidence === "low") {
    warnings.push(
      "Availability confidence is low, so verify this option before making plans.",
    );
  } else if (awardOption.confidence === undefined) {
    warnings.push(
      "Availability confidence is not reported for this option, so verify it directly before making plans.",
    );
  }

  if (awardOption.taxesAndFeesUsd === undefined) {
    warnings.push(
      "Taxes and fees are not reported for this option and are not included in its value score.",
    );
  }

  if (!isEligibleForBookableRecommendation(awardOption)) {
    warnings.push(
      "Award availability is not confirmed as bookable, so this option is not eligible for Best Overall.",
    );
  }

  if (comparability?.status === "not_comparable") {
    warnings.push(
      `CPP and recommendation claims are blocked: ${formatComparabilityReasons(
        comparability.reasons,
      )}.`,
    );
  }

  return warnings;
}

function formatComparabilityReasons(reasons: ComparabilityReason[]): string {
  const labels: Record<ComparabilityReason, string> = {
    trip_type_mismatch: "trip type mismatch",
    date_mismatch: "date mismatch",
    return_date_missing: "return date missing",
    passenger_mismatch: "passenger mismatch",
    cabin_mismatch: "cabin mismatch",
    unknown_award_fees: "award fees not reported",
    missing_cash_price: "cash price missing",
    missing_award_points: "award points missing",
    unresolved_program: "loyalty program unresolved",
    availability_not_bookable: "availability not bookable",
    provider_benchmark_only: "provider result is benchmark-only",
    unknown_itinerary_relationship: "itinerary relationship unknown",
  };

  return reasons.map((reason) => labels[reason]).join(", ");
}

function buildRecommendationScore(
  awardOption: AwardFlightOption,
  centsPerPoint: number,
  pointsFit: PointsFit,
  comparability: ComparabilityResult | undefined,
): RecommendationScore {
  const valueScore = getValueScore(centsPerPoint);
  const convenienceScore = getConvenienceScore(awardOption.stops);
  const availabilityConfidenceScore = getAvailabilityConfidenceScore(
    awardOption.confidence,
  );
  const totalScore = Math.round(
    valueScore * SCORE_WEIGHTS.valueScore +
      pointsFit.pointsFitScore * SCORE_WEIGHTS.pointsFitScore +
      convenienceScore * SCORE_WEIGHTS.convenienceScore +
      availabilityConfidenceScore *
        SCORE_WEIGHTS.availabilityConfidenceScore +
      pointsFit.transferSimplicityScore *
        SCORE_WEIGHTS.transferSimplicityScore,
  );

  return {
    optionId: awardOption.id,
    valueScore,
    pointsFitScore: pointsFit.pointsFitScore,
    convenienceScore,
    availabilityConfidenceScore,
    transferSimplicityScore: pointsFit.transferSimplicityScore,
    totalScore,
    explanation: buildScoreExplanation(awardOption, centsPerPoint, pointsFit),
    warnings: buildScoreWarnings(awardOption, pointsFit, comparability),
  };
}

function assignRecommendationLabels(
  rankedAwardOptions: Array<
    Omit<ScoredAwardOption, "recommendationLabel"> & {
      hasEnoughPoints: boolean;
      isComparableForRecommendation: boolean;
    }
  >,
): ScoredAwardOption[] {
  const labels = new Map<string, RecommendationLabel>();

  for (const option of rankedAwardOptions) {
    if (!option.isComparableForRecommendation) {
      labels.set(option.id, "not_comparable");
    } else if (!option.hasEnoughPoints) {
      labels.set(option.id, "not_enough_points");
    }
  }

  const affordableOptions = rankedAwardOptions.filter(
    (option) => option.hasEnoughPoints && option.isComparableForRecommendation,
  );
  const bestOverall = affordableOptions[0];

  if (bestOverall) {
    labels.set(bestOverall.id, "best_overall");
  }

  const nonTopAffordableOptions = affordableOptions.filter(
    (option) => option.id !== bestOverall?.id,
  );
  const bestValueOption = nonTopAffordableOptions.reduce<
    (typeof nonTopAffordableOptions)[number] | undefined
  >((currentBest, option) => {
    if (
      !currentBest ||
      (option.centsPerPoint ?? 0) > (currentBest.centsPerPoint ?? 0)
    ) {
      return option;
    }

    return currentBest;
  }, undefined);

  if (bestValueOption) {
    labels.set(bestValueOption.id, "best_value");
  }

  const lowestFeesOption = nonTopAffordableOptions
    // Unreported taxesAndFeesUsd can't be confirmed as low, so it is never
    // eligible for the "Lowest Fees" label - only real reported values compete.
    .filter(
      (option) =>
        option.id !== bestValueOption?.id &&
        option.taxesAndFeesUsd !== undefined,
    )
    .reduce<(typeof nonTopAffordableOptions)[number] | undefined>(
      (currentLowest, option) => {
        if (
          !currentLowest ||
          (option.taxesAndFeesUsd as number) <
            (currentLowest.taxesAndFeesUsd as number)
        ) {
          return option;
        }

        return currentLowest;
      },
      undefined,
    );

  if (lowestFeesOption) {
    labels.set(lowestFeesOption.id, "lowest_fees");
  }

  return rankedAwardOptions.map(
    ({ hasEnoughPoints, isComparableForRecommendation, ...option }) => {
      void hasEnoughPoints;
      void isComparableForRecommendation;

      return {
        ...option,
        recommendationLabel:
          labels.get(option.id) ??
          (option.taxesAndFeesUsd !== undefined && option.taxesAndFeesUsd <= 100
            ? "lowest_fees"
            : "best_value"),
      };
    },
  );
}

export function scoreAwardOptions(
  awardOptions: AwardFlightOption[],
  cashOption: CashFlightOption | undefined,
  accounts: PointsAccount[],
  transferPartners: TransferPartner[],
  search?: SavedSearch,
): RecommendationResultSet {
  const scoredAwardOptions = awardOptions.map((awardOption) => {
    const comparability =
      cashOption && search
        ? getCashAwardComparability({ search, cashOption, awardOption })
        : undefined;
    const isComparable =
      !comparability || comparability.status === "comparable";
    const centsPerPoint =
      cashOption && isComparable
        ? calculateCentsPerPoint(
            cashOption.cashPriceUsd,
            awardOption.taxesAndFeesUsd,
            awardOption.pointsRequired,
          )
        : undefined;
    const pointsFit = getPointsFit(awardOption, accounts, transferPartners);

    return {
      ...awardOption,
      cashComparableUsd:
        cashOption && isComparable ? cashOption.cashPriceUsd : undefined,
      centsPerPoint,
      comparability,
      score: buildRecommendationScore(
        awardOption,
        centsPerPoint ?? 0,
        pointsFit,
        comparability,
      ),
      hasEnoughPoints: pointsFit.hasEnoughPoints,
      isComparableForRecommendation:
        isComparable && isEligibleForBookableRecommendation(awardOption),
    };
  });
  const rankedAwardOptions = assignRecommendationLabels(
    scoredAwardOptions.toSorted((firstOption, secondOption) => {
      if (secondOption.score.totalScore !== firstOption.score.totalScore) {
        return secondOption.score.totalScore - firstOption.score.totalScore;
      }

      return (
        (secondOption.centsPerPoint ?? 0) - (firstOption.centsPerPoint ?? 0)
      );
    }),
  );

  return {
    bestAwardOption: rankedAwardOptions.find(
      (option) => option.recommendationLabel === "best_overall",
    ),
    rankedAwardOptions,
    cashOption: cashOption
      ? {
          ...cashOption,
          recommendationLabel: "cash_check",
        }
      : undefined,
    warnings: [TRANSFER_WARNING],
  };
}
