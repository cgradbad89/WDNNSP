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
      providerLabel: "Mock Cash Provider",
      searchedAt: "2026-06-12T00:00:00.000Z",
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
      providerLabel: "Mock Award Provider",
      searchedAt: "2026-06-12T00:00:00.000Z",
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

  it("adds real-provider-ready metadata to mock cash options", async () => {
    const envelope = await mockCashFlightProvider.searchCashFlights(search);
    const [cashOption] = envelope.data;

    expect(cashOption.provider).toEqual({
      providerId: "mock-cash",
      providerLabel: "Mock Cash Provider",
      resultId: cashOption.id,
    });
    expect(cashOption.freshness).toEqual({
      searchedAt: "2026-06-12T00:00:00.000Z",
      lastCheckedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
      isStale: false,
    });
    expect(cashOption.price).toEqual({
      amount: cashOption.cashPriceUsd,
      currency: "USD",
    });
    expect(cashOption.priceBreakdown?.total).toEqual(cashOption.price);
    expect(cashOption.itinerary).toMatchObject({
      durationMinutes: cashOption.routeDetail?.totalDurationMinutes,
      stopCount: cashOption.stops,
    });
    expect(cashOption.limitations).toEqual([
      {
        code: "mock_data",
        severity: "info",
        message: "Using deterministic mock data until live providers are added.",
      },
    ]);
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

  it("adds real-provider-ready metadata to mock award options", async () => {
    const envelope = await mockAwardFlightProvider.searchAwardFlights(search);
    const [awardOption] = envelope.data;

    expect(awardOption.provider).toEqual({
      providerId: "mock-awards",
      providerLabel: "Mock Award Provider",
      resultId: awardOption.id,
    });
    expect(awardOption.freshness).toEqual({
      searchedAt: "2026-06-12T00:00:00.000Z",
      lastCheckedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
      isStale: false,
    });
    expect(awardOption.availabilityStatus).toBe("available");
    expect(awardOption.availableSeats).toBe(search.passengers);
    expect(awardOption.fees).toEqual({
      amount: awardOption.taxesAndFeesUsd,
      currency: "USD",
    });
    expect(awardOption.taxesAndFees).toEqual(awardOption.fees);
    expect(awardOption.sourceProgramId).toBe("air-canada-aeroplan");
    expect(awardOption.sourceProgramLabel).toBe("Air Canada Aeroplan");
    expect(awardOption.itinerary).toMatchObject({
      durationMinutes: awardOption.routeDetail?.totalDurationMinutes,
      stopCount: awardOption.stops,
    });
    expect(awardOption.limitations).toEqual([
      {
        code: "mock_data",
        severity: "info",
        message: "Using deterministic mock data until live providers are added.",
      },
      {
        code: "verify_award_availability",
        severity: "warning",
        message: "Verify award availability directly before transferring points.",
      },
    ]);
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
