import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { getCardProgramsForAirline } from "@/lib/transferPartners/lookup";
import { normalizeLoyaltyProgram } from "@/lib/points/loyaltyPrograms";
import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import type {
  AwardFlightProvider,
  ProviderMessage,
  ProviderResultEnvelope,
} from "@/lib/providers/types";
import type { Cabin } from "@/types/flights";
import type { AwardFlightOption } from "@/types/awards";
import type { ProviderLimitation } from "@/types/providerResults";
import type { SavedSearch } from "@/types/search";

// Seats.aero Partner API — "Cached Search" endpoint (Pro-tier access).
// Docs: https://developers.seats.aero/reference/cached-search
//
// IMPORTANT — Live Search is out of scope. Seats.aero also offers a
// "Live Search" endpoint, but it requires a separate commercial agreement
// this project does not have. Only Cached Search (and, in the future, Bulk
// Availability) may be called. Do not add a Live Search call here.
//
// Field/endpoint names below were confirmed against the live docs during
// this session (2026-08-11) and differ from the placeholder shape this
// module was originally scoped against:
//   - Base URL is GET https://seats.aero/partnerapi/search (not documented
//     anywhere else in this repo before now).
//   - The cabin filter query param is `cabins` (plural), not `cabin`.
//   - The nonstop filter query param is `only_direct_flights`, not
//     `only_direct`.
//   - There is no `ComputedLastSeen` field on a result. The closest
//     equivalent is the per-result `UpdatedAt` timestamp.
//   - The per-cabin "direct" fields (`YDirect`/`WDirect`/`JDirect`/`FDirect`)
//     are booleans ("does a nonstop option exist in this cabin?"), not
//     numeric direct-flight counts as `YDirects` etc. would imply.
const SEATS_AERO_PROVIDER_ID = "seats-aero";
const SEATS_AERO_PROVIDER_LABEL = "Seats.aero";
const SEATS_AERO_CACHED_SEARCH_URL = "https://seats.aero/partnerapi/search";

function getTransferSourcesForProgramId(programId: string | undefined): string[] {
  if (!programId) {
    return [];
  }

  const cardPartners = getCardProgramsForAirline(
    programId,
    TRANSFER_PARTNERS,
  );

  return [...new Set(cardPartners.map((partner) => partner.fromProgram))];
}

type SeatsAeroCabinKey = "Y" | "W" | "J" | "F";

const CABIN_BY_SEATS_AERO_KEY: Record<SeatsAeroCabinKey, Cabin> = {
  Y: "economy",
  W: "premium_economy",
  J: "business",
  F: "first",
};

const SEATS_AERO_KEY_BY_CABIN: Record<Cabin, SeatsAeroCabinKey> = {
  economy: "Y",
  premium_economy: "W",
  business: "J",
  first: "F",
};

const SEATS_AERO_CABIN_KEYS: SeatsAeroCabinKey[] = ["Y", "W", "J", "F"];

interface SeatsAeroRoute {
  ID?: string;
  OriginAirport: string;
  DestinationAirport: string;
  Source: string;
}

// Matches the confirmed Cached Search response schema. Some fields
// (OriginRegion, DestinationRegion, NumDaysOut, Distance, RouteID,
// ParsedDate, CreatedAt, AvailabilityTrips, per-cabin *Airlines arrays) exist
// on the live response but are not needed for this mapping and are omitted
// here rather than modeled speculatively.
interface SeatsAeroAvailabilityResult {
  ID: string;
  Route: SeatsAeroRoute;
  Date: string;
  YAvailable: boolean;
  WAvailable: boolean;
  JAvailable: boolean;
  FAvailable: boolean;
  YMileageCost?: string;
  WMileageCost?: string;
  JMileageCost?: string;
  FMileageCost?: string;
  YRemainingSeats?: number;
  WRemainingSeats?: number;
  JRemainingSeats?: number;
  FRemainingSeats?: number;
  YDirect?: boolean;
  WDirect?: boolean;
  JDirect?: boolean;
  FDirect?: boolean;
  Source: string;
  UpdatedAt?: string;
}

interface SeatsAeroCachedSearchResponse {
  data: SeatsAeroAvailabilityResult[];
  count: number;
  hasMore: boolean;
  cursor: number;
}

interface SeatsAeroCabinFields {
  available: boolean;
  mileageCost?: string;
  remainingSeats?: number;
  direct?: boolean;
}

// SeatsAeroAvailabilityResult has one literal Y/W/J/F-prefixed property per
// field rather than an index signature (matching the real API response
// shape), so cabin lookups go through this explicit switch instead of
// dynamic `result[`${cabinKey}Field`]` indexing.
function getCabinFields(
  result: SeatsAeroAvailabilityResult,
  cabinKey: SeatsAeroCabinKey,
): SeatsAeroCabinFields {
  switch (cabinKey) {
    case "Y":
      return {
        available: result.YAvailable,
        mileageCost: result.YMileageCost,
        remainingSeats: result.YRemainingSeats,
        direct: result.YDirect,
      };
    case "W":
      return {
        available: result.WAvailable,
        mileageCost: result.WMileageCost,
        remainingSeats: result.WRemainingSeats,
        direct: result.WDirect,
      };
    case "J":
      return {
        available: result.JAvailable,
        mileageCost: result.JMileageCost,
        remainingSeats: result.JRemainingSeats,
        direct: result.JDirect,
      };
    case "F":
      return {
        available: result.FAvailable,
        mileageCost: result.FMileageCost,
        remainingSeats: result.FRemainingSeats,
        direct: result.FDirect,
      };
  }
}

const seatsAeroVerifyLimitation: ProviderLimitation = {
  code: "seats_aero_partial_data",
  severity: "warning",
  message:
    "Seats.aero Cached Search returns date-level availability, not scheduled flight times, exact stop counts, taxes/fees, or transfer-partner mapping. These fields are shown as placeholders — verify directly before transferring points.",
};

const successMessage: ProviderMessage = {
  code: "seats_aero_cached_data",
  severity: "info",
  message: "Live Seats.aero award availability (cached, not a live per-search shop).",
};

const verifyAvailabilityMessage: ProviderMessage = {
  code: "verify_award_availability",
  severity: "warning",
  message: "Verify award availability directly before transferring points.",
};

const noResultsMessage: ProviderMessage = {
  code: "seats_aero_no_results",
  severity: "info",
  message: "Seats.aero did not return cached award availability for this route.",
};

const missingKeyMessage: ProviderMessage = {
  code: "seats_aero_not_configured",
  severity: "error",
  message: "Live award provider is not configured.",
};

const unsupportedRouteMessage: ProviderMessage = {
  code: "seats_aero_unsupported_route",
  severity: "warning",
  message: "This route is not supported by the live award provider.",
};

const authErrorMessage: ProviderMessage = {
  code: "seats_aero_auth_error",
  severity: "error",
  message: "Live award provider request failed authentication.",
};

const rateLimitedMessage: ProviderMessage = {
  code: "seats_aero_rate_limited",
  severity: "warning",
  message: "Live award provider rate limit reached. Try again shortly.",
};

const requestFailedMessage: ProviderMessage = {
  code: "seats_aero_request_failed",
  severity: "error",
  message: "Live award provider request failed.",
};

function buildEnvelope({
  status,
  data,
  messages,
}: {
  status: ProviderResultEnvelope<AwardFlightOption>["status"];
  data: AwardFlightOption[];
  messages: ProviderMessage[];
}): ProviderResultEnvelope<AwardFlightOption> {
  return {
    status,
    data,
    metadata: {
      providerId: SEATS_AERO_PROVIDER_ID,
      providerLabel: SEATS_AERO_PROVIDER_LABEL,
      searchedAt: new Date().toISOString(),
      isLive: true,
    },
    messages,
  };
}

function mapResultCabinToAwardOption({
  result,
  cabinKey,
  passengers,
  search,
  searchedAt,
}: {
  result: SeatsAeroAvailabilityResult;
  cabinKey: SeatsAeroCabinKey;
  passengers: number;
  search: SavedSearch;
  searchedAt: string;
}): AwardFlightOption | null {
  const cabinFields = getCabinFields(result, cabinKey);
  const mileageCost = cabinFields.mileageCost
    ? Number(cabinFields.mileageCost)
    : NaN;

  if (!Number.isFinite(mileageCost)) {
    return null;
  }

  const isDirect = cabinFields.direct === true;
  const remainingSeats = cabinFields.remainingSeats;
  const rawProgram = result.Route.Source || result.Source;
  const programNormalization = normalizeLoyaltyProgram({
    provider: SEATS_AERO_PROVIDER_ID,
    rawProgramId: rawProgram,
    rawProgramName: rawProgram,
  });
  const airlineProgram = programNormalization.displayName ?? rawProgram;
  const departureDateTime = `${result.Date}T00:00:00Z`;
  const limitations = isDirect
    ? [seatsAeroVerifyLimitation]
    : [
        seatsAeroVerifyLimitation,
        {
          code: "seats_aero_stop_count_unconfirmed",
          severity: "info" as const,
          message:
            "Seats.aero only flags whether a nonstop option exists in this cabin; the exact stop count for connecting itineraries is not confirmed.",
        },
      ];

  if (!programNormalization.isResolved) {
    limitations.push({
      code: "unresolved_program",
      severity: "warning",
      message:
        "Seats.aero returned a mileage-program slug WDNNSP cannot map to a canonical loyalty program, so transfer matching and value comparison are limited.",
    });
  }

  return {
    id: `seatsaero-${result.ID}-${cabinKey.toLowerCase()}`,
    source: "seats_aero",
    provider: {
      providerId: SEATS_AERO_PROVIDER_ID,
      providerLabel: SEATS_AERO_PROVIDER_LABEL,
      resultId: result.ID,
    },
    freshness: {
      searchedAt,
      lastCheckedAt: result.UpdatedAt ?? searchedAt,
      isLive: true,
      isStale: false,
    },
    airlineProgram,
    origin: result.Route.OriginAirport,
    destination: result.Route.DestinationAirport,
    // Cached Search reports date-level availability only, not a scheduled
    // departure/arrival time. Using midnight UTC on the reported date as an
    // explicit placeholder (flagged via `limitations` below) rather than
    // guessing a real flight time.
    departureDateTime,
    arrivalDateTime: departureDateTime,
    cabin: CABIN_BY_SEATS_AERO_KEY[cabinKey],
    pointsRequired: Math.round(mileageCost * passengers),
    // Seats.aero Cached Search does not return taxes/fees. Left undefined
    // (not a fabricated $0) so scoring and the UI treat this as unknown
    // rather than the best-case "no fees" outcome. Flagged via
    // `limitations` below.
    ...(isDirect ? { stops: 0 } : {}),
    // `YDirect`/etc. only confirms whether a nonstop option exists in this
    // cabin - it does NOT confirm the stop count when it's false, so `stops`
    // is left undefined (not a fabricated 0) whenever nonstop isn't
    // confirmed, matching this repo's "unreported means undefined"
    // convention (see src/lib/providers/travelpayouts.ts). Flagged via
    // `limitations` when unconfirmed.
    // Cached Search has no confidence/quality signal of its own. A uniform
    // hardcoded "medium" for every result would be exactly the kind of
    // fabricated plausible-looking default this field must avoid, so
    // confidence is left undefined (genuinely unknown) rather than guessed.
    availabilityStatus: "available",
    ...(typeof remainingSeats === "number" ? { availableSeats: remainingSeats } : {}),
    transferSources: getTransferSourcesForProgramId(
      programNormalization.programId,
    ),
    ...(programNormalization.programId
      ? { sourceProgramId: programNormalization.programId }
      : {}),
    sourceProgramLabel: airlineProgram,
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
      tripType: search.tripType === "round_trip" ? "one_way" : search.tripType,
      passengerCount: passengers,
      cabin: CABIN_BY_SEATS_AERO_KEY[cabinKey],
      cabinConfirmed: true,
      isExactDateComparable: true,
      isBenchmarkOnly: false,
      availabilityStatus: "available",
    },
    limitations,
    lastCheckedAt: result.UpdatedAt ?? searchedAt,
  };
}

function mapResultToAwardOptions(
  result: SeatsAeroAvailabilityResult,
  search: SavedSearch,
  passengers: number,
  searchedAt: string,
): AwardFlightOption[] {
  const options: AwardFlightOption[] = [];
  const requestedCabinKey = SEATS_AERO_KEY_BY_CABIN[search.cabin];

  for (const cabinKey of SEATS_AERO_CABIN_KEYS) {
    if (cabinKey !== requestedCabinKey) {
      continue;
    }

    const isAvailable = getCabinFields(result, cabinKey).available === true;

    if (!isAvailable) {
      continue;
    }

    const option = mapResultCabinToAwardOption({
      result,
      cabinKey,
      passengers,
      search,
      searchedAt,
    });

    if (option && option.cabin === search.cabin) {
      options.push(option);
    }
  }

  return options;
}

export async function searchSeatsAeroAwardFlights(
  search: SavedSearch,
): Promise<ProviderResultEnvelope<AwardFlightOption>> {
  const apiKey = process.env.SEATS_AERO_API_KEY;

  if (!apiKey) {
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [missingKeyMessage],
    });
  }

  const origin = search.originCodes.join(",");
  const destination = search.destinationCodes.join(",");

  if (!origin || !destination) {
    return buildEnvelope({
      status: "unsupported_route",
      data: [],
      messages: [unsupportedRouteMessage],
    });
  }

  const params = new URLSearchParams({
    origin_airport: origin,
    destination_airport: destination,
    start_date: search.departDate,
    end_date: search.departDate,
    cabins: SEATS_AERO_KEY_BY_CABIN[search.cabin],
  });

  if (search.maxStops === 0) {
    params.set("only_direct_flights", "true");
  }

  let response: Response;

  try {
    response = await fetch(`${SEATS_AERO_CACHED_SEARCH_URL}?${params.toString()}`, {
      headers: {
        // Not a standard `Authorization: Bearer` header — Seats.aero uses a
        // dedicated `Partner-Authorization` header carrying the raw Pro
        // account API key, no "Bearer" prefix.
        "Partner-Authorization": apiKey,
      },
    });
  } catch {
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [requestFailedMessage],
    });
  }

  if (response.status === 401) {
    // Generic message only — never include the API key or raw response body.
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [authErrorMessage],
    });
  }

  if (response.status === 429) {
    return buildEnvelope({
      status: "rate_limited",
      data: [],
      messages: [rateLimitedMessage],
    });
  }

  if (response.status === 404) {
    // Per Seats.aero docs, 404 covers both "no results" and "invalid
    // availability ID" — treated as no_results here since this is a search
    // request, not an ID lookup.
    return buildEnvelope({
      status: "no_results",
      data: [],
      messages: [noResultsMessage],
    });
  }

  if (!response.ok) {
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [requestFailedMessage],
    });
  }

  let payload: SeatsAeroCachedSearchResponse;

  try {
    payload = (await response.json()) as SeatsAeroCachedSearchResponse;
  } catch {
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [requestFailedMessage],
    });
  }

  const results = payload.data ?? [];

  if (results.length === 0) {
    return buildEnvelope({
      status: "no_results",
      data: [],
      messages: [noResultsMessage],
    });
  }

  const passengers = Math.max(1, search.passengers);
  const searchedAt = new Date().toISOString();
  const options = results.flatMap((result) =>
    mapResultToAwardOptions(result, search, passengers, searchedAt),
  );

  if (options.length === 0) {
    return buildEnvelope({
      status: "no_results",
      data: [],
      messages: [noResultsMessage],
    });
  }

  return buildEnvelope({
    status: "success",
    data: options,
    messages: [successMessage, verifyAvailabilityMessage],
  });
}

export const seatsAeroAwardFlightProvider: AwardFlightProvider = {
  id: SEATS_AERO_PROVIDER_ID,
  label: SEATS_AERO_PROVIDER_LABEL,
  isLive: true,
  searchAwardFlights: searchSeatsAeroAwardFlights,
};
