import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { RecommendationScore } from "@/types/scoring";
import type { TransferPartner } from "@/types/transferPartners";
import { calculateCentsPerPoint } from "@/lib/scoring/cpp";

export type RecommendationLabel =
  | "best_overall"
  | "best_value"
  | "lowest_fees"
  | "cash_check"
  | "not_enough_points";

export interface ScoredAwardOption extends AwardFlightOption {
  recommendationLabel: RecommendationLabel;
  score: RecommendationScore;
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
};

type PointsFit = {
  directBalance: number;
  transferBalances: TransferBalance[];
  hasEnoughPoints: boolean;
  hasTransferPath: boolean;
  pointsFitScore: number;
  transferSimplicityScore: number;
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

function matchesAwardProgram(
  partner: TransferPartner,
  awardProgram: string,
): boolean {
  return (
    partner.toProgramId === awardProgram ||
    normalizeProgramName(partner.toProgram) === normalizeProgramName(awardProgram)
  );
}

function getValueScore(centsPerPoint: number): number {
  if (centsPerPoint <= 0) {
    return 0;
  }

  return Math.min(100, centsPerPoint * 25);
}

function getConvenienceScore(stops: number): number {
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

  for (const partner of transferPartners) {
    if (
      !partner.isActive ||
      !matchesAwardProgram(partner, awardOption.airlineProgram)
    ) {
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

    const convertedBalance = sourceBalance * partner.transferRatio;
    const currentBalance = transferBalances.get(partner.fromProgramId);

    if (!currentBalance || convertedBalance > currentBalance.convertedBalance) {
      transferBalances.set(partner.fromProgramId, {
        fromProgram: partner.fromProgram,
        convertedBalance,
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
  const directBalance = getProgramBalance(
    airlineBalances,
    awardOption.airlineProgram,
    awardOption.airlineProgram,
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
  const bestReachableBalance = Math.max(
    directBalance,
    ...transferBalances.map(
      (transferBalance) => transferBalance.convertedBalance + directBalance,
    ),
  );
  const hasEnoughPoints =
    directBalance >= awardOption.pointsRequired ||
    sufficientTransferBalances.length > 0;
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
      `This redemption is strong at ${centsPerPoint.toFixed(1)} cpp against the cash benchmark.`,
    );
  }

  if (awardOption.taxesAndFeesUsd <= 100) {
    explanation.push("Taxes and fees are low for this award option.");
  }

  return explanation;
}

function buildScoreWarnings(
  awardOption: AwardFlightOption,
  pointsFit: PointsFit,
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
  }

  return warnings;
}

function buildRecommendationScore(
  awardOption: AwardFlightOption,
  centsPerPoint: number,
  pointsFit: PointsFit,
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
    warnings: buildScoreWarnings(awardOption, pointsFit),
  };
}

function assignRecommendationLabels(
  rankedAwardOptions: Array<
    Omit<ScoredAwardOption, "recommendationLabel"> & { hasEnoughPoints: boolean }
  >,
): ScoredAwardOption[] {
  const labels = new Map<string, RecommendationLabel>();

  for (const option of rankedAwardOptions) {
    if (!option.hasEnoughPoints) {
      labels.set(option.id, "not_enough_points");
    }
  }

  const affordableOptions = rankedAwardOptions.filter(
    (option) => option.hasEnoughPoints,
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
    if (!currentBest || (option.centsPerPoint ?? 0) > (currentBest.centsPerPoint ?? 0)) {
      return option;
    }

    return currentBest;
  }, undefined);

  if (bestValueOption) {
    labels.set(bestValueOption.id, "best_value");
  }

  const lowestFeesOption = nonTopAffordableOptions
    .filter((option) => option.id !== bestValueOption?.id)
    .reduce<(typeof nonTopAffordableOptions)[number] | undefined>(
      (currentLowest, option) => {
        if (!currentLowest || option.taxesAndFeesUsd < currentLowest.taxesAndFeesUsd) {
          return option;
        }

        return currentLowest;
      },
      undefined,
    );

  if (lowestFeesOption) {
    labels.set(lowestFeesOption.id, "lowest_fees");
  }

  return rankedAwardOptions.map(({ hasEnoughPoints, ...option }) => {
    void hasEnoughPoints;

    return {
      ...option,
      recommendationLabel:
        labels.get(option.id) ??
        (option.taxesAndFeesUsd <= 100 ? "lowest_fees" : "best_value"),
    };
  });
}

export function scoreAwardOptions(
  awardOptions: AwardFlightOption[],
  cashOption: CashFlightOption | undefined,
  accounts: PointsAccount[],
  transferPartners: TransferPartner[],
): RecommendationResultSet {
  const scoredAwardOptions = awardOptions.map((awardOption) => {
    const centsPerPoint = cashOption
      ? calculateCentsPerPoint(
          cashOption.cashPriceUsd,
          awardOption.taxesAndFeesUsd,
          awardOption.pointsRequired,
        )
      : undefined;
    const pointsFit = getPointsFit(awardOption, accounts, transferPartners);

    return {
      ...awardOption,
      cashComparableUsd: cashOption?.cashPriceUsd,
      centsPerPoint,
      score: buildRecommendationScore(awardOption, centsPerPoint ?? 0, pointsFit),
      hasEnoughPoints: pointsFit.hasEnoughPoints,
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
