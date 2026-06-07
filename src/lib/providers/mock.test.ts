import { describe, expect, it } from "vitest";
import {
  getMockAwardOptionsForSearch,
  getMockCashOptionForSearch,
} from "@/data/mockResults";
import {
  getMockAwardFlightsForSearch,
  getMockCashFlightsForSearch,
  mockAwardFlightProvider,
  mockCashFlightProvider,
  mockFlightSearchProviderSet,
} from "@/lib/providers/mock";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["WAS"],
  destinationCodes: ["TYO"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  flexibleDays: 3,
  passengers: 2,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("mock flight providers", () => {
  it("exposes a cash and award provider set", () => {
    expect(mockFlightSearchProviderSet.cashProvider.id).toBe("mock-cash");
    expect(mockFlightSearchProviderSet.awardProvider.id).toBe("mock-awards");
  });

  it("wraps the existing deterministic cash benchmark", async () => {
    const cashOptions = await mockCashFlightProvider.searchCashFlights(search);

    expect(cashOptions).toEqual([getMockCashOptionForSearch(search)]);
    expect(getMockCashFlightsForSearch(search)).toEqual(cashOptions);
  });

  it("wraps the existing deterministic award options", async () => {
    const awardOptions =
      await mockAwardFlightProvider.searchAwardFlights(search);

    expect(awardOptions).toEqual(getMockAwardOptionsForSearch(search));
    expect(getMockAwardFlightsForSearch(search)).toEqual(awardOptions);
  });
});
