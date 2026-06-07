import {
  getMockAwardOptionsForSearch,
  getMockCashOptionForSearch,
} from "@/data/mockResults";
import type {
  AwardFlightProvider,
  CashFlightProvider,
  FlightSearchProviderSet,
} from "@/lib/providers/types";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

export function getMockCashFlightsForSearch(
  search: SavedSearch,
): CashFlightOption[] {
  return [getMockCashOptionForSearch(search)];
}

export function getMockAwardFlightsForSearch(
  search: SavedSearch,
): AwardFlightOption[] {
  return getMockAwardOptionsForSearch(search);
}

export const mockCashFlightProvider: CashFlightProvider = {
  id: "mock-cash",
  label: "Mock cash flight provider",
  async searchCashFlights(search) {
    return getMockCashFlightsForSearch(search);
  },
};

export const mockAwardFlightProvider: AwardFlightProvider = {
  id: "mock-awards",
  label: "Mock award flight provider",
  async searchAwardFlights(search) {
    return getMockAwardFlightsForSearch(search);
  },
};

export const mockFlightSearchProviderSet: FlightSearchProviderSet = {
  cashProvider: mockCashFlightProvider,
  awardProvider: mockAwardFlightProvider,
};
