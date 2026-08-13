import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

export type ProviderStatus =
  | "success"
  | "partial"
  | "no_results"
  | "unsupported_route"
  | "rate_limited"
  | "error"
  | "stale";

export interface ProviderMessage {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface ProviderMetadata {
  providerId: string;
  providerLabel: string;
  searchedAt: string;
  expiresAt?: string;
  isLive: boolean;
  isStale?: boolean;
}

export interface ProviderResultEnvelope<T> {
  status: ProviderStatus;
  data: T[];
  metadata: ProviderMetadata;
  messages: ProviderMessage[];
}

export interface FlightSearchEnvelope {
  cash: ProviderResultEnvelope<CashFlightOption>;
  awards: ProviderResultEnvelope<AwardFlightOption>;
  overallStatus: ProviderStatus;
  messages: ProviderMessage[];
}

export interface CashFlightProvider {
  id: string;
  label: string;
  // Whether this provider calls a live external data source (vs. a
  // deterministic mock generator). Used to correctly label the envelope
  // produced when this provider throws - see createProviderExceptionEnvelope
  // in src/lib/providers/search.ts - so a crashed live provider is never
  // mislabeled as mock/demo data.
  isLive: boolean;
  searchCashFlights(
    search: SavedSearch,
  ): Promise<ProviderResultEnvelope<CashFlightOption>>;
}

export interface AwardFlightProvider {
  id: string;
  label: string;
  isLive: boolean;
  searchAwardFlights(
    search: SavedSearch,
  ): Promise<ProviderResultEnvelope<AwardFlightOption>>;
}

export interface FlightSearchProviderSet {
  cashProvider: CashFlightProvider;
  awardProvider: AwardFlightProvider;
}
