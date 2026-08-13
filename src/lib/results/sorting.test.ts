import { describe, expect, it } from "vitest";
import { RESULTS_SORT_OPTIONS, sortAwardOptions } from "@/lib/results/sorting";
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
    recommendationLabel: "best_value",
    sufficientTransferPathCount: 1,
    score,
    ...overrides,
  };
}

describe("RESULTS_SORT_OPTIONS", () => {
  it("offers best match, fewest points, lowest fees, and fastest", () => {
    expect(RESULTS_SORT_OPTIONS.map((option) => option.value)).toEqual([
      "best_match",
      "fewest_points",
      "lowest_fees",
      "fastest",
    ]);
  });
});

describe("sortAwardOptions", () => {
  const options = [
    createOption("mid", { pointsRequired: 100000, taxesAndFeesUsd: 200, durationMinutes: 600 }),
    createOption("cheapest-points", { pointsRequired: 50000, taxesAndFeesUsd: 400, durationMinutes: 900 }),
    createOption("lowest-fees", { pointsRequired: 150000, taxesAndFeesUsd: 50, durationMinutes: 300 }),
  ];

  it("best_match leaves the incoming (score-ranked) order untouched", () => {
    expect(sortAwardOptions(options, "best_match").map((o) => o.id)).toEqual([
      "mid",
      "cheapest-points",
      "lowest-fees",
    ]);
  });

  it("does not mutate the input array or the option objects", () => {
    const before = options.map((option) => option.id);
    sortAwardOptions(options, "fewest_points");
    expect(options.map((option) => option.id)).toEqual(before);
  });

  it("fewest_points sorts by pointsRequired ascending", () => {
    expect(
      sortAwardOptions(options, "fewest_points").map((o) => o.id),
    ).toEqual(["cheapest-points", "mid", "lowest-fees"]);
  });

  it("lowest_fees sorts by taxesAndFeesUsd ascending", () => {
    expect(sortAwardOptions(options, "lowest_fees").map((o) => o.id)).toEqual([
      "lowest-fees",
      "mid",
      "cheapest-points",
    ]);
  });

  it("fastest sorts by total duration ascending, using routeDetail over the durationMinutes fallback", () => {
    const withRouteDetail = [
      createOption("route-detail-duration", {
        durationMinutes: 9999,
        routeDetail: {
          segments: [],
          layovers: [],
          totalDurationMinutes: 100,
        },
      }),
      createOption("fallback-duration", { durationMinutes: 200 }),
    ];

    expect(
      sortAwardOptions(withRouteDetail, "fastest").map((o) => o.id),
    ).toEqual(["route-detail-duration", "fallback-duration"]);
  });

  it("lowest_fees sorts options with unreported taxesAndFeesUsd to the end, not first as if $0", () => {
    const withUnknownFees = [
      createOption("known", { taxesAndFeesUsd: 200 }),
      createOption("unknown", { taxesAndFeesUsd: undefined }),
    ];

    expect(
      sortAwardOptions(withUnknownFees, "lowest_fees").map((o) => o.id),
    ).toEqual(["known", "unknown"]);
  });

  it("fastest sorts options with unknown duration to the end", () => {
    const withUnknownDuration = [
      createOption("known", { durationMinutes: 400 }),
      createOption("unknown", { durationMinutes: undefined }),
    ];

    expect(
      sortAwardOptions(withUnknownDuration, "fastest").map((o) => o.id),
    ).toEqual(["known", "unknown"]);
  });

  it("preserves each option's score and recommendationLabel while reordering", () => {
    const sorted = sortAwardOptions(options, "fewest_points");
    const originalById = new Map(options.map((option) => [option.id, option]));

    for (const option of sorted) {
      expect(option.score).toBe(originalById.get(option.id)?.score);
      expect(option.recommendationLabel).toBe(
        originalById.get(option.id)?.recommendationLabel,
      );
    }
  });
});
