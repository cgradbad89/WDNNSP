import type { SavedSearch } from "@/types/search";
import { combineProviderEnvelopes } from "@/lib/providers/status";
import type {
  AwardFlightProvider,
  CashFlightProvider,
  FlightSearchEnvelope,
  FlightSearchProviderSet,
  ProviderResultEnvelope,
} from "@/lib/providers/types";

function createProviderExceptionEnvelope<T>({
  isLive,
  providerId,
  providerLabel,
  providerType,
}: {
  isLive: boolean;
  providerId: string;
  providerLabel: string;
  providerType: "cash" | "award";
}): ProviderResultEnvelope<T> {
  const providerTypeLabel = providerType === "cash" ? "Cash" : "Award";

  return {
    // A thrown live-provider call is a genuine failure, not mock data - the
    // "error" status (rather than falsely reporting isLive: false, which
    // would render as "Demo data" in the UI) is what tells the UI to show
    // an unavailable/error state instead.
    status: "error",
    data: [],
    metadata: {
      providerId,
      providerLabel,
      searchedAt: new Date().toISOString(),
      isLive,
    },
    messages: [
      {
        code: `${providerId}_exception`,
        severity: "error",
        message: `${providerTypeLabel} provider failed unexpectedly.`,
      },
    ],
  };
}

async function searchCashProvider(
  provider: CashFlightProvider,
  search: SavedSearch,
): Promise<Awaited<ReturnType<CashFlightProvider["searchCashFlights"]>>> {
  try {
    return await provider.searchCashFlights(search);
  } catch {
    return createProviderExceptionEnvelope({
      isLive: provider.isLive,
      providerId: provider.id,
      providerLabel: provider.label,
      providerType: "cash",
    });
  }
}

async function searchAwardProvider(
  provider: AwardFlightProvider,
  search: SavedSearch,
): Promise<Awaited<ReturnType<AwardFlightProvider["searchAwardFlights"]>>> {
  try {
    return await provider.searchAwardFlights(search);
  } catch {
    return createProviderExceptionEnvelope({
      isLive: provider.isLive,
      providerId: provider.id,
      providerLabel: provider.label,
      providerType: "award",
    });
  }
}

export async function searchFlightsWithProviders(
  search: SavedSearch,
  providers: FlightSearchProviderSet,
): Promise<FlightSearchEnvelope> {
  const [cash, awards] = await Promise.all([
    searchCashProvider(providers.cashProvider, search),
    searchAwardProvider(providers.awardProvider, search),
  ]);

  return {
    cash,
    awards,
    overallStatus: combineProviderEnvelopes(cash, awards),
    messages: [...cash.messages, ...awards.messages],
  };
}
