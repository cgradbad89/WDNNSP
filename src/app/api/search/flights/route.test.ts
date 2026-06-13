import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/search/flights/route";
import type { FlightSearchApiResponse } from "@/lib/providers/apiTypes";
import type { SavedSearch } from "@/types/search";

const validSearch: SavedSearch = {
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

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/search/flights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search/flights", () => {
  it("returns a mock provider envelope for a valid search", async () => {
    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    if (body.ok) {
      expect(body.envelope).toMatchObject({
        overallStatus: "success",
        cash: {
          status: "success",
          metadata: {
            providerLabel: "Mock Cash Provider",
            isLive: false,
          },
        },
        awards: {
          status: "success",
          metadata: {
            providerLabel: "Mock Award Provider",
            isLive: false,
          },
        },
      });
      expect(body.envelope.cash.data.length).toBeGreaterThan(0);
      expect(body.envelope.awards.data.length).toBeGreaterThan(0);
    }
  });

  it("returns INVALID_SEARCH when search is missing", async () => {
    const response = await POST(createRequest({}));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "INVALID_SEARCH",
        message:
          "Choose a supported origin, destination, date, and traveler count.",
      },
    });
  });

  it("returns INVALID_SEARCH for unsupported airport selections", async () => {
    const response = await POST(
      createRequest({
        search: {
          ...validSearch,
          originCodes: ["ZZZ"],
        },
      }),
    );
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_SEARCH",
      },
    });
  });

  it("returns INVALID_SEARCH for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/search/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{",
      }),
    );
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_SEARCH",
      },
    });
  });
});
