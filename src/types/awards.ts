import type { Cabin, RouteDetail } from "./flights";

export interface AwardFlightOption {
  id: string;
  source: "seats_aero" | "manual" | "mock" | "other";
  airlineProgram: string;
  operatingAirline?: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  cabin: Cabin;
  pointsRequired: number;
  taxesAndFeesUsd: number;
  transferSources: string[];
  cashComparableUsd?: number;
  centsPerPoint?: number;
  stops: number;
  durationMinutes?: number;
  routeDetail?: RouteDetail;
  confidence: "high" | "medium" | "low";
  bookingUrl?: string;
  lastCheckedAt?: string;
}
