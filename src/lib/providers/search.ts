import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";
import type { FlightSearchProviderSet } from "@/lib/providers/types";

export interface FlightSearchResults {
  cashOptions: CashFlightOption[];
  awardOptions: AwardFlightOption[];
}

export async function searchFlightsWithProviders(
  search: SavedSearch,
  providers: FlightSearchProviderSet,
): Promise<FlightSearchResults> {
  const [cashOptions, awardOptions] = await Promise.all([
    providers.cashProvider.searchCashFlights(search),
    providers.awardProvider.searchAwardFlights(search),
  ]);

  return {
    cashOptions,
    awardOptions,
  };
}
