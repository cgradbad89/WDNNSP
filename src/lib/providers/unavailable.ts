import type {
  CashFlightProvider,
  ProviderMessage,
  ProviderResultEnvelope,
} from "@/lib/providers/types";
import type { CashFlightOption } from "@/types/flights";

interface UnavailableCashProviderConfig {
  id: string;
  isLive?: boolean;
  label: string;
  message: ProviderMessage;
}

function createUnavailableCashEnvelope({
  id,
  isLive = true,
  label,
  message,
}: UnavailableCashProviderConfig): ProviderResultEnvelope<CashFlightOption> {
  return {
    status: "error",
    data: [],
    metadata: {
      providerId: id,
      providerLabel: label,
      searchedAt: new Date().toISOString(),
      isLive,
    },
    messages: [message],
  };
}

export function createUnavailableCashFlightProvider(
  config: UnavailableCashProviderConfig,
): CashFlightProvider {
  return {
    id: config.id,
    label: config.label,
    isLive: config.isLive ?? true,
    async searchCashFlights() {
      return createUnavailableCashEnvelope(config);
    },
  };
}
