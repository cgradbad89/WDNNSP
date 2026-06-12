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

const nonstopSearch: SavedSearch = {
  ...search,
  id: "search-nonstop",
  maxStops: 0,
};

describe("mock flight providers", () => {
  it("exposes a cash and award provider set", () => {
    expect(mockFlightSearchProviderSet.cashProvider.id).toBe("mock-cash");
    expect(mockFlightSearchProviderSet.awardProvider.id).toBe("mock-awards");
  });

  it("returns a cash provider envelope with metadata and messages", async () => {
    const envelope = await mockCashFlightProvider.searchCashFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data).toEqual([getMockCashOptionForSearch(search)]);
    expect(getMockCashFlightsForSearch(search)).toEqual(envelope.data);
    expect(envelope.metadata).toEqual({
      providerId: "mock-cash",
      providerLabel: "Mock cash flight provider",
      searchedAt: expect.any(String),
      isLive: false,
    });
    expect(envelope.messages).toEqual([
      {
        code: "mock_data",
        severity: "info",
        message: "Using mock flight data.",
      },
    ]);
  });

  it("returns an award provider envelope with metadata and messages", async () => {
    const envelope =
      await mockAwardFlightProvider.searchAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data).toEqual(getMockAwardOptionsForSearch(search));
    expect(getMockAwardFlightsForSearch(search)).toEqual(envelope.data);
    expect(envelope.metadata).toEqual({
      providerId: "mock-awards",
      providerLabel: "Mock award flight provider",
      searchedAt: expect.any(String),
      isLive: false,
    });
    expect(envelope.messages).toEqual([
      {
        code: "mock_data",
        severity: "info",
        message: "Using mock flight data.",
      },
      {
        code: "verify_award_availability",
        severity: "warning",
        message: "Verify award availability directly before transferring points.",
      },
    ]);
  });

  it("keeps nonstop mock cash route details free of layovers", async () => {
    const envelope =
      await mockCashFlightProvider.searchCashFlights(nonstopSearch);
    const [cashOption] = envelope.data;

    expect(cashOption.stops).toBe(0);
    expect(cashOption.routeDetail?.layovers).toEqual([]);
    expect(cashOption.routeDetail?.segments).toHaveLength(1);
  });

  it("keeps nonstop mock award route details free of layovers", async () => {
    const envelope =
      await mockAwardFlightProvider.searchAwardFlights(nonstopSearch);

    expect(envelope.data).not.toHaveLength(0);
    expect(
      envelope.data.every(
        (option) =>
          option.stops === 0 &&
          option.routeDetail?.layovers.length === 0 &&
          option.routeDetail?.segments.length === 1,
      ),
    ).toBe(true);
  });

  it("keeps one-stop mock route details aligned with stop counts", async () => {
    const envelope = await mockAwardFlightProvider.searchAwardFlights(search);

    expect(
      envelope.data.every(
        (option) => option.routeDetail?.layovers.length === option.stops,
      ),
    ).toBe(true);
    expect(envelope.data.some((option) => option.stops === 1)).toBe(true);
  });
});
