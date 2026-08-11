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
import { searchFlightsWithProviders } from "@/lib/providers/search";
import { travelpayoutsCashFlightProvider } from "@/lib/providers/travelpayouts";
import type { FlightSearchProviderSet } from "@/lib/providers/types";

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

function isLiveCashProviderEnabled(): boolean {
  return (
    process.env.ENABLE_LIVE_CASH_PROVIDER === "true" &&
    Boolean(process.env.TRAVELPAYOUTS_TOKEN)
  );
}

// Award side is untouched by this session: it always uses the mock provider.
function getFlightSearchProviderSet(): FlightSearchProviderSet {
  return {
    cashProvider: isLiveCashProviderEnabled()
      ? travelpayoutsCashFlightProvider
      : mockCashFlightProvider,
    awardProvider: mockAwardFlightProvider,
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
