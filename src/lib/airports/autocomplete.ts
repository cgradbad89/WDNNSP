import type { Airport, AirportGroup } from "@/types/airports";

export type AirportSuggestionType = "airport" | "group";

export interface AirportSuggestion {
  type: AirportSuggestionType;
  code: string;
  label: string;
  sublabel: string;
  airportCodes: string[];
}

type RankedSuggestion = AirportSuggestion & {
  rank: number;
  index: number;
};

const DEFAULT_SUGGESTION_LIMIT = 8;

function normalizeForMatch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function fieldIncludesQuery(value: string, query: string): boolean {
  return normalizeForMatch(value).includes(query);
}

function airportMatchesQuery(airport: Airport, query: string): boolean {
  return (
    fieldIncludesQuery(airport.code, query) ||
    fieldIncludesQuery(airport.name, query) ||
    fieldIncludesQuery(airport.city, query) ||
    fieldIncludesQuery(airport.country, query)
  );
}

function airportGroupMatchesQuery(
  airportGroup: AirportGroup,
  query: string,
): boolean {
  return (
    fieldIncludesQuery(airportGroup.code, query) ||
    fieldIncludesQuery(airportGroup.name, query) ||
    airportGroup.airportCodes.some((airportCode) =>
      fieldIncludesQuery(airportCode, query),
    )
  );
}

function getAirportRank(airport: Airport, query: string): number {
  if (normalizeForMatch(airport.code) === query) {
    return 1;
  }

  if (fieldIncludesQuery(airport.code, query)) {
    return 4;
  }

  if (fieldIncludesQuery(airport.city, query)) {
    return 5;
  }

  if (fieldIncludesQuery(airport.name, query)) {
    return 6;
  }

  return 7;
}

function getAirportGroupRank(
  airportGroup: AirportGroup,
  query: string,
): number {
  if (normalizeForMatch(airportGroup.code) === query) {
    return 0;
  }

  if (
    airportGroup.airportCodes.some(
      (airportCode) => normalizeForMatch(airportCode) === query,
    )
  ) {
    return 2;
  }

  if (fieldIncludesQuery(airportGroup.code, query)) {
    return 3;
  }

  if (fieldIncludesQuery(airportGroup.name, query)) {
    return 4;
  }

  return 8;
}

export function normalizeAirportQuery(query: string): string {
  return normalizeForMatch(query);
}

export function getAirportSuggestions(
  query: string,
  airports: Airport[],
  airportGroups: AirportGroup[],
  limit = DEFAULT_SUGGESTION_LIMIT,
): AirportSuggestion[] {
  const normalizedQuery = normalizeAirportQuery(query);

  if (!normalizedQuery || limit <= 0) {
    return [];
  }

  const seenCodes = new Set<string>();
  const suggestions: RankedSuggestion[] = [];

  airportGroups.forEach((airportGroup, index) => {
    if (!airportGroupMatchesQuery(airportGroup, normalizedQuery)) {
      return;
    }

    const normalizedCode = normalizeForMatch(airportGroup.code);

    if (seenCodes.has(normalizedCode)) {
      return;
    }

    seenCodes.add(normalizedCode);
    suggestions.push({
      type: "group",
      code: normalizedCode,
      label: `${normalizedCode} — ${airportGroup.name}`,
      sublabel: airportGroup.airportCodes.map(normalizeForMatch).join(" · "),
      airportCodes: airportGroup.airportCodes.map(normalizeForMatch),
      rank: getAirportGroupRank(airportGroup, normalizedQuery),
      index,
    });
  });

  airports.forEach((airport, index) => {
    if (!airportMatchesQuery(airport, normalizedQuery)) {
      return;
    }

    const normalizedCode = normalizeForMatch(airport.code);

    if (seenCodes.has(normalizedCode)) {
      return;
    }

    seenCodes.add(normalizedCode);
    suggestions.push({
      type: "airport",
      code: normalizedCode,
      label: `${normalizedCode} — ${airport.name}`,
      sublabel: `${airport.city}, ${airport.country}`,
      airportCodes: [normalizedCode],
      rank: getAirportRank(airport, normalizedQuery),
      index: airportGroups.length + index,
    });
  });

  return suggestions
    .toSorted((firstSuggestion, secondSuggestion) => {
      if (firstSuggestion.rank !== secondSuggestion.rank) {
        return firstSuggestion.rank - secondSuggestion.rank;
      }

      return firstSuggestion.index - secondSuggestion.index;
    })
    .slice(0, limit)
    .map((suggestion) => ({
      type: suggestion.type,
      code: suggestion.code,
      label: suggestion.label,
      sublabel: suggestion.sublabel,
      airportCodes: suggestion.airportCodes,
    }));
}

export function isSupportedAirportSelection(
  code: string,
  airports: Airport[],
  airportGroups: AirportGroup[],
): boolean {
  const normalizedCode = normalizeAirportQuery(code);

  if (!normalizedCode) {
    return false;
  }

  return (
    airports.some((airport) => normalizeForMatch(airport.code) === normalizedCode) ||
    airportGroups.some(
      (airportGroup) => normalizeForMatch(airportGroup.code) === normalizedCode,
    )
  );
}
