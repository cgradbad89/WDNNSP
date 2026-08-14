import type { AwardAvailabilityStatus } from "@/types/awards";
import type { Cabin } from "@/types/flights";
import type { TripType } from "@/types/search";

export type ComparabilityStatus = "comparable" | "not_comparable" | "unknown";

export type ComparabilityReason =
  | "trip_type_mismatch"
  | "date_mismatch"
  | "return_date_missing"
  | "passenger_mismatch"
  | "cabin_mismatch"
  | "unknown_award_fees"
  | "missing_cash_price"
  | "missing_award_points"
  | "unresolved_program"
  | "availability_not_bookable"
  | "provider_benchmark_only"
  | "unknown_itinerary_relationship";

export interface ComparabilityResult {
  status: ComparabilityStatus;
  reasons: ComparabilityReason[];
}

export interface ComparisonMetadata {
  searchFingerprint?: string;
  tripType?: TripType;
  passengerCount?: number;
  cabin?: Cabin;
  cabinConfirmed?: boolean;
  isExactDateComparable?: boolean;
  isBenchmarkOnly?: boolean;
  availabilityStatus?: AwardAvailabilityStatus;
}

export interface CanonicalItinerary {
  id: string;
  searchFingerprint: string;
  tripType: TripType;
  slices: CanonicalItinerarySlice[];
  totalDurationMinutes?: number;
  totalStops?: number;
}

export interface CanonicalItinerarySlice {
  direction: "outbound" | "return";
  origin: string;
  destination: string;
  departureDate: string;
  legs?: CanonicalFlightLeg[];
}

export interface CanonicalFlightLeg {
  marketingCarrier?: string;
  operatingCarrier?: string;
  flightNumber?: string;
  origin: string;
  destination: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  durationMinutes?: number;
}
