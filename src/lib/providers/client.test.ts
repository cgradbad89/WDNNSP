import { afterEach, describe, expect, it, vi } from "vitest";
import { searchFlightsViaApi } from "@/lib/providers/client";
import type { FlightSearchApiResponse } from "@/lib/providers/apiTypes";
import type { FlightSearchEnvelope } from "@/lib/providers/types";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["WAS"],
  destinationCodes: ["TYO"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  flexibleDays: 3,
  passengers: 2,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const envelope: FlightSearchEnvelope = {
  cash: {
    status: "no_results",
    data: [],
    metadata: {
      providerId: "mock-cash",
      providerLabel: "Mock Cash Provider",
      searchedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
    },
    messages: [],
  },
  awards: {
    status: "no_results",
    data: [],
    metadata: {
      providerId: "mock-awards",
      providerLabel: "Mock Award Provider",
      searchedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
    },
    messages: [],
  },
  overallStatus: "no_results",
  messages: [],
};

function createJsonResponse(
  body: FlightSearchApiResponse,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchFlightsViaApi", () => {
  it("posts the search and returns the flight search envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        envelope,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchFlightsViaApi(search)).resolves.toEqual(envelope);
    expect(fetchMock).toHaveBeenCalledWith("/api/search/flights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ search }),
    });
  });

  it("throws the safe API error message for an app-owned error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(
          {
            ok: false,
            error: {
              code: "INVALID_SEARCH",
              message:
                "Choose a supported origin, destination, date, and traveler count.",
            },
          },
          400,
        ),
      ),
    );

    await expect(searchFlightsViaApi(search)).rejects.toThrow(
      "Choose a supported origin, destination, date, and traveler count.",
    );
  });

  it("throws a safe error for non-JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not json", {
          status: 502,
        }),
      ),
    );

    await expect(searchFlightsViaApi(search)).rejects.toThrow(
      "Flight search failed. Please try again.",
    );
  });

  it("throws a safe error for network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network secret details")),
    );

    await expect(searchFlightsViaApi(search)).rejects.toThrow(
      "Flight search failed. Please try again.",
    );
  });
});
