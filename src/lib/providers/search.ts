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
  providerId,
  providerLabel,
  providerType,
}: {
  providerId: string;
  providerLabel: string;
  providerType: "cash" | "award";
}): ProviderResultEnvelope<T> {
  const providerTypeLabel = providerType === "cash" ? "Cash" : "Award";

  return {
    status: "error",
    data: [],
    metadata: {
      providerId,
      providerLabel,
      searchedAt: new Date().toISOString(),
      isLive: false,
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
