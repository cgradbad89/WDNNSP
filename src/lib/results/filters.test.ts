import { describe, expect, it } from "vitest";
import {
  applyResultsFilters,
  HIGH_FEE_AWARD_THRESHOLD_USD,
} from "@/lib/results/filters";
import type { ScoredAwardOption } from "@/lib/scoring/recommendations";
import type { RecommendationScore } from "@/types/scoring";

const score: RecommendationScore = {
  optionId: "option",
  valueScore: 80,
  pointsFitScore: 100,
  convenienceScore: 80,
  availabilityConfidenceScore: 100,
  transferSimplicityScore: 85,
  totalScore: 88,
  explanation: [],
  warnings: [],
};

function createOption(
  id: string,
  overrides: Partial<ScoredAwardOption> = {},
): ScoredAwardOption {
  return {
    id,
    source: "mock",
    airlineProgram: "Air Canada Aeroplan",
    origin: "IAD",
    destination: "NRT",
    departureDateTime: "2027-05-01T09:15:00-04:00",
    arrivalDateTime: "2027-05-02T14:50:00+09:00",
    cabin: "business",
    pointsRequired: 150000,
    taxesAndFeesUsd: 186,
    transferSources: ["Chase"],
    stops: 1,
    durationMinutes: 910,
    confidence: "high",
    recommendationLabel: "best_overall",
    sufficientTransferPathCount: 1,
    score,
    ...overrides,
  };
}

describe("results filters", () => {
  it("removes unaffordable options when filtering by bookable points", () => {
    const options = [
      createOption("bookable"),
      createOption("not-enough", { recommendationLabel: "not_enough_points" }),
    ];

    expect(
      applyResultsFilters(options, {
        bookableWithAnyPoints: true,
        bookableWithTransferablePoints: false,
        maxOneStop: false,
        hideHighFeeAwards: false,
        businessCabinOnly: false,
      }).map((option) => option.id),
    ).toEqual(["bookable"]);
  });

  it("returns only transfer-bookable options", () => {
    const options = [
      createOption("transferable", { sufficientTransferPathCount: 1 }),
      createOption("not-transferable", { sufficientTransferPathCount: 0 }),
    ];

    expect(
      applyResultsFilters(options, {
        bookableWithAnyPoints: false,
        bookableWithTransferablePoints: true,
        maxOneStop: false,
        hideHighFeeAwards: false,
        businessCabinOnly: false,
      }).map((option) => option.id),
    ).toEqual(["transferable"]);
  });

  it("removes options with two or more stops", () => {
    const options = [createOption("one-stop"), createOption("two-stop", { stops: 2 })];

    expect(
      applyResultsFilters(options, {
        bookableWithAnyPoints: false,
        bookableWithTransferablePoints: false,
        maxOneStop: true,
        hideHighFeeAwards: false,
        businessCabinOnly: false,
      }).map((option) => option.id),
    ).toEqual(["one-stop"]);
  });

  it("removes awards with fees above the MVP threshold", () => {
    const options = [
      createOption("reasonable-fees", {
        taxesAndFeesUsd: HIGH_FEE_AWARD_THRESHOLD_USD,
      }),
      createOption("high-fees", {
        taxesAndFeesUsd: HIGH_FEE_AWARD_THRESHOLD_USD + 1,
      }),
    ];

    expect(
      applyResultsFilters(options, {
        bookableWithAnyPoints: false,
        bookableWithTransferablePoints: false,
        maxOneStop: false,
        hideHighFeeAwards: true,
        businessCabinOnly: false,
      }).map((option) => option.id),
    ).toEqual(["reasonable-fees"]);
  });

  it("removes non-business awards when filtering by business cabin", () => {
    const options = [
      createOption("business"),
      createOption("economy", { cabin: "economy" }),
    ];

    expect(
      applyResultsFilters(options, {
        bookableWithAnyPoints: false,
        bookableWithTransferablePoints: false,
        maxOneStop: false,
        hideHighFeeAwards: false,
        businessCabinOnly: true,
      }).map((option) => option.id),
    ).toEqual(["business"]);
  });
});
