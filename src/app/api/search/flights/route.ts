import type {
  FlightSearchApiErrorResponse,
  FlightSearchApiResponse,
  FlightSearchApiSuccessResponse,
} from "@/lib/providers/apiTypes";
import {
  invalidSearchError,
  validateFlightSearchApiRequestBody,
} from "@/lib/providers/apiValidation";
import { mockFlightSearchProviderSet } from "@/lib/providers/mock";
import { searchFlightsWithProviders } from "@/lib/providers/search";

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
      mockFlightSearchProviderSet,
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
