import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import type { AwardFlightOption } from "@/types/awards";
import type { CanonicalItinerary, CanonicalItinerarySlice } from "@/types/comparison";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

function getDepartureDate(value: string): string {
  return value.slice(0, 10);
}

function createSlice(
  direction: CanonicalItinerarySlice["direction"],
  origin: string,
  destination: string,
  departureDate: string,
): CanonicalItinerarySlice {
  return {
    direction,
    origin,
    destination,
    departureDate,
  };
}

export function createCanonicalItineraryForCashOption(
  search: SavedSearch,
  option: CashFlightOption,
): CanonicalItinerary {
  const slices = [
    createSlice(
      "outbound",
      option.origin,
      option.destination,
      getDepartureDate(option.departureDateTime),
    ),
  ];

  if (search.tripType === "round_trip" && search.returnDate) {
    slices.push(
      createSlice("return", option.destination, option.origin, search.returnDate),
    );
  }

  return {
    id: `cash:${option.id}`,
    searchFingerprint: createSearchFingerprint(search),
    tripType: search.tripType,
    slices,
    totalDurationMinutes: option.durationMinutes,
    totalStops: option.stops,
  };
}

export function createCanonicalItineraryForAwardOption(
  search: SavedSearch,
  option: AwardFlightOption,
): CanonicalItinerary {
  return {
    id: `award:${option.id}`,
    searchFingerprint: createSearchFingerprint(search),
    tripType: option.comparison?.tripType ?? search.tripType,
    slices: [
      createSlice(
        "outbound",
        option.origin,
        option.destination,
        getDepartureDate(option.departureDateTime),
      ),
    ],
    totalDurationMinutes: option.durationMinutes,
    totalStops: option.stops,
  };
}
