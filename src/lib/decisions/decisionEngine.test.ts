import { describe, expect, it } from "vitest";
import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import { buildDecisionResultSet } from "@/lib/decisions/decisionEngine";
import { scoreAwardOptions } from "@/lib/scoring/recommendations";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch } from "@/types/search";
import type { TransferPartner } from "@/types/transferPartners";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["IAD"],
  destinationCodes: ["HND"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  passengers: 1,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const accounts: PointsAccount[] = [
  {
    id: "account-chase",
    userId: "local-user",
    programId: "chase-ultimate-rewards",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 250000,
    lastUpdatedAt: "2026-06-01",
  },
];

const transferPartners: TransferPartner[] = [
  {
    id: "chase-aeroplan",
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "air-canada-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
];

function createCashOption(
  overrides: Partial<CashFlightOption> = {},
): CashFlightOption {
  return {
    id: "cash-1",
    source: "mock",
    airline: "Example Air",
    flightNumbers: ["EA100"],
    origin: "IAD",
    destination: "HND",
    departureDateTime: "2027-05-01T10:00:00Z",
    arrivalDateTime: "2027-05-02T10:00:00Z",
    cabin: "business",
    cabinConfirmed: true,
    cashPriceUsd: 5000,
    stops: 1,
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
      tripType: "round_trip",
      passengerCount: 1,
      cabin: "business",
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
    },
    ...overrides,
  };
}

function createAwardOption(
  overrides: Partial<AwardFlightOption> = {},
): AwardFlightOption {
  return {
    id: "award-1",
    source: "mock",
    airlineProgram: "Air Canada Aeroplan",
    sourceProgramId: "air-canada-aeroplan",
    origin: "IAD",
    destination: "HND",
    departureDateTime: "2027-05-01T10:00:00Z",
    arrivalDateTime: "2027-05-02T10:00:00Z",
    cabin: "business",
    pointsRequired: 90000,
    taxesAndFeesUsd: 186,
    transferSources: ["Chase Ultimate Rewards"],
    availabilityStatus: "available",
    stops: 1,
    confidence: "high",
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
      tripType: "round_trip",
      passengerCount: 1,
      cabin: "business",
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
      availabilityStatus: "available",
    },
    ...overrides,
  };
}

function buildDecisionResult({
  awards,
  cash = createCashOption(),
}: {
  awards: AwardFlightOption[];
  cash?: CashFlightOption;
}) {
  const scored = scoreAwardOptions(
    awards,
    cash,
    accounts,
    transferPartners,
    search,
  );

  return buildDecisionResultSet({
    awardOptions: scored.rankedAwardOptions,
    cashOption: scored.cashOption,
    search,
  });
}

describe("unified decision engine", () => {
  it("converts cash into a decision option", () => {
    const result = buildDecisionResult({ awards: [] });

    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      sourceOptionId: "cash-1",
      isEligibleForRecommendation: true,
      comparabilityStatus: "comparable",
    });
  });

  it("converts awards into decision options", () => {
    const result = buildDecisionResult({ awards: [createAwardOption()] });

    expect(result.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "award",
          sourceOptionId: "award-1",
        }),
      ]),
    );
  });

  it("lets cash win best_overall over a poor-value comparable award", () => {
    const result = buildDecisionResult({
      cash: createCashOption({ cashPriceUsd: 900 }),
      awards: [
        createAwardOption({
          pointsRequired: 220000,
          taxesAndFeesUsd: 300,
        }),
      ],
    });

    expect(result.bestOverallOption).toMatchObject({
      type: "cash",
      label: "best_overall",
    });
  });

  it("lets an award win best_overall over expensive cash when CPP is strong", () => {
    const result = buildDecisionResult({
      cash: createCashOption({ cashPriceUsd: 7000 }),
      awards: [createAwardOption({ pointsRequired: 70000, taxesAndFeesUsd: 120 })],
    });

    expect(result.bestOverallOption).toMatchObject({
      type: "award",
      label: "best_overall",
      sourceOptionId: "award-1",
    });
    expect(result.bestPointsValueOption?.type).toBe("award");
  });

  it("does not produce best_overall when all options are non-comparable", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        source: "travelpayouts",
        cabinConfirmed: false,
        comparison: {
          tripType: "round_trip",
          passengerCount: 1,
          cabin: "business",
          cabinConfirmed: false,
          isExactDateComparable: false,
          isBenchmarkOnly: true,
        },
        limitations: [
          {
            code: "provider_benchmark_only",
            severity: "warning",
            message: "Benchmark only.",
          },
        ],
      }),
      awards: [createAwardOption({ taxesAndFeesUsd: undefined })],
    });

    expect(result.bestOverallOption).toBeUndefined();
    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      isEligibleForRecommendation: false,
    });
  });

  it("blocks cash from winning when passenger basis is missing or mismatched", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        comparison: {
          tripType: "round_trip",
          passengerCount: 2,
          cabin: "business",
          cabinConfirmed: true,
          isExactDateComparable: true,
          isBenchmarkOnly: false,
        },
      }),
      awards: [],
    });

    expect(result.bestOverallOption).toBeUndefined();
    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      isEligibleForRecommendation: false,
    });
    expect(result.cashBaselineOption?.reasons).toContain(
      "cash passenger basis missing or mismatched",
    );
  });

  it("blocks cash from winning when search fingerprint metadata mismatches", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        comparison: {
          searchFingerprint: "different-search-fingerprint",
          tripType: "round_trip",
          passengerCount: 1,
          cabin: "business",
          cabinConfirmed: true,
          isExactDateComparable: true,
          isBenchmarkOnly: false,
        },
      }),
      awards: [],
    });

    expect(result.bestOverallOption).toBeUndefined();
    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      isEligibleForRecommendation: false,
      comparabilityStatus: "not_comparable",
    });
    expect(result.cashBaselineOption?.reasons).toContain(
      "unknown_itinerary_relationship",
    );
  });

  it("blocks cash from winning when trip or departure date metadata mismatches", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        departureDateTime: "2027-05-03T10:00:00Z",
        comparison: {
          searchFingerprint: createSearchFingerprint(search),
          tripType: "one_way",
          passengerCount: 1,
          cabin: "business",
          cabinConfirmed: true,
          isExactDateComparable: true,
          isBenchmarkOnly: false,
        },
      }),
      awards: [],
    });

    expect(result.bestOverallOption).toBeUndefined();
    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      isEligibleForRecommendation: false,
      comparabilityStatus: "not_comparable",
    });
    expect(result.cashBaselineOption?.reasons).toEqual(
      expect.arrayContaining(["trip_type_mismatch", "date_mismatch"]),
    );
  });

  it("blocks cash from winning when cabin metadata mismatches or is unconfirmed", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        cabin: "economy",
        cabinConfirmed: false,
        comparison: {
          searchFingerprint: createSearchFingerprint(search),
          tripType: "round_trip",
          passengerCount: 1,
          cabin: "economy",
          cabinConfirmed: false,
          isExactDateComparable: true,
          isBenchmarkOnly: false,
        },
      }),
      awards: [],
    });

    expect(result.bestOverallOption).toBeUndefined();
    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      isEligibleForRecommendation: false,
      comparabilityStatus: "not_comparable",
    });
    expect(result.cashBaselineOption?.reasons).toContain("cabin_mismatch");
  });

  it("keeps Travelpayouts benchmark-only cash from creating fake exact CPP", () => {
    const result = buildDecisionResult({
      cash: createCashOption({
        source: "travelpayouts",
        cabinConfirmed: false,
        comparison: {
          tripType: "round_trip",
          passengerCount: 1,
          cabin: "business",
          cabinConfirmed: false,
          isExactDateComparable: false,
          isBenchmarkOnly: true,
        },
        limitations: [
          {
            code: "provider_benchmark_only",
            severity: "warning",
            message: "Benchmark only.",
          },
        ],
      }),
      awards: [createAwardOption()],
    });

    const awardDecision = result.options.find((option) => option.type === "award");

    expect(result.cashBaselineOption).toMatchObject({
      type: "cash",
      label: "cash_baseline",
      isEligibleForRecommendation: false,
    });
    expect(awardDecision?.scoreBreakdown?.centsPerPoint).toBeUndefined();
    expect(result.bestOverallOption).toBeUndefined();
  });

  it("blocks unknown award fees from award best_overall", () => {
    const result = buildDecisionResult({
      awards: [createAwardOption({ taxesAndFeesUsd: undefined })],
    });

    const awardDecision = result.options.find((option) => option.type === "award");

    expect(awardDecision).toMatchObject({
      isEligibleForRecommendation: false,
      label: "not_comparable",
    });
    expect(result.bestOverallOption?.type).toBe("cash");
  });

  it("blocks stale, unavailable, waitlist, and unknown awards from award best_overall", () => {
    for (const availabilityStatus of [
      "stale",
      "unavailable",
      "waitlist",
      "unknown",
    ] as const) {
      const result = buildDecisionResult({
        awards: [createAwardOption({ availabilityStatus })],
      });
      const awardDecision = result.options.find(
        (option) => option.type === "award",
      );

      expect(awardDecision?.isEligibleForRecommendation).toBe(false);
      expect(result.bestOverallOption?.type).toBe("cash");
    }
  });
});
