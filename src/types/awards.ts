import type { Cabin, RouteDetail } from "./flights";
import type {
  FreshnessMetadata,
  PriceMoney,
  ProviderLimitation,
  ProviderResultReference,
} from "./providerResults";
import type { FlightItinerary } from "./routes";

export type AwardAvailabilityStatus =
  | "available"
  | "limited"
  | "waitlist"
  | "unavailable"
  | "unknown"
  | "stale";

export interface AwardFlightOption {
  id: string;
  source: "seats_aero" | "manual" | "mock" | "other";
  provider?: ProviderResultReference;
  freshness?: FreshnessMetadata;
  airlineProgram: string;
  operatingAirline?: string;
  marketingAirline?: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  cabin: Cabin;
  pointsRequired: number;
  taxesAndFeesUsd: number;
  fees?: PriceMoney;
  taxesAndFees?: PriceMoney;
  transferSources: string[];
  sourceProgramId?: string;
  sourceProgramLabel?: string;
  cashComparableUsd?: number;
  centsPerPoint?: number;
  stops: number;
  durationMinutes?: number;
  routeDetail?: RouteDetail;
  itinerary?: FlightItinerary;
  confidence: "high" | "medium" | "low";
  availabilityStatus?: AwardAvailabilityStatus;
  availableSeats?: number;
  limitations?: ProviderLimitation[];
  bookingUrl?: string;
  lastCheckedAt?: string;
}
