import { describe, expect, it, vi } from "vitest";
import { searchFlightsWithProviders } from "@/lib/providers/search";
import type { FlightSearchProviderSet } from "@/lib/providers/types";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
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

const cashOption: CashFlightOption = {
  id: "cash-1",
  source: "mock",
  airline: "Mock cash",
  flightNumbers: ["MOCK100"],
  origin: "IAD",
  destination: "HND",
  departureDateTime: "2027-05-01T10:00:00-04:00",
  arrivalDateTime: "2027-05-02T15:00:00+09:00",
  durationMinutes: 840,
  stops: 1,
  cabin: "business",
  cashPriceUsd: 7100,
};

const awardOption: AwardFlightOption = {
  id: "award-1",
  source: "mock",
  airlineProgram: "Air Canada Aeroplan",
  origin: "IAD",
  destination: "HND",
  departureDateTime: "2027-05-01T09:15:00-04:00",
  arrivalDateTime: "2027-05-02T14:50:00+09:00",
  cabin: "business",
  pointsRequired: 120000,
  taxesAndFeesUsd: 186,
  transferSources: ["Chase"],
  stops: 1,
  durationMinutes: 910,
  confidence: "high",
};

describe("searchFlightsWithProviders", () => {
  it("calls cash and award providers with the search", async () => {
    const providers: FlightSearchProviderSet = {
      cashProvider: {
        id: "cash",
        label: "Cash",
        searchCashFlights: vi.fn().mockResolvedValue([cashOption]),
      },
      awardProvider: {
        id: "award",
        label: "Award",
        searchAwardFlights: vi.fn().mockResolvedValue([awardOption]),
      },
    };

    await searchFlightsWithProviders(search, providers);

    expect(providers.cashProvider.searchCashFlights).toHaveBeenCalledWith(search);
    expect(providers.awardProvider.searchAwardFlights).toHaveBeenCalledWith(search);
  });

  it("returns cash and award option arrays", async () => {
    const providers: FlightSearchProviderSet = {
      cashProvider: {
        id: "cash",
        label: "Cash",
        async searchCashFlights() {
          return [cashOption];
        },
      },
      awardProvider: {
        id: "award",
        label: "Award",
        async searchAwardFlights() {
          return [awardOption];
        },
      },
    };

    await expect(searchFlightsWithProviders(search, providers)).resolves.toEqual({
      cashOptions: [cashOption],
      awardOptions: [awardOption],
    });
  });

  it("bubbles provider errors", async () => {
    const providerError = new Error("Provider failed");
    const providers: FlightSearchProviderSet = {
      cashProvider: {
        id: "cash",
        label: "Cash",
        async searchCashFlights() {
          throw providerError;
        },
      },
      awardProvider: {
        id: "award",
        label: "Award",
        async searchAwardFlights() {
          return [awardOption];
        },
      },
    };

    await expect(searchFlightsWithProviders(search, providers)).rejects.toThrow(
      "Provider failed",
    );
  });
});
