import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { AIRPORTS } from "@/data/airports";
import { isSupportedAirportSelection } from "@/lib/airports/autocomplete";
import { expandAirportCode } from "@/lib/airports/groups";
import type { Cabin } from "@/types/flights";
import type { SavedSearch, TripSearch } from "@/types/search";

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

export interface SavedSearchSupportStatus {
  isSupported: boolean;
  originSupported: boolean;
  destinationSupported: boolean;
  sameRoute: boolean;
  message?: string;
}

function normalizeCodes(codes: string[] | undefined): string[] {
  if (!codes) {
    return [];
  }

  return codes
    .flatMap((code) => expandAirportCode(code, AIRPORT_GROUPS))
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeSelections(codes: string[] | undefined): string[] {
  if (!codes) {
    return [];
  }

  return codes.map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function containsSharedCode(leftCodes: string[], rightCodes: string[]): boolean {
  const rightCodeSet = new Set(rightCodes);

  return leftCodes.some((code) => rightCodeSet.has(code));
}

function hasUnsupportedSelection(codes: string[]): boolean {
  return codes.some(
    (code) => !isSupportedAirportSelection(code, AIRPORTS, AIRPORT_GROUPS),
  );
}

export function getSavedSearchSupportStatus(
  search: SavedSearch,
): SavedSearchSupportStatus {
  const originSelections = normalizeSelections(search.originCodes);
  const destinationSelections = normalizeSelections(search.destinationCodes);
  const originCodes = normalizeCodes(search.originCodes);
  const destinationCodes = normalizeCodes(search.destinationCodes);
  const originSupported =
    originSelections.length > 0 && !hasUnsupportedSelection(originSelections);
  const destinationSupported =
    destinationSelections.length > 0 &&
    !hasUnsupportedSelection(destinationSelections);
  const sameRoute =
    originCodes.length > 0 &&
    destinationCodes.length > 0 &&
    containsSharedCode(originCodes, destinationCodes);
  const isSupported = originSupported && destinationSupported && !sameRoute;
  let message: string | undefined;

  if (!originSupported) {
    message = "Needs update: choose a supported origin airport or metro area.";
  } else if (!destinationSupported) {
    message =
      "Needs update: choose a supported destination airport or metro area.";
  } else if (sameRoute) {
    message = "Needs update: origin and destination cannot be the same.";
  } else if (!isSupported) {
    message = "Needs update before running.";
  }

  return {
    isSupported,
    originSupported,
    destinationSupported,
    sameRoute,
    message,
  };
}

export function validateSavedSearchInput(
  input: Partial<TripSearch> & { name?: string },
): SearchValidationErrors {
  const errors: SearchValidationErrors = {};
  const originSelections = normalizeSelections(input.originCodes);
  const destinationSelections = normalizeSelections(input.destinationCodes);
  const originCodes = normalizeCodes(input.originCodes);
  const destinationCodes = normalizeCodes(input.destinationCodes);

  if (!input.name?.trim()) {
    errors.name = "Name is required.";
  }

  if (originSelections.length === 0) {
    errors.originCodes = "Origin is required.";
  } else if (hasUnsupportedSelection(originSelections)) {
    errors.originCodes = "Choose a supported origin airport or metro area.";
  }

  if (destinationSelections.length === 0) {
    errors.destinationCodes = "Destination is required.";
  } else if (hasUnsupportedSelection(destinationSelections)) {
    errors.destinationCodes =
      "Choose a supported destination airport or metro area.";
  }

  if (
    !errors.originCodes &&
    !errors.destinationCodes &&
    originCodes.length > 0 &&
    destinationCodes.length > 0 &&
    containsSharedCode(originCodes, destinationCodes)
  ) {
    errors.destinationCodes = "Origin and destination cannot be the same.";
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
