import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchSeatsAeroAwardFlights } from "@/lib/providers/seatsAero";
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function baseResult(overrides: Record<string, unknown> = {}) {
  return {
    ID: "res-1",
    Route: {
      OriginAirport: "WAS",
      DestinationAirport: "TYO",
      Source: "aeroplan",
    },
    Date: "2027-05-01",
    YAvailable: false,
    WAvailable: false,
    JAvailable: false,
    FAvailable: false,
    Source: "aeroplan",
    UpdatedAt: "2027-04-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("searchSeatsAeroAwardFlights", () => {
  const originalKey = process.env.SEATS_AERO_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.SEATS_AERO_API_KEY = "test-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.SEATS_AERO_API_KEY = originalKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never calls the real Seats.aero API and hits the Cached Search endpoint only", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [], count: 0, hasMore: false, cursor: 0 }),
    );

    await searchSeatsAeroAwardFlights(search);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl.startsWith("https://seats.aero/partnerapi/search?")).toBe(
      true,
    );
    expect(calledUrl).not.toContain("/partnerapi/live");
  });

  it("sends the API key via the Partner-Authorization header, not as a query param or Authorization header", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [], count: 0, hasMore: false, cursor: 0 }),
    );

    await searchSeatsAeroAwardFlights(search);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).not.toContain("test-key");
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Partner-Authorization"]).toBe("test-key");
    expect(headers.Authorization).toBeUndefined();
  });

  it("expands a result with multiple available cabins into multiple AwardFlightOption entries", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            YAvailable: true,
            YMileageCost: "40000",
            YDirect: true,
            JAvailable: true,
            JMileageCost: "90000",
            JDirect: false,
          }),
        ],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data).toHaveLength(2);

    const economy = envelope.data.find((option) => option.cabin === "economy");
    const business = envelope.data.find((option) => option.cabin === "business");

    expect(economy).toBeDefined();
    expect(business).toBeDefined();
    // pointsRequired is multiplied by passenger count (2 passengers).
    expect(economy?.pointsRequired).toBe(80000);
    expect(business?.pointsRequired).toBe(180000);
    expect(economy?.source).toBe("seats_aero");
    expect(economy?.id).not.toBe(business?.id);
  });

  it("populates transferSources for a result whose Source has known card transfer partners", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            JAvailable: true,
            JMileageCost: "75000",
            JDirect: true,
          }),
        ],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data[0].transferSources.length).toBeGreaterThan(0);
    expect(envelope.data[0].transferSources).toContain("Chase Ultimate Rewards");
  });

  it("leaves transferSources empty for a result whose Source has no known card transfer partners", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            Route: {
              OriginAirport: "WAS",
              DestinationAirport: "TYO",
              Source: "delta",
            },
            Source: "delta",
            JAvailable: true,
            JMileageCost: "75000",
            JDirect: true,
          }),
        ],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data[0].transferSources).toEqual([]);
  });

  it("maps a result with only one available cabin to a single AwardFlightOption", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            JAvailable: true,
            JMileageCost: "75000",
            JDirect: true,
            JRemainingSeats: 2,
          }),
        ],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data).toHaveLength(1);
    expect(envelope.data[0].cabin).toBe("business");
    expect(envelope.data[0].availableSeats).toBe(2);
    expect(envelope.data[0].stops).toBe(0);
  });

  it("maps an empty data array to no_results", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [], count: 0, hasMore: false, cursor: 0 }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
  });

  it("maps results with no cabins available to no_results", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [baseResult()],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
  });

  it("maps HTTP 401 to error without leaking the API key or response body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "invalid key test-key" }, 401),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("error");
    expect(envelope.data).toEqual([]);
    const messageText = JSON.stringify(envelope.messages);
    expect(messageText).not.toContain("test-key");
    expect(messageText).not.toContain("invalid key");
  });

  it("maps HTTP 429 to rate_limited", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("rate_limited");
    expect(envelope.data).toEqual([]);
  });

  it("maps HTTP 404 to no_results", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
  });

  it("maps a network failure to error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("error");
    expect(envelope.data).toEqual([]);
  });

  it("maps a non-2xx/401/429/404 failure (5xx) to error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("error");
  });

  it("returns error and does not call fetch when the API key is missing", async () => {
    delete process.env.SEATS_AERO_API_KEY;

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
