import type { FlightSearchEnvelope } from "@/lib/providers/types";
import type { SavedSearch } from "@/types/search";

export interface FlightSearchApiRequest {
  search: SavedSearch;
}

export interface FlightSearchApiSuccessResponse {
  ok: true;
  envelope: FlightSearchEnvelope;
}

export interface FlightSearchApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type FlightSearchApiResponse =
  | FlightSearchApiSuccessResponse
  | FlightSearchApiErrorResponse;
