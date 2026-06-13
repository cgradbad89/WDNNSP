import type { FlightSearchApiResponse } from "@/lib/providers/apiTypes";
import type { FlightSearchEnvelope } from "@/lib/providers/types";
import type { SavedSearch } from "@/types/search";

const flightSearchFailedMessage = "Flight search failed. Please try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFlightSearchApiResponse(
  value: unknown,
): value is FlightSearchApiResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return isRecord(value.envelope);
  }

  return (
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

export async function searchFlightsViaApi(
  search: SavedSearch,
): Promise<FlightSearchEnvelope> {
  let response: Response;

  try {
    response = await fetch("/api/search/flights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ search }),
    });
  } catch {
    throw new Error(flightSearchFailedMessage);
  }

  let apiResponse: unknown;

  try {
    apiResponse = await response.json();
  } catch {
    throw new Error(flightSearchFailedMessage);
  }

  if (!isFlightSearchApiResponse(apiResponse)) {
    throw new Error(flightSearchFailedMessage);
  }

  if (!apiResponse.ok) {
    throw new Error(apiResponse.error.message);
  }

  return apiResponse.envelope;
}
