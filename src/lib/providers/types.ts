import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

export interface CashFlightProvider {
  id: string;
  label: string;
  searchCashFlights(search: SavedSearch): Promise<CashFlightOption[]>;
}

export interface AwardFlightProvider {
  id: string;
  label: string;
  searchAwardFlights(search: SavedSearch): Promise<AwardFlightOption[]>;
}

export interface FlightSearchProviderSet {
  cashProvider: CashFlightProvider;
  awardProvider: AwardFlightProvider;
}
