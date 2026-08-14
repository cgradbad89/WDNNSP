import type {
  FreshnessMetadata,
  PriceMoney,
  ProviderLimitation,
  ProviderResultReference,
} from "./providerResults";
import type { ComparisonMetadata } from "./comparison";
import type { FlightItinerary } from "./routes";

export type Cabin = "economy" | "premium_economy" | "business" | "first";

export interface FlightSegment {
  id: string;
  flightNumber?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface LayoverDetail {
  airport: string;
  durationMinutes: number;
}

export interface RouteDetail {
  segments: FlightSegment[];
  layovers: LayoverDetail[];
  totalDurationMinutes: number;
}

export interface CashFlightOption {
  id: string;
  source: "duffel" | "travelpayouts" | "manual" | "mock";
  provider?: ProviderResultReference;
  freshness?: FreshnessMetadata;
  airline: string;
  flightNumbers: string[];
  origin: string;
  destination: string;
  departureDateTime: string;
  // Undefined means the provider did not report this field - never fabricate
  // a value (0, same-as-departure, etc.) as a placeholder. See
  // src/lib/providers/travelpayouts.ts for a provider that genuinely can't
  // confirm these.
  arrivalDateTime?: string;
  durationMinutes?: number;
  stops?: number;
  cabin: Cabin;
  // True/omitted: cabin is a provider-confirmed fare attribute. False: the
  // provider does not confirm cabin, and `cabin` is only the cabin the user
  // searched for, echoed back - do not present it as confirmed.
  cabinConfirmed?: boolean;
  comparison?: ComparisonMetadata;
  cashPriceUsd: number;
  price?: PriceMoney;
  priceBreakdown?: {
    base?: PriceMoney;
    taxesAndFees?: PriceMoney;
    total?: PriceMoney;
  };
  fareBrand?: string;
  fareRulesSummary?: string[];
  baggageSummary?: string;
  itinerary?: FlightItinerary;
  limitations?: ProviderLimitation[];
  routeDetail?: RouteDetail;
  bookingUrl?: string;
}
