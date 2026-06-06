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
  routeDetail?: RouteDetail;
  bookingUrl?: string;
}
