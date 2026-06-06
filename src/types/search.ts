import type { Cabin } from "./flights";

export type TripType = "one_way" | "round_trip";

export interface TripSearch {
  id: string;
  userId: string;
  originCodes: string[];
  destinationCodes: string[];
  departDate: string;
  returnDate?: string;
  tripType: TripType;
  flexibleDays?: number;
  passengers: number;
  cabin: Cabin;
  maxStops?: number;
  createdAt: string;
}

export interface SavedSearch extends TripSearch {
  name: string;
  updatedAt: string;
}
