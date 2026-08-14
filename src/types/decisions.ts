import type { ComparabilityReason, ComparabilityStatus } from "@/types/comparison";

export type DecisionOptionType = "cash" | "award";

export type DecisionLabel =
  | "best_overall"
  | "best_points_value"
  | "lowest_out_of_pocket"
  | "cash_baseline"
  | "needs_verification"
  | "not_comparable";

export interface DecisionScoreBreakdown {
  valueScore: number;
  outOfPocketScore: number;
  confidenceScore: number;
  simplicityScore: number;
  totalScore: number;
  estimatedOutOfPocketUsd?: number;
  estimatedPointsValueUsd?: number;
  centsPerPoint?: number;
}

export interface DecisionOption {
  id: string;
  type: DecisionOptionType;
  sourceOptionId: string;
  searchId?: string;
  itineraryId?: string;
  label?: DecisionLabel;
  score?: number;
  scoreBreakdown?: DecisionScoreBreakdown;
  isEligibleForRecommendation: boolean;
  comparabilityStatus: ComparabilityStatus;
  reasons: Array<ComparabilityReason | string>;
  display: {
    title: string;
    subtitle?: string;
    priceSummary: string;
    caveat?: string;
  };
}

export interface PointValuation {
  programId: string;
  centsPerPoint: number;
  source: "default";
}

export interface DecisionResultSet {
  options: DecisionOption[];
  bestOverallOption?: DecisionOption;
  bestPointsValueOption?: DecisionOption;
  lowestOutOfPocketOption?: DecisionOption;
  cashBaselineOption?: DecisionOption;
  valuationAssumptions: PointValuation[];
  warnings: string[];
}
