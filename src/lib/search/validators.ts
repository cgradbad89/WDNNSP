import type { Cabin } from "@/types/flights";
import type { SavedSearch, TripType } from "@/types/search";

const cabins: Cabin[] = ["economy", "premium_economy", "business", "first"];
const tripTypes: TripType[] = ["one_way", "round_trip"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isString);
}

function isTripType(value: unknown): value is TripType {
  return isString(value) && tripTypes.includes(value as TripType);
}

function isCabin(value: unknown): value is Cabin {
  return isString(value) && cabins.includes(value as Cabin);
}

function isFiniteNumberAtLeast(
  value: unknown,
  minimum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum
  );
}

export function isSavedSearch(value: unknown): value is SavedSearch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.name) &&
    isNonEmptyStringArray(value.originCodes) &&
    isNonEmptyStringArray(value.destinationCodes) &&
    isString(value.departDate) &&
    (value.returnDate === undefined || isString(value.returnDate)) &&
    isTripType(value.tripType) &&
    (value.flexibleDays === undefined ||
      isFiniteNumberAtLeast(value.flexibleDays, 0)) &&
    isFiniteNumberAtLeast(value.passengers, 1) &&
    isCabin(value.cabin) &&
    (value.maxStops === undefined ||
      isFiniteNumberAtLeast(value.maxStops, 0)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

export function isSavedSearchArray(value: unknown): value is SavedSearch[] {
  return Array.isArray(value) && value.every(isSavedSearch);
}
