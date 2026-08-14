import { describe, expect, it } from "vitest";
import {
  getCashAwardComparability,
  isEligibleForBookableRecommendation,
} from "@/lib/comparison/comparability";
import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["IAD"],
  destinationCodes: ["HND"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  passengers: 2,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

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
    cabin: "business",
    cashPriceUsd: 7100,
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
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
    pointsRequired: 120000,
    taxesAndFeesUsd: 186,
    transferSources: ["Chase Ultimate Rewards"],
    availabilityStatus: "available",
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
      tripType: "round_trip",
      passengerCount: 2,
      cabin: "business",
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
      availabilityStatus: "available",
    },
    ...overrides,
  };
}

describe("cash/award comparability", () => {
  it("allows exact mock cash and exact mock award comparison", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption(),
      }),
    ).toEqual({ status: "comparable", reasons: [] });
  });

  it("blocks round-trip cash compared against a one-way award", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption({
          comparison: {
            searchFingerprint: createSearchFingerprint(search),
            tripType: "one_way",
            passengerCount: 2,
            cabin: "business",
            cabinConfirmed: true,
            isExactDateComparable: true,
            isBenchmarkOnly: false,
          },
        }),
      }).reasons,
    ).toContain("trip_type_mismatch");
  });

  it("blocks passenger mismatches", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption({
          comparison: {
            searchFingerprint: createSearchFingerprint(search),
            tripType: "round_trip",
            passengerCount: 1,
            cabin: "business",
            cabinConfirmed: true,
            isExactDateComparable: true,
            isBenchmarkOnly: false,
          },
        }),
      }).reasons,
    ).toContain("passenger_mismatch");
  });

  it("blocks cabin mismatches", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption({
          cabin: "economy",
          comparison: {
            searchFingerprint: createSearchFingerprint(search),
            tripType: "round_trip",
            passengerCount: 2,
            cabin: "economy",
            cabinConfirmed: true,
            isExactDateComparable: true,
            isBenchmarkOnly: false,
          },
        }),
      }).reasons,
    ).toContain("cabin_mismatch");
  });

  it("blocks unknown award fees", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption({ taxesAndFeesUsd: undefined }),
      }).reasons,
    ).toContain("unknown_award_fees");
  });

  it("blocks unresolved programs", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption(),
        awardOption: createAwardOption({ sourceProgramId: undefined }),
      }).reasons,
    ).toContain("unresolved_program");
  });

  it("blocks benchmark-only cash", () => {
    expect(
      getCashAwardComparability({
        search,
        cashOption: createCashOption({
          comparison: {
            searchFingerprint: createSearchFingerprint(search),
            tripType: "round_trip",
            passengerCount: 2,
            cabin: "business",
            cabinConfirmed: false,
            isExactDateComparable: false,
            isBenchmarkOnly: true,
          },
        }),
        awardOption: createAwardOption(),
      }).reasons,
    ).toContain("provider_benchmark_only");
  });

  it("does not treat stale, unavailable, waitlist, or unknown awards as bookable recommendations", () => {
    expect(
      isEligibleForBookableRecommendation(
        createAwardOption({ availabilityStatus: "stale" }),
      ),
    ).toBe(false);
    expect(
      isEligibleForBookableRecommendation(
        createAwardOption({ availabilityStatus: "unavailable" }),
      ),
    ).toBe(false);
    expect(
      isEligibleForBookableRecommendation(
        createAwardOption({ availabilityStatus: "waitlist" }),
      ),
    ).toBe(false);
    expect(
      isEligibleForBookableRecommendation(
        createAwardOption({ availabilityStatus: "unknown" }),
      ),
    ).toBe(false);
  });
});
