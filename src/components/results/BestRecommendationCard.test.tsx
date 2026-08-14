// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestRecommendationCard } from "@/components/results/BestRecommendationCard";
import type { ScoredAwardOption } from "@/lib/scoring/recommendations";
import type { DecisionOption } from "@/types/decisions";

const scoredAwardOption: ScoredAwardOption = {
  id: "award-1",
  source: "mock",
  airlineProgram: "United MileagePlus",
  sourceProgramId: "united-mileageplus",
  origin: "IAD",
  destination: "NRT",
  departureDateTime: "2027-05-01T09:00:00-04:00",
  arrivalDateTime: "2027-05-02T14:00:00+09:00",
  cabin: "business",
  pointsRequired: 120000,
  taxesAndFeesUsd: 48,
  transferSources: ["Chase Ultimate Rewards"],
  stops: 0,
  confidence: "high",
  availabilityStatus: "available",
  recommendationLabel: "best_overall",
  score: {
    optionId: "award-1",
    valueScore: 95,
    pointsFitScore: 90,
    convenienceScore: 90,
    availabilityConfidenceScore: 90,
    transferSimplicityScore: 80,
    totalScore: 91,
    explanation: ["Strong award value."],
    warnings: [],
  },
  centsPerPoint: 4,
};

const awardDecisionWithoutCaveat: DecisionOption = {
  id: "decision-award-1",
  type: "award",
  sourceOptionId: "award-1",
  searchId: "search-1",
  label: "best_overall",
  score: 91,
  isEligibleForRecommendation: true,
  comparabilityStatus: "comparable",
  reasons: [],
  display: {
    title: "United MileagePlus",
    priceSummary: "4.0 cpp",
  },
};

describe("BestRecommendationCard", () => {
  it("does not render award valuation caveat copy when the decision has no caveat", () => {
    render(
      <BestRecommendationCard
        bestAwardOption={scoredAwardOption}
        bestDecisionOption={awardDecisionWithoutCaveat}
        cashBenchmark={4800}
      />,
    );

    expect(screen.getByText("Transfer points to United MileagePlus")).toBeInTheDocument();
    expect(
      screen.queryByText(/Your personal value for these points may differ\./),
    ).not.toBeInTheDocument();
  });
});
