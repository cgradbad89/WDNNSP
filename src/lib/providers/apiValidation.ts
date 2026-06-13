import type { FlightSearchApiErrorResponse } from "@/lib/providers/apiTypes";
import {
  hasSearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import type { Cabin } from "@/types/flights";
import type { SavedSearch, TripType } from "@/types/search";

export const invalidSearchError: FlightSearchApiErrorResponse["error"] = {
  code: "INVALID_SEARCH",
  message: "Choose a supported origin, destination, date, and traveler count.",
};

export type FlightSearchApiValidationResult =
  | {
      ok: true;
      search: SavedSearch;
    }
  | {
      ok: false;
      error: FlightSearchApiErrorResponse["error"];
    };

const cabins = new Set<Cabin>([
  "business",
  "economy",
  "first",
  "premium_economy",
]);
const tripTypes = new Set<TripType>(["one_way", "round_trip"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isTripType(value: unknown): value is TripType {
  return typeof value === "string" && tripTypes.has(value as TripType);
}

function isCabin(value: unknown): value is Cabin {
  return typeof value === "string" && cabins.has(value as Cabin);
}

function isSavedSearchShape(value: unknown): value is SavedSearch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.name === "string" &&
    isStringArray(value.originCodes) &&
    isStringArray(value.destinationCodes) &&
    typeof value.departDate === "string" &&
    isOptionalString(value.returnDate) &&
    isTripType(value.tripType) &&
    isOptionalFiniteNumber(value.flexibleDays) &&
    typeof value.passengers === "number" &&
    Number.isFinite(value.passengers) &&
    isCabin(value.cabin) &&
    isOptionalFiniteNumber(value.maxStops) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function validateFlightSearchApiRequestBody(
  body: unknown,
): FlightSearchApiValidationResult {
  if (!isRecord(body) || !isSavedSearchShape(body.search)) {
    return {
      ok: false,
      error: invalidSearchError,
    };
  }

  const errors = validateSavedSearchInput(body.search);

  if (hasSearchValidationErrors(errors)) {
    return {
      ok: false,
      error: invalidSearchError,
    };
  }

  return {
    ok: true,
    search: body.search,
  };
}
