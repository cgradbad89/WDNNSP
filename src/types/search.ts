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

// ActiveSearch is the current unsaved or saved search being used for results.
// It intentionally shares the SavedSearch shape for now so Results can save it
// later. Firestore may separate active/session searches from saved searches.
export type ActiveSearch = SavedSearch;
