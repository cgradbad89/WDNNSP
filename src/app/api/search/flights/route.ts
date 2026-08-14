import type {
  FlightSearchApiErrorResponse,
  FlightSearchApiResponse,
  FlightSearchApiSuccessResponse,
} from "@/lib/providers/apiTypes";
import {
  invalidSearchError,
  validateFlightSearchApiRequestBody,
} from "@/lib/providers/apiValidation";
import {
  mockAwardFlightProvider,
  mockCashFlightProvider,
} from "@/lib/providers/mock";
import { seatsAeroAwardFlightProvider } from "@/lib/providers/seatsAero";
import { searchFlightsWithProviders } from "@/lib/providers/search";
import { travelpayoutsCashFlightProvider } from "@/lib/providers/travelpayouts";
import { createUnavailableCashFlightProvider } from "@/lib/providers/unavailable";
import type {
  CashFlightProvider,
  FlightSearchProviderSet,
} from "@/lib/providers/types";

const searchFailedError: FlightSearchApiErrorResponse["error"] = {
  code: "SEARCH_FAILED",
  message: "Flight search failed. Please try again.",
};

function jsonResponse(
  body: FlightSearchApiResponse,
  status: number,
): Response {
  return Response.json(body, { status });
}

function isEnvValuePresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getUnavailableCashProvider({
  code,
  internalReasons,
  isLive,
  label,
  message,
  providerId,
}: {
  code: string;
  internalReasons?: string[];
  isLive?: boolean;
  label: string;
  message: string;
  providerId: string;
}): CashFlightProvider {
  return createUnavailableCashFlightProvider({
    id: providerId,
    isLive,
    label,
    message: {
      code,
      severity: "error",
      message,
      ...(internalReasons ? { internalReasons } : {}),
    },
  });
}

function canUseMockCashProvider(): boolean {
  return process.env.NODE_ENV !== "production";
}

function getFutureStructuredCashProvider(): CashFlightProvider | undefined {
  return undefined;
}

function getCashFlightProvider(): CashFlightProvider {
  const structuredCashProvider = getFutureStructuredCashProvider();

  if (structuredCashProvider) {
    return structuredCashProvider;
  }

  if (process.env.ENABLE_LIVE_CASH_PROVIDER === "true") {
    if (!isEnvValuePresent(process.env.TRAVELPAYOUTS_TOKEN)) {
      return getUnavailableCashProvider({
        code: "travelpayouts_not_configured",
        internalReasons: ["missing_travelpayouts_token"],
        label: "Travelpayouts",
        message:
          "Travelpayouts cash provider is enabled but unavailable because required credentials are missing.",
        providerId: "travelpayouts",
      });
    }

    return travelpayoutsCashFlightProvider;
  }

  if (canUseMockCashProvider()) {
    return mockCashFlightProvider;
  }

  return getUnavailableCashProvider({
    code: "cash_provider_not_configured",
    internalReasons: ["cash_provider_not_configured"],
    isLive: false,
    label: "No Cash Provider",
    message:
      "No production cash provider is configured. Configure a structured cash provider or Travelpayouts to show cash results.",
    providerId: "no-cash-provider",
  });
}

function isLiveAwardProviderEnabled(): boolean {
  return (
    process.env.ENABLE_LIVE_AWARD_PROVIDER === "true" &&
    Boolean(process.env.SEATS_AERO_API_KEY)
  );
}

function getFlightSearchProviderSet(): FlightSearchProviderSet {
  return {
    cashProvider: getCashFlightProvider(),
    awardProvider: isLiveAwardProviderEnabled()
      ? seatsAeroAwardFlightProvider
      : mockAwardFlightProvider,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: invalidSearchError,
      },
      400,
    );
  }

  const validation = validateFlightSearchApiRequestBody(body);

  if (!validation.ok) {
    return jsonResponse(
      {
        ok: false,
        error: validation.error,
      },
      400,
    );
  }

  try {
    const envelope = await searchFlightsWithProviders(
      validation.search,
      getFlightSearchProviderSet(),
    );
    const response: FlightSearchApiSuccessResponse = {
      ok: true,
      envelope,
    };

    return jsonResponse(response, 200);
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: searchFailedError,
      },
      500,
    );
  }
}
