import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { expandAirportCode } from "@/lib/airports/groups";
import type { Cabin } from "@/types/flights";
import type { TripSearch } from "@/types/search";

const cabins: Cabin[] = ["economy", "premium_economy", "business", "first"];

export type SearchValidationErrors = Partial<
  Record<
    | "name"
    | "originCodes"
    | "destinationCodes"
    | "departDate"
    | "returnDate"
    | "passengers"
    | "cabin"
    | "maxStops"
    | "flexibleDays",
    string
  >
>;

function normalizeCodes(codes: string[] | undefined): string[] {
  if (!codes) {
    return [];
  }

  return codes
    .flatMap((code) => expandAirportCode(code, AIRPORT_GROUPS))
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function containsSharedCode(leftCodes: string[], rightCodes: string[]): boolean {
  const rightCodeSet = new Set(rightCodes);

  return leftCodes.some((code) => rightCodeSet.has(code));
}

export function validateSavedSearchInput(
  input: Partial<TripSearch> & { name?: string },
): SearchValidationErrors {
  const errors: SearchValidationErrors = {};
  const originCodes = normalizeCodes(input.originCodes);
  const destinationCodes = normalizeCodes(input.destinationCodes);

  if (!input.name?.trim()) {
    errors.name = "Name is required.";
  }

  if (originCodes.length === 0) {
    errors.originCodes = "Origin is required.";
  }

  if (destinationCodes.length === 0) {
    errors.destinationCodes = "Destination is required.";
  }

  if (
    originCodes.length > 0 &&
    destinationCodes.length > 0 &&
    containsSharedCode(originCodes, destinationCodes)
  ) {
    errors.destinationCodes =
      "Origin and destination cannot include the same airport.";
  }

  if (!input.departDate) {
    errors.departDate = "Departure date is required.";
  }

  if (input.tripType === "round_trip" && !input.returnDate) {
    errors.returnDate = "Return date is required for round trips.";
  }

  if (
    input.departDate &&
    input.returnDate &&
    input.returnDate < input.departDate
  ) {
    errors.returnDate = "Return date cannot be before departure date.";
  }

  if (
    input.passengers === undefined ||
    !Number.isFinite(input.passengers) ||
    input.passengers < 1
  ) {
    errors.passengers = "Passengers must be at least 1.";
  }

  if (!input.cabin || !cabins.includes(input.cabin)) {
    errors.cabin = "Cabin is required.";
  }

  if (
    input.maxStops !== undefined &&
    (!Number.isFinite(input.maxStops) || input.maxStops < 0)
  ) {
    errors.maxStops = "Max stops must be 0 or greater.";
  }

  if (
    input.flexibleDays !== undefined &&
    (!Number.isFinite(input.flexibleDays) || input.flexibleDays < 0)
  ) {
    errors.flexibleDays = "Flexible days must be 0 or greater.";
  }

  return errors;
}

export function hasSearchValidationErrors(
  errors: SearchValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}
