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
  message: "Travelpayouts did not return cached cash fares for this route.",
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
  search,
  searchedAt,
}: {
  entry: TravelpayoutsCheapPriceEntry;
  destinationIata: string;
  index: string;
  search: SavedSearch;
  searchedAt: string;
}): CashFlightOption {
  const origin = search.originCodes[0] ?? "";
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
          search,
          searchedAt,
        }),
      );
    }
  }

  return options;
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

  const origin = search.originCodes[0];
  const destination = search.destinationCodes[0];

  if (!origin || !destination) {
    return buildEnvelope({
      status: "unsupported_route",
      data: [],
      messages: [unsupportedRouteMessage],
    });
  }

  const params = new URLSearchParams({
    origin,
    destination,
    depart_date: search.departDate,
    currency: TRAVELPAYOUTS_CURRENCY,
  });

  if (search.tripType === "round_trip" && search.returnDate) {
    params.set("return_date", search.returnDate);
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

  const options = flattenCheapResponse(payload.data, search);

  if (options.length === 0) {
    return buildEnvelope({
      status: "no_results",
      data: [],
      messages: [noResultsMessage],
    });
  }

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

export const travelpayoutsCashFlightProvider: CashFlightProvider = {
  id: TRAVELPAYOUTS_PROVIDER_ID,
  label: TRAVELPAYOUTS_PROVIDER_LABEL,
  searchCashFlights: searchTravelpayoutsCashFlights,
};
