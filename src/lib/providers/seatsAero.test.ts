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
    expect(new URL(calledUrl).searchParams.get("cabins")).toBe("J");
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

  it("enforces the searched cabin after provider normalization", async () => {
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
    expect(envelope.data).toHaveLength(1);
    expect(envelope.data[0].cabin).toBe("business");
    expect(envelope.data[0].pointsRequired).toBe(180000);
    expect(envelope.data[0].source).toBe("seats_aero");
    expect(envelope.data[0].comparison).toMatchObject({
      tripType: "one_way",
      passengerCount: 2,
      cabin: "business",
      cabinConfirmed: true,
    });
  });

  it("does not return business awards for an economy search", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            JAvailable: true,
            JMileageCost: "90000",
            JDirect: true,
          }),
        ],
        count: 1,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights({
      ...search,
      cabin: "economy",
    });

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
  });

  it("normalizes known Seats.aero source slugs before transfer matching", async () => {
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
    expect(envelope.data[0].airlineProgram).toBe("Air Canada Aeroplan");
    expect(envelope.data[0].sourceProgramId).toBe("air-canada-aeroplan");
    expect(envelope.data[0].transferSources.length).toBeGreaterThan(0);
    expect(envelope.data[0].transferSources).toContain("Chase Ultimate Rewards");
  });

  it("leaves unknown program slugs unresolved and without transfer sources", async () => {
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
    expect(envelope.data[0].airlineProgram).toBe("delta");
    expect(envelope.data[0].sourceProgramId).toBeUndefined();
    expect(envelope.data[0].transferSources).toEqual([]);
    expect(
      envelope.data[0].limitations?.some(
        (limitation) => limitation.code === "unresolved_program",
      ),
    ).toBe(true);
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
    // JDirect: true confirms a real nonstop, so stops is a real reported 0.
    expect(envelope.data[0].stops).toBe(0);
  });

  it("leaves stops undefined (not a fabricated 0) when the cabin's direct flag does not confirm nonstop", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            JAvailable: true,
            JMileageCost: "75000",
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
    expect(envelope.data[0].stops).toBeUndefined();
  });

  it("leaves taxesAndFeesUsd undefined rather than fabricating $0", async () => {
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

    expect(envelope.data[0].taxesAndFeesUsd).toBeUndefined();
  });

  it("leaves confidence undefined rather than fabricating a hardcoded 'medium' for every result", async () => {
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

    expect(envelope.data[0].confidence).toBeUndefined();
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

  it("skips malformed rows while preserving valid Seats.aero rows and a safe warning", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            ID: "valid-row",
            JAvailable: true,
            JMileageCost: "75000",
            JDirect: true,
          }),
          baseResult({
            ID: "missing-points",
            JAvailable: true,
            JMileageCost: undefined,
            JDirect: true,
          }),
          {
            ID: "missing-route",
            Date: "2027-05-01",
            JAvailable: true,
            JMileageCost: "90000",
          },
        ],
        count: 3,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("success");
    expect(envelope.data).toHaveLength(1);
    expect(envelope.data[0]).toMatchObject({
      id: "seatsaero-valid-row-j",
      pointsRequired: 150000,
      availabilityStatus: "available",
    });
    expect(envelope.data[0].taxesAndFeesUsd).toBeUndefined();
    expect(
      envelope.messages.find(
        (message) => message.code === "seats_aero_validation_skipped_rows",
      ),
    ).toMatchObject({
      severity: "warning",
      internalReasons: expect.arrayContaining([
        "data.1:mileage_cost_invalid",
        "data.2:route_missing",
      ]),
    });
    expect(JSON.stringify(envelope.messages)).not.toContain("test-key");
  });

  it("maps all-invalid Seats.aero rows to no_results without fabricated award data", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          baseResult({
            ID: "invalid-points",
            JAvailable: true,
            JMileageCost: "not-a-number",
          }),
          baseResult({
            ID: "invalid-date",
            Date: "not-a-date",
            JAvailable: true,
            JMileageCost: "75000",
          }),
        ],
        count: 2,
        hasMore: false,
        cursor: 0,
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
    expect(
      envelope.messages.find(
        (message) => message.code === "seats_aero_validation_skipped_rows",
      )?.internalReasons,
    ).toEqual(
      expect.arrayContaining([
        "data.0:mileage_cost_invalid",
        "data.1:date_invalid",
      ]),
    );
  });

  it("maps an unexpected Seats.aero top-level payload shape to a provider error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [baseResult({ JAvailable: true, JMileageCost: "75000" })],
      }),
    );

    const envelope = await searchSeatsAeroAwardFlights(search);

    expect(envelope.status).toBe("error");
    expect(envelope.data).toEqual([]);
    expect(envelope.messages).toEqual([
      {
        code: "seats_aero_invalid_payload",
        severity: "error",
        message: "Live award provider returned an unexpected response shape.",
      },
    ]);
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
