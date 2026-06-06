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

const accounts: PointsAccount[] = [
  {
    id: "account-chase",
    userId: "local-user",
    programId: "chase",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 130000,
    lastUpdatedAt: "2026-06-01",
  },
  {
    id: "account-united",
    userId: "local-user",
    programId: "united",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 60000,
    lastUpdatedAt: "2026-06-01",
  },
];

const transferPartners: TransferPartner[] = [
  {
    id: "chase-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
  {
    id: "chase-virgin",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Virgin Atlantic Flying Club",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
  {
    id: "chase-united",
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
});
