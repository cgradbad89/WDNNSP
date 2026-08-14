import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import {
  addValidationReason,
  createValidationWarningMessage,
  getFiniteNumber,
  getPositiveNumber,
  getTrimmedString,
  isRecord,
  isUsableDateString,
  type ProviderValidationSummary,
} from "@/lib/providers/dtoValidation";
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
  flight_number: number | string;
  departure_at: string;
  return_at?: string;
  expires_at?: string;
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

const invalidPayloadMessage: ProviderMessage = {
  code: "travelpayouts_invalid_payload",
  severity: "error",
  message: "Live cash provider returned an unexpected response shape.",
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
      ...(entry.expires_at ? { expiresAt: entry.expires_at } : {}),
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
    // time, duration, stop count, or cabin. These are left undefined (not
    // guessed as 0-duration/same-as-departure/etc.) so scoring and the UI
    // treat them as genuinely unknown rather than the best-case real value.
    // `cabin` still gets a value because it's a required field on the shared
    // shape, but it's only the cabin the user searched for, echoed back -
    // `cabinConfirmed: false` marks it as not a confirmed fare attribute.
    // See `limitations` below for the human-readable explanation.
    departureDateTime: entry.departure_at,
    cabin: search.cabin,
    cabinConfirmed: false,
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
        code: "provider_benchmark_only",
        severity: "warning",
        message:
          "Travelpayouts cached price data is benchmark-only and should not be used for exact cents-per-point comparison.",
      },
      {
        code: "travelpayouts_partial_itinerary",
        severity: "warning",
        message:
          "Travelpayouts cached price data does not confirm arrival time, duration, stop count, or cabin. These fields are shown as not reported rather than guessed.",
      },
    ],
    comparison: {
      searchFingerprint: createSearchFingerprint(search),
      tripType: search.tripType,
      passengerCount: Math.max(1, search.passengers),
      cabin: search.cabin,
      cabinConfirmed: false,
      isExactDateComparable: false,
      isBenchmarkOnly: true,
    },
  };
}

function getTravelpayoutsCurrency(payload: Record<string, unknown>): string | undefined {
  const rawCurrency =
    getTrimmedString(payload.currency) ??
    getTrimmedString(payload.Currency) ??
    TRAVELPAYOUTS_CURRENCY;
  const normalizedCurrency = rawCurrency.toUpperCase();

  return normalizedCurrency === "USD" ? normalizedCurrency : undefined;
}

function validateTravelpayoutsEntry({
  destinationIata,
  entry,
  index,
  summary,
}: {
  destinationIata: string;
  entry: unknown;
  index: string;
  summary: ProviderValidationSummary;
}): TravelpayoutsCheapPriceEntry | undefined {
  const rowPath = `data.${destinationIata}.${index}`;

  if (!isRecord(entry)) {
    addValidationReason(summary, rowPath, "row_not_object");
    return undefined;
  }

  const price = getPositiveNumber(entry.price);
  const airline = getTrimmedString(entry.airline);
  const flightNumber =
    getFiniteNumber(entry.flight_number) ??
    getTrimmedString(entry.flight_number);
  const departureAt = getTrimmedString(entry.departure_at);
  const expiresAt = getTrimmedString(entry.expires_at);

  if (price === undefined) {
    addValidationReason(summary, rowPath, "price_invalid");
    return undefined;
  }

  if (!airline || flightNumber === undefined || flightNumber === "") {
    addValidationReason(summary, rowPath, "flight_identity_missing");
    return undefined;
  }

  if (!isUsableDateString(departureAt)) {
    addValidationReason(summary, rowPath, "departure_date_invalid");
    return undefined;
  }

  if (expiresAt !== undefined && !isUsableDateString(expiresAt)) {
    addValidationReason(summary, rowPath, "expires_date_invalid");
    return undefined;
  }

  return {
    price,
    airline,
    flight_number: flightNumber,
    departure_at: departureAt,
    ...(isUsableDateString(entry.return_at)
      ? { return_at: entry.return_at }
      : {}),
    ...(expiresAt ? { expires_at: expiresAt } : {}),
  };
}

function flattenCheapResponse(
  data: Record<string, unknown>,
  origin: string,
  search: SavedSearch,
): {
  options: CashFlightOption[];
  validation: ProviderValidationSummary;
} {
  const searchedAt = new Date().toISOString();
  const options: CashFlightOption[] = [];
  const validation: ProviderValidationSummary = {
    skippedRows: 0,
    internalReasons: [],
  };

  for (const [destinationIata, entries] of Object.entries(data)) {
    if (!getTrimmedString(destinationIata) || !isRecord(entries)) {
      addValidationReason(validation, `data.${destinationIata}`, "destination_bucket_invalid");
      continue;
    }

    for (const [index, entry] of Object.entries(entries)) {
      const validEntry = validateTravelpayoutsEntry({
        destinationIata,
        entry,
        index,
        summary: validation,
      });

      if (!validEntry) {
        continue;
      }

      options.push(
        mapEntryToCashFlightOption({
          entry: validEntry,
          destinationIata,
          index,
          origin,
          search,
          searchedAt,
        }),
      );
    }
  }

  return { options, validation };
}

function getValidationMessages(
  validation: ProviderValidationSummary,
): ProviderMessage[] {
  const validationMessage = createValidationWarningMessage({
    code: "travelpayouts_validation_skipped_rows",
    providerLabel: TRAVELPAYOUTS_PROVIDER_LABEL,
    skippedRows: validation.skippedRows,
    internalReasons: validation.internalReasons,
  });

  return validationMessage ? [validationMessage] : [];
}

function mergeValidationSummaries(
  target: ProviderValidationSummary,
  source: ProviderValidationSummary,
): void {
  target.skippedRows += source.skippedRows;
  target.internalReasons.push(...source.internalReasons);
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
  const aggregateValidation: ProviderValidationSummary = {
    skippedRows: 0,
    internalReasons: [],
  };

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

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    if (!isRecord(payload) || typeof payload.success !== "boolean") {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [invalidPayloadMessage],
      });
    }

    if (!payload.success) {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [requestFailedMessage],
      });
    }

    if (!isRecord(payload.data) || !getTravelpayoutsCurrency(payload)) {
      return buildEnvelope({
        status: "error",
        data: [],
        messages: [invalidPayloadMessage],
      });
    }

    const { options, validation } = flattenCheapResponse(
      payload.data,
      origin,
      search,
    );

    mergeValidationSummaries(aggregateValidation, validation);

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
        messages: [staleDataMessage, ...getValidationMessages(aggregateValidation)],
        isStale: true,
      });
    }
  }

  return buildEnvelope({
    status: "no_results",
    data: [],
    messages: [noResultsMessage, ...getValidationMessages(aggregateValidation)],
  });
}

export const travelpayoutsCashFlightProvider: CashFlightProvider = {
  id: TRAVELPAYOUTS_PROVIDER_ID,
  label: TRAVELPAYOUTS_PROVIDER_LABEL,
  isLive: true,
  searchCashFlights: searchTravelpayoutsCashFlights,
};
