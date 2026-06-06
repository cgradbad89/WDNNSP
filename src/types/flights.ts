export type Cabin = "economy" | "premium_economy" | "business" | "first";

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
  bookingUrl?: string;
}
