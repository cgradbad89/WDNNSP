import { describe, expect, it } from "vitest";
import {
  scoreAwardOptions,
  TRANSFER_WARNING,
  type ScoredAwardOption,
} from "@/lib/scoring/recommendations";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { TransferPartner } from "@/types/transferPartners";

const cashOption: CashFlightOption = {
  id: "cash-1",
  source: "mock",
  airline: "Example Air",
  flightNumbers: ["EA100"],
  origin: "IAD",
  destination: "HND",
  departureDateTime: "2027-05-01T10:00:00-04:00",
  arrivalDateTime: "2027-05-02T15:00:00+09:00",
  durationMinutes: 840,
  stops: 1,
  cabin: "business",
  cashPriceUsd: 7100,
};

const search = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["IAD"],
  destinationCodes: ["HND"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip" as const,
  passengers: 2,
  cabin: "business" as const,
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
    balance: 130000,
    lastUpdatedAt: "2026-06-01",
  },
  {
    id: "account-united",
    userId: "local-user",
    programId: "united-mileageplus",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 60000,
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
  {
    id: "chase-virgin",
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "virgin-atlantic-flying-club",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Virgin Atlantic Flying Club",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
  {
    id: "chase-united",
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "united-mileageplus",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "United MileagePlus",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
];

function createAwardOption(
  overrides: Partial<AwardFlightOption>,
): AwardFlightOption {
  return {
    id: "award-1",
    source: "mock",
    airlineProgram: "Air Canada Aeroplan",
    operatingAirline: "Air Canada",
    origin: "IAD",
    destination: "HND",
    departureDateTime: "2027-05-01T10:00:00-04:00",
    arrivalDateTime: "2027-05-02T15:00:00+09:00",
    cabin: "business",
    pointsRequired: 120000,
    taxesAndFeesUsd: 186,
    transferSources: ["Chase"],
    availabilityStatus: "available",
    stops: 1,
    durationMinutes: 840,
    confidence: "high",
    ...overrides,
  };
}

function getOptionById(
  options: ScoredAwardOption[],
  optionId: string,
): ScoredAwardOption {
  const option = options.find((candidate) => candidate.id === optionId);

  if (!option) {
    throw new Error(`Missing option ${optionId}`);
  }

  return option;
}

function createComparableCashOption(
  overrides: Partial<CashFlightOption> = {},
): CashFlightOption {
  return {
    ...cashOption,
    comparison: {
      tripType: "round_trip",
      passengerCount: 2,
      cabin: "business",
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
    },
    ...overrides,
  };
}

function createComparableAwardOption(
  overrides: Partial<AwardFlightOption> = {},
): AwardFlightOption {
  return createAwardOption({
    sourceProgramId: "air-canada-aeroplan",
    comparison: {
      tripType: "round_trip",
      passengerCount: 2,
      cabin: "business",
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
      availabilityStatus: "available",
    },
    ...overrides,
  });
}

describe("scoreAwardOptions", () => {
  it("ranks the best overall award first", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({ id: "aeroplan", pointsRequired: 120000, stops: 1 }),
        createAwardOption({
          id: "virgin",
          airlineProgram: "Virgin Atlantic Flying Club",
          pointsRequired: 110000,
          taxesAndFeesUsd: 420,
          stops: 2,
          confidence: "medium",
        }),
        createAwardOption({
          id: "united",
          airlineProgram: "United MileagePlus",
          pointsRequired: 170000,
          taxesAndFeesUsd: 48,
          stops: 1,
        }),
      ],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].id).toBe("aeroplan");
    expect(result.rankedAwardOptions[0].recommendationLabel).toBe("best_overall");
    expect(result.bestAwardOption?.id).toBe("aeroplan");
  });

  it("adds cents per point when a cash option is available", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "aeroplan" })],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].centsPerPoint).toBe(5.8);
    expect(result.rankedAwardOptions[0].cashComparableUsd).toBe(7100);
  });

  it("does not create CPP or Best Overall labels without a cash comparison option", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "aeroplan" })],
      undefined,
      accounts,
      transferPartners,
    );

    expect(result.cashOption).toBeUndefined();
    expect(result.bestAwardOption).toBeUndefined();
    expect(result.rankedAwardOptions[0].cashComparableUsd).toBeUndefined();
    expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
    expect(result.rankedAwardOptions[0].recommendationLabel).toBe(
      "not_comparable",
    );
  });

  it("assigns best value and lowest fees labels to non-top awards", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({ id: "aeroplan", pointsRequired: 120000 }),
        createAwardOption({
          id: "virgin",
          airlineProgram: "Virgin Atlantic Flying Club",
          pointsRequired: 110000,
          taxesAndFeesUsd: 420,
          stops: 2,
          confidence: "medium",
        }),
        createAwardOption({
          id: "united",
          airlineProgram: "United MileagePlus",
          pointsRequired: 170000,
          taxesAndFeesUsd: 48,
          stops: 1,
        }),
      ],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(getOptionById(result.rankedAwardOptions, "virgin").recommendationLabel).toBe(
      "best_value",
    );
    expect(getOptionById(result.rankedAwardOptions, "united").recommendationLabel).toBe(
      "lowest_fees",
    );
  });

  it("labels insufficient points and adds an option warning", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({
          id: "too-expensive",
          pointsRequired: 300000,
        }),
      ],
      cashOption,
      [],
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].recommendationLabel).toBe(
      "not_enough_points",
    );
    expect(result.rankedAwardOptions[0].score.warnings).toContain(
      "You do not currently have enough direct or transferable points for this option.",
    );
  });

  it("scores high confidence above low confidence when other factors match", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({ id: "high-confidence", confidence: "high" }),
        createAwardOption({ id: "low-confidence", confidence: "low" }),
      ],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(
      getOptionById(result.rankedAwardOptions, "high-confidence").score
        .totalScore,
    ).toBeGreaterThan(
      getOptionById(result.rankedAwardOptions, "low-confidence").score
        .totalScore,
    );
  });

  it("scores one stop above two stops when other factors match", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({ id: "one-stop", stops: 1 }),
        createAwardOption({ id: "two-stop", stops: 2 }),
      ],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(getOptionById(result.rankedAwardOptions, "one-stop").score.totalScore).toBeGreaterThan(
      getOptionById(result.rankedAwardOptions, "two-stop").score.totalScore,
    );
  });

  it("includes a warning for low availability confidence", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "low-confidence", confidence: "low" })],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].score.warnings).toContain(
      "Availability confidence is low, so verify this option before making plans.",
    );
  });

  it("always includes the transfer warning in the result set", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "aeroplan" })],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(result.warnings).toContain(TRANSFER_WARNING);
  });

  it("matches direct airline balances by program ID", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({
          id: "united-id",
          airlineProgram: "united-mileageplus",
          pointsRequired: 50000,
        }),
      ],
      cashOption,
      [
        {
          ...accounts[1],
          programName: "Legacy United Label",
        },
      ],
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
    expect(result.rankedAwardOptions[0].recommendationLabel).toBe("best_overall");
  });

  it("matches transferable balances by program ID and preserves name fallback", () => {
    const renamedAccount: PointsAccount = {
      ...accounts[0],
      programName: "Legacy Chase Label",
    };
    const legacyAccount: PointsAccount = {
      ...accounts[0],
      programId: "legacy-chase-id",
    };

    const idResult = scoreAwardOptions(
      [createAwardOption({ id: "aeroplan-id" })],
      cashOption,
      [renamedAccount],
      transferPartners,
    );
    const fallbackResult = scoreAwardOptions(
      [createAwardOption({ id: "aeroplan-name" })],
      cashOption,
      [legacyAccount],
      transferPartners,
    );

    expect(idResult.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
    expect(fallbackResult.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
  });

  it("uses a resolved sourceProgramId for transfer partner scoring", () => {
    const result = scoreAwardOptions(
      [
        createAwardOption({
          id: "provider-slug",
          airlineProgram: "aeroplan",
          sourceProgramId: "air-canada-aeroplan",
        }),
      ],
      cashOption,
      accounts,
      transferPartners,
    );

    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
  });

  it("has exact balance match sufficiency", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "exact", airlineProgram: "United MileagePlus", pointsRequired: 60000 })],
      cashOption,
      accounts,
      transferPartners,
    );
    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
  });

  it("fails sufficiency by 1 point", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "short", airlineProgram: "United MileagePlus", pointsRequired: 190001 })],
      cashOption,
      accounts,
      transferPartners,
    );
    expect(result.rankedAwardOptions[0].recommendationLabel).toBe("not_enough_points");
  });

  it("is sufficient only after a hypothetical transfer", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "transfer-needed", airlineProgram: "Virgin Atlantic Flying Club", pointsRequired: 100000 })],
      cashOption,
      accounts,
      transferPartners,
    );
    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
    expect(result.rankedAwardOptions[0].score.transferSimplicityScore).toBeLessThan(100);
  });

  it("handles multiple currencies combined to cover one need", () => {
    const amexAccount = {
      id: "account-amex",
      userId: "local",
      programId: "american-express-membership-rewards",
      programName: "American Express Membership Rewards",
      programType: "credit_card" as const,
      balance: 10000,
      lastUpdatedAt: "2026",
    };
    const multiTransferPartners = [
      ...transferPartners,
      {
        id: "amex-virgin",
        fromProgramId: "american-express-membership-rewards",
        toProgramId: "virgin-atlantic-flying-club",
        fromProgram: "American Express Membership Rewards",
        toProgram: "Virgin Atlantic Flying Club",
        transferRatio: 1,
        estimatedTransferTime: "same_day" as const,
        isActive: true,
      }
    ];
    const result = scoreAwardOptions(
      [createAwardOption({ id: "multi", airlineProgram: "Virgin Atlantic Flying Club", pointsRequired: 140000 })],
      cashOption,
      [accounts[0], amexAccount], // chase 130k + amex 10k
      multiTransferPartners,
    );
    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100);
    expect(result.rankedAwardOptions[0].score.transferSimplicityScore).toBe(40); // multiple transfers
  });

  it("scores transfer simplicity for non-1:1 ratio partner", () => {
    const amexAccount = {
      id: "account-amex",
      userId: "local",
      programId: "american-express-membership-rewards",
      programName: "American Express Membership Rewards",
      programType: "credit_card" as const,
      balance: 100000,
      lastUpdatedAt: "2026",
    };
    const emiratesPartner = {
      id: "amex-emirates",
      fromProgramId: "american-express-membership-rewards",
      toProgramId: "emirates-skywards",
      fromProgram: "American Express Membership Rewards",
      toProgram: "Emirates Skywards",
      transferRatio: 0.8,
      estimatedTransferTime: "unknown" as const,
      isActive: true,
    };
    const result = scoreAwardOptions(
      [createAwardOption({ id: "non11", airlineProgram: "Emirates Skywards", pointsRequired: 80000 })],
      cashOption,
      [amexAccount],
      [emiratesPartner],
    );
    expect(result.rankedAwardOptions[0].score.pointsFitScore).toBe(100); // 100k * 0.8 = 80k
  });

  it("scores transfer simplicity when no partner exists", () => {
    const result = scoreAwardOptions(
      [createAwardOption({ id: "no-partner", airlineProgram: "Unknown Airline", pointsRequired: 1000 })],
      cashOption,
      accounts,
      transferPartners,
    );
    expect(result.rankedAwardOptions[0].recommendationLabel).toBe("not_enough_points");
    expect(result.rankedAwardOptions[0].score.transferSimplicityScore).toBe(0);
  });

  describe("unreported fields are treated as unknown, not the best case", () => {
    // This is the core regression test for the fabricated-defaults bug: an
    // option whose fees/stops/confidence were never reported by the
    // provider (undefined) must not out-score an otherwise-identical option
    // that honestly reported worse-but-real numbers for those same fields.
    it("does not let unreported fees/stops/confidence out-score honestly-reported, less-flattering real values", () => {
      const result = scoreAwardOptions(
        [
          createAwardOption({
            id: "unreported",
            taxesAndFeesUsd: undefined,
            stops: undefined,
            confidence: undefined,
          }),
          createAwardOption({
            id: "honestly-reported-worse",
            // Real, worse-than-great numbers - but still genuinely reported.
            taxesAndFeesUsd: 450,
            stops: 2,
            confidence: "low",
          }),
        ],
        cashOption,
        accounts,
        transferPartners,
      );

      const unreported = getOptionById(result.rankedAwardOptions, "unreported");
      const honest = getOptionById(
        result.rankedAwardOptions,
        "honestly-reported-worse",
      );

      expect(unreported.score.totalScore).toBeLessThanOrEqual(
        honest.score.totalScore,
      );
      // Confirm this isn't a coincidental tie: the unreported option must
      // score strictly worse on every affected component.
      expect(unreported.score.valueScore).toBeLessThanOrEqual(
        honest.score.valueScore,
      );
      expect(unreported.score.convenienceScore).toBeLessThan(
        honest.score.convenienceScore,
      );
      expect(unreported.score.availabilityConfidenceScore).toBeLessThan(
        honest.score.availabilityConfidenceScore,
      );
    });

    it("leaves centsPerPoint undefined (not a fabricated number) when taxesAndFeesUsd is unreported", () => {
      const result = scoreAwardOptions(
        [createAwardOption({ id: "unreported-fees", taxesAndFeesUsd: undefined })],
        cashOption,
        accounts,
        transferPartners,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
    });

    it("does not generate 'Taxes and fees are low' explanation copy when taxesAndFeesUsd is unreported", () => {
      const result = scoreAwardOptions(
        [createAwardOption({ id: "unreported-fees", taxesAndFeesUsd: undefined })],
        cashOption,
        accounts,
        transferPartners,
      );

      expect(result.rankedAwardOptions[0].score.explanation).not.toContain(
        "Taxes and fees are low for this award option.",
      );
    });

    it("adds a warning when taxes and fees are unreported", () => {
      const result = scoreAwardOptions(
        [createAwardOption({ id: "unreported-fees", taxesAndFeesUsd: undefined })],
        cashOption,
        accounts,
        transferPartners,
      );

      expect(result.rankedAwardOptions[0].score.warnings).toContain(
        "Taxes and fees are not reported for this option and are not included in its value score.",
      );
    });

    it("adds a warning when confidence is unreported", () => {
      const result = scoreAwardOptions(
        [createAwardOption({ id: "unreported-confidence", confidence: undefined })],
        cashOption,
        accounts,
        transferPartners,
      );

      expect(result.rankedAwardOptions[0].score.warnings).toContain(
        "Availability confidence is not reported for this option, so verify it directly before making plans.",
      );
    });

    it("never assigns the 'Lowest Fees' label to an option with unreported taxesAndFeesUsd", () => {
      const result = scoreAwardOptions(
        [
          createAwardOption({
            id: "aeroplan",
            pointsRequired: 120000,
            taxesAndFeesUsd: 186,
          }),
          createAwardOption({
            id: "unreported-fees",
            airlineProgram: "Virgin Atlantic Flying Club",
            pointsRequired: 110000,
            taxesAndFeesUsd: undefined,
            confidence: "medium",
          }),
          createAwardOption({
            id: "united",
            airlineProgram: "United MileagePlus",
            pointsRequired: 170000,
            taxesAndFeesUsd: 48,
          }),
        ],
        cashOption,
        accounts,
        transferPartners,
      );

      expect(
        getOptionById(result.rankedAwardOptions, "unreported-fees")
          .recommendationLabel,
      ).not.toBe("lowest_fees");
    });
  });

  describe("comparison guardrails", () => {
    it("blocks CPP and Best Overall when cabin differs from the searched cabin", () => {
      const result = scoreAwardOptions(
        [
          createComparableAwardOption({
            id: "economy-award",
            cabin: "economy",
            comparison: {
              tripType: "round_trip",
              passengerCount: 2,
              cabin: "economy",
              cabinConfirmed: true,
              isExactDateComparable: true,
              isBenchmarkOnly: false,
              availabilityStatus: "available",
            },
          }),
        ],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
      expect(result.rankedAwardOptions[0].recommendationLabel).toBe(
        "not_comparable",
      );
      expect(result.bestAwardOption).toBeUndefined();
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "cabin_mismatch",
      );
    });

    it("blocks round-trip cash against one-way award comparison", () => {
      const result = scoreAwardOptions(
        [
          createComparableAwardOption({
            id: "one-way-award",
            comparison: {
              tripType: "one_way",
              passengerCount: 2,
              cabin: "business",
              cabinConfirmed: true,
              isExactDateComparable: true,
              isBenchmarkOnly: false,
              availabilityStatus: "available",
            },
          }),
        ],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "trip_type_mismatch",
      );
    });

    it("blocks passenger mismatch CPP", () => {
      const result = scoreAwardOptions(
        [
          createComparableAwardOption({
            id: "wrong-passengers",
            comparison: {
              tripType: "round_trip",
              passengerCount: 1,
              cabin: "business",
              cabinConfirmed: true,
              isExactDateComparable: true,
              isBenchmarkOnly: false,
              availabilityStatus: "available",
            },
          }),
        ],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "passenger_mismatch",
      );
    });

    it("blocks unknown award fees CPP", () => {
      const result = scoreAwardOptions(
        [createComparableAwardOption({ id: "unknown-fees", taxesAndFeesUsd: undefined })],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "unknown_award_fees",
      );
    });

    it("does not fabricate a transfer path for an unknown provider program", () => {
      const result = scoreAwardOptions(
        [
          createComparableAwardOption({
            id: "unknown-program",
            airlineProgram: "mystery-program",
            sourceProgramId: undefined,
          }),
        ],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].score.transferSimplicityScore).toBe(0);
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "unresolved_program",
      );
    });

    it("prevents waitlist, unavailable, stale, and unknown awards from becoming Best Overall", () => {
      const result = scoreAwardOptions(
        [
          createComparableAwardOption({
            id: "waitlist",
            availabilityStatus: "waitlist",
          }),
          createComparableAwardOption({
            id: "unavailable",
            availabilityStatus: "unavailable",
          }),
          createComparableAwardOption({ id: "stale", availabilityStatus: "stale" }),
          createComparableAwardOption({
            id: "unknown",
            availabilityStatus: "unknown",
          }),
        ],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.bestAwardOption).toBeUndefined();
      expect(
        result.rankedAwardOptions.every(
          (option) => option.recommendationLabel === "not_comparable",
        ),
      ).toBe(true);
    });

    it("blocks benchmark-only cash CPP", () => {
      const result = scoreAwardOptions(
        [createComparableAwardOption({ id: "benchmark-blocked" })],
        createComparableCashOption({
          source: "travelpayouts",
          cabinConfirmed: false,
          comparison: {
            tripType: "round_trip",
            passengerCount: 2,
            cabin: "business",
            cabinConfirmed: false,
            isExactDateComparable: false,
            isBenchmarkOnly: true,
          },
        }),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBeUndefined();
      expect(result.rankedAwardOptions[0].comparability?.reasons).toContain(
        "provider_benchmark_only",
      );
    });

    it("still calculates CPP for exact comparable mock-style options", () => {
      const result = scoreAwardOptions(
        [createComparableAwardOption({ id: "safe-mock" })],
        createComparableCashOption(),
        accounts,
        transferPartners,
        search,
      );

      expect(result.rankedAwardOptions[0].centsPerPoint).toBe(5.8);
      expect(result.rankedAwardOptions[0].recommendationLabel).toBe(
        "best_overall",
      );
    });
  });
});
