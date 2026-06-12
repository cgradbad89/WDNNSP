export interface FlightSegment {
  id: string;
  marketingCarrier?: string;
  operatingCarrier?: string;
  flightNumber?: string;
  origin: string;
  destination: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  aircraft?: string;
  cabin?: string;
  bookingClass?: string;
  terminal?: string;
}

export interface FlightLayover {
  airport: string;
  durationMinutes: number;
}

export interface FlightItinerary {
  segments: FlightSegment[];
  layovers: FlightLayover[];
  durationMinutes?: number;
  stopCount: number;
  hasMixedCabin?: boolean;
}
