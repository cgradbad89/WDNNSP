import { AIRPORT_GROUPS } from "@/data/airportGroups";
import type {
  CashFlightProvider,
  ProviderMessage,
  ProviderResultEnvelope,
} from "@/lib/providers/types";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

// Travelpayouts Data API — "cheapest prices" endpoint.
// Docs: https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API
// IMPORTANT: this endpoint returns cached, aggregated prices, not a live
// per-search shop against airline inventory. Treat every successful result as
// stale-but-usable, not as a live quote.
const TRAVELPAYOUTS_PROVIDER_ID = "travelpayouts";
const TRAVELPAYOUTS_PROVIDER_LABEL = "Travelpayouts";
const TRAVELPAYOUTS_CHEAP_PRICES_URL =
  "https://api.travelpayouts.com/v1/prices/cheap";
const TRAVELPAYOUTS_CURRENCY = "usd";

interface TravelpayoutsCheapPriceEntry {
  price: number;
  airline: string;
  flight_number: number;
  departure_at: string;
  return_at?: string;
  expires_at: string;
}

interface TravelpayoutsCheapResponse {
  success: boolean;
  data: Record<string, Record<string, TravelpayoutsCheapPriceEntry>>;
  error?: string | null;
}

const staleDataMessage: ProviderMessage = {
  code: "travelpayouts_cached_data",
  severity: "warning",
  message:
    "This result may be cached. Travelpayouts prices are aggregated, not a live quote.",
};

const noResultsMessage: ProviderMessage = {
  code: "travelpayouts_no_results",
  severity: "info",
  message:
    "Travelpayouts did not return cached month-level cash fares for this route. Try another month or a major airport pair.",
};

const missingTokenMessage: ProviderMessage = {
  code: "travelpayouts_not_configured",
  severity: "error",
  message: "Live cash provider is not configured.",
};

const unsupportedRouteMessage: ProviderMessage = {
  code: "travelpayouts_unsupported_route",
  severity: "warning",
  message: "This route is not supported by the live cash provider.",
};

const authErrorMessage: ProviderMessage = {
  code: "travelpayouts_auth_error",
  severity: "error",
  message: "Live cash provider request failed authentication.",
};

const rateLimitedMessage: ProviderMessage = {
  code: "travelpayouts_rate_limited",
  severity: "warning",
  message: "Live cash provider rate limit reached. Try again shortly.",
};

const requestFailedMessage: ProviderMessage = {
  code: "travelpayouts_request_failed",
  severity: "error",
  message: "Live cash provider request failed.",
};

function buildEnvelope({
  status,
  data,
  messages,
  isStale,
}: {
  status: ProviderResultEnvelope<CashFlightOption>["status"];
  data: CashFlightOption[];
  messages: ProviderMessage[];
  isStale?: boolean;
}): ProviderResultEnvelope<CashFlightOption> {
  return {
    status,
    data,
    metadata: {
      providerId: TRAVELPAYOUTS_PROVIDER_ID,
      providerLabel: TRAVELPAYOUTS_PROVIDER_LABEL,
      searchedAt: new Date().toISOString(),
      isLive: true,
      ...(isStale === undefined ? {} : { isStale }),
    },
    messages,
  };
}

function mapEntryToCashFlightOption({
  entry,
  destinationIata,
  index,
  origin,
  search,
  searchedAt,
}: {
  entry: TravelpayoutsCheapPriceEntry;
  destinationIata: string;
  index: string;
  origin: string;
  search: SavedSearch;
  searchedAt: string;
}): CashFlightOption {
  const flightNumber = `${entry.airline}${entry.flight_number}`;

  return {
    id: `travelpayouts-${origin}-${destinationIata}-${flightNumber}-${index}`,
    source: "travelpayouts",
    provider: {
      providerId: TRAVELPAYOUTS_PROVIDER_ID,
      providerLabel: TRAVELPAYOUTS_PROVIDER_LABEL,
      resultId: `${destinationIata}-${index}`,
    },
    freshness: {
      searchedAt,
      lastCheckedAt: searchedAt,
      expiresAt: entry.expires_at,
      isLive: true,
      isStale: true,
      staleReason:
        "Travelpayouts prices/cheap data is cached and aggregated, not a live per-search shop.",
    },
    airline: entry.airline,
    flightNumbers: [flightNumber],
    origin,
    destination: destinationIata,
    // NOTE: the Travelpayouts cheap-prices endpoint does not return arrival
    // time, duration, stop count, or cabin. These fields are required by the
    // shared CashFlightOption shape, so they are populated with explicit
    // placeholders (0-duration, same-as-departure arrival, requested cabin)
    // and flagged via `limitations` below rather than guessed as real data.
    departureDateTime: entry.departure_at,
    arrivalDateTime: entry.departure_at,
    durationMinutes: 0,
    stops: 0,
    cabin: search.cabin,
    cashPriceUsd: entry.price,
    price: {
      amount: entry.price,
      currency: "USD",
    },
    priceBreakdown: {
      total: {
        amount: entry.price,
        currency: "USD",
      },
    },
    limitations: [
      {
        code: "travelpayouts_partial_itinerary",
        severity: "warning",
        message:
          "Travelpayouts cached price data does not confirm arrival time, duration, stop count, or cabin. These fields are estimates only.",
      },
    ],
  };
}

function flattenCheapResponse(
  data: TravelpayoutsCheapResponse["data"],
  origin: string,
  search: SavedSearch,
): CashFlightOption[] {
  const searchedAt = new Date().toISOString();
  const options: CashFlightOption[] = [];

  for (const [destinationIata, entries] of Object.entries(data)) {
    for (const [index, entry] of Object.entries(entries)) {
      options.push(
        mapEntryToCashFlightOption({
          entry,
          destinationIata,
          index,
          origin,
          search,
          searchedAt,
        }),
      );
    }
  }

  return options;
}

function normalizeTravelpayoutsCode(code: string): string {
  return code.trim().toUpperCase();
}

function getExactAirportGroupCode(codes: string[]): string | undefined {
  const normalizedCodes = codes.map(normalizeTravelpayoutsCode).filter(Boolean);

  if (normalizedCodes.length === 0) {
    return undefined;
  }

  if (normalizedCodes.length === 1) {
    return AIRPORT_GROUPS.find(
      (group) => normalizeTravelpayoutsCode(group.code) === normalizedCodes[0],
    )?.code;
  }

  return AIRPORT_GROUPS.find((group) => {
    if (group.airportCodes.length !== normalizedCodes.length) {
      return false;
    }

    return group.airportCodes.every((airportCode) =>
      normalizedCodes.includes(normalizeTravelpayoutsCode(airportCode)),
    );
  })?.code;
}

function getTravelpayoutsRouteCodes(codes: string[]): string[] {
  const routeCodes: string[] = [];

  function addRouteCode(code: string): void {
    const normalizedCode = normalizeTravelpayoutsCode(code);

    if (!normalizedCode || routeCodes.includes(normalizedCode)) {
      return;
    }

    routeCodes.push(normalizedCode);
  }

  const exactGroupCode = getExactAirportGroupCode(codes);

  if (exactGroupCode) {
    addRouteCode(exactGroupCode);
  }

  for (const code of codes) {
    const normalizedCode = normalizeTravelpayoutsCode(code);
    const airportGroup = AIRPORT_GROUPS.find(
      (group) => normalizeTravelpayoutsCode(group.code) === normalizedCode,
    );

    if (airportGroup) {
      addRouteCode(airportGroup.code);
      airportGroup.airportCodes.forEach(addRouteCode);
      continue;
    }

    addRouteCode(normalizedCode);
  }

  return routeCodes;
}

function getTravelpayoutsRoutePairs(search: SavedSearch): {
  destination: string;
  origin: string;
}[] {
  const origins = getTravelpayoutsRouteCodes(search.originCodes);
  const destinations = getTravelpayoutsRouteCodes(search.destinationCodes);
  const routePairs: { destination: string; origin: string }[] = [];

  for (const origin of origins) {
    for (const destination of destinations) {
      if (origin === destination) {
        continue;
      }

      routePairs.push({ destination, origin });
    }
  }

  return routePairs;
}

function getTravelpayoutsMonth(value: string): string {
  const normalizedValue = value.trim();
  const monthMatch = normalizedValue.match(/^\d{4}-\d{2}/);

  return monthMatch ? monthMatch[0] : normalizedValue;
}

export async function searchTravelpayoutsCashFlights(
  search: SavedSearch,
): Promise<ProviderResultEnvelope<CashFlightOption>> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;

  if (!token) {
    return buildEnvelope({
      status: "error",
      data: [],
      messages: [missingTokenMessage],
    });
  }

  const routePairs = getTravelpayoutsRoutePairs(search);

  if (routePairs.length === 0) {
    return buildEnvelope({
      status: "unsupported_route",
      data: [],
      messages: [unsupportedRouteMessage],
    });
  }

  for (const { destination, origin } of routePairs) {
    const params = new URLSearchParams({
      origin,
      destination,
      depart_date: getTravelpayoutsMonth(search.departDate),
      currency: TRAVELPAYOUTS_CURRENCY,
    });

    if (search.tripType === "round_trip" && search.returnDate) {
      params.set("return_date", getTravelpayoutsMonth(search.returnDate));
    }

    let response: Response;

    try {
      response = await fetch(
        `${TRAVELPAYOUTS_CHEAP_PRICES_URL}?${params.toString()}`,
        {
          headers: {
            "X-Access-Token": token,
          },
        },
      );
    } catch {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    if (response.status === 401 || response.status === 403) {
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

    if (!response.ok) {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    let payload: TravelpayoutsCheapResponse;

    try {
      payload = (await response.json()) as TravelpayoutsCheapResponse;
    } catch {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    if (!payload.success) {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    const options = flattenCheapResponse(payload.data, origin, search);

    if (options.length > 0) {
      // Data is present, but this endpoint is always cache-based, so results are
      // marked "stale" rather than "success" even on a successful request. This
      // matches the existing codebase convention: `status: "stale"` already means
      // "usable data present, but a provider marked it as cached/unverified" (see
      // src/lib/providers/status.ts `isStaleProviderData`/`usableStatuses` and the
      // "stale" copy in src/lib/providers/display.ts), so this is not a new use of
      // the status.
      return buildEnvelope({
        status: "stale",
        data: options,
        messages: [staleDataMessage],
        isStale: true,
      });
    }
  }

  return buildEnvelope({
    status: "no_results",
    data: [],
    messages: [noResultsMessage],
  });
}

export const travelpayoutsCashFlightProvider: CashFlightProvider = {
  id: TRAVELPAYOUTS_PROVIDER_ID,
  label: TRAVELPAYOUTS_PROVIDER_LABEL,
  isLive: true,
  searchCashFlights: searchTravelpayoutsCashFlights,
};
