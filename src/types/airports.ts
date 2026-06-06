export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timeZone?: string;
  latitude?: number;
  longitude?: number;
}

export interface AirportGroup {
  code: string;
  name: string;
  airportCodes: string[];
}
