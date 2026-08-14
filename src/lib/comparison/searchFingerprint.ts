import type { SavedSearch } from "@/types/search";

function normalizeCodes(codes: string[]): string {
  return codes
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .toSorted()
    .join(",");
}

export function createSearchFingerprint(search: SavedSearch): string {
  return [
    `origins=${normalizeCodes(search.originCodes)}`,
    `destinations=${normalizeCodes(search.destinationCodes)}`,
    `trip=${search.tripType}`,
    `depart=${search.departDate}`,
    `return=${search.tripType === "round_trip" ? search.returnDate ?? "" : ""}`,
    `passengers=${Math.max(1, search.passengers)}`,
    `cabin=${search.cabin}`,
    `maxStops=${search.maxStops ?? "any"}`,
  ].join("|");
}
