import {
  getMockAwardOptionsForSearch,
  getMockCashOptionForSearch,
} from "@/data/mockResults";
import type {
  AwardFlightProvider,
  CashFlightProvider,
  FlightSearchProviderSet,
  ProviderMessage,
  ProviderResultEnvelope,
} from "@/lib/providers/types";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

const MOCK_PROVIDER_SEARCHED_AT = "2026-06-12T00:00:00.000Z";
const MOCK_CASH_PROVIDER_ID = "mock-cash";
const MOCK_CASH_PROVIDER_LABEL = "Mock Cash Provider";
const MOCK_AWARD_PROVIDER_ID = "mock-awards";
const MOCK_AWARD_PROVIDER_LABEL = "Mock Award Provider";

const mockDataMessage: ProviderMessage = {
  code: "mock_data",
  severity: "info",
  message: "Using mock flight data.",
};

const mockAwardVerificationMessage: ProviderMessage = {
  code: "verify_award_availability",
  severity: "warning",
  message: "Verify award availability directly before transferring points.",
};

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

function createMockProviderEnvelope<T>({
  data,
  messages,
  providerId,
  providerLabel,
}: {
  data: T[];
  messages: ProviderMessage[];
  providerId: string;
  providerLabel: string;
}): ProviderResultEnvelope<T> {
  return {
    status: data.length > 0 ? "success" : "no_results",
    data,
    metadata: {
      providerId,
      providerLabel,
      searchedAt: MOCK_PROVIDER_SEARCHED_AT,
      isLive: false,
    },
    messages,
  };
}

export const mockCashFlightProvider: CashFlightProvider = {
  id: MOCK_CASH_PROVIDER_ID,
  label: MOCK_CASH_PROVIDER_LABEL,
  async searchCashFlights(search) {
    return createMockProviderEnvelope({
      data: getMockCashFlightsForSearch(search),
      messages: [mockDataMessage],
      providerId: MOCK_CASH_PROVIDER_ID,
      providerLabel: MOCK_CASH_PROVIDER_LABEL,
    });
  },
};

export const mockAwardFlightProvider: AwardFlightProvider = {
  id: MOCK_AWARD_PROVIDER_ID,
  label: MOCK_AWARD_PROVIDER_LABEL,
  async searchAwardFlights(search) {
    return createMockProviderEnvelope({
      data: getMockAwardFlightsForSearch(search),
      messages: [mockDataMessage, mockAwardVerificationMessage],
      providerId: MOCK_AWARD_PROVIDER_ID,
      providerLabel: MOCK_AWARD_PROVIDER_LABEL,
    });
  },
};

export const mockFlightSearchProviderSet: FlightSearchProviderSet = {
  cashProvider: mockCashFlightProvider,
  awardProvider: mockAwardFlightProvider,
};
