import type { Cabin } from "@/types/flights";
import type { TripType } from "@/types/search";

// Multi-city is intentionally not offered here. `TripType` (src/types/search.ts)
// only models "one_way" | "round_trip", trip search validation
// (src/lib/search/validation.ts) never branches on a multi-city case, and
// PRD.md section 4 (Non-Goals) and CODEX.md's Non-Goals list both call out
// multi-city itineraries as out of scope. Adding a third toggle option here
// would have no backing search logic.
export interface TripTypeOption {
  value: TripType;
  label: string;
}

export const TRIP_TYPE_OPTIONS: TripTypeOption[] = [
  { value: "round_trip", label: "Round trip" },
  { value: "one_way", label: "One way" },
];

export const CABIN_LABELS: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

const summaryDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function formatSummaryDate(date: string): string | null {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return summaryDateFormatter.format(parsed);
}

/**
 * Compact summary text for the combined dates field trigger, e.g.
 * "May 1 - May 10" or "May 1 - Add return date".
 */
export function formatDateRangeSummary(
  tripType: TripType,
  departDate: string,
  returnDate: string,
): string {
  const formattedDepart = formatSummaryDate(departDate);

  if (tripType === "one_way") {
    return formattedDepart ?? "Add departure date";
  }

  const formattedReturn = formatSummaryDate(returnDate);

  if (!formattedDepart && !formattedReturn) {
    return "Add dates";
  }

  return `${formattedDepart ?? "Add departure date"} - ${
    formattedReturn ?? "Add return date"
  }`;
}

/**
 * Compact summary text for the combined travelers + cabin field trigger,
 * e.g. "2 travelers - Business".
 */
export function formatTravelersCabinSummary(
  passengers: string,
  cabin: Cabin,
): string {
  const passengerCount = Number(passengers);
  const travelerLabel =
    Number.isFinite(passengerCount) && passengerCount > 0
      ? `${passengerCount} traveler${passengerCount === 1 ? "" : "s"}`
      : "Travelers";

  return `${travelerLabel} - ${CABIN_LABELS[cabin]}`;
}
