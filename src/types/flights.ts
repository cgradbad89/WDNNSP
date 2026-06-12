import type {
  FreshnessMetadata,
  PriceMoney,
  ProviderLimitation,
  ProviderResultReference,
} from "./providerResults";
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
  source: "duffel" | "amadeus" | "manual" | "mock";
  provider?: ProviderResultReference;
  freshness?: FreshnessMetadata;
  airline: string;
  flightNumbers: string[];
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  stops: number;
  cabin: Cabin;
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
