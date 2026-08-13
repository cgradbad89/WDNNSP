import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchTravelpayoutsCashFlights } from "@/lib/providers/travelpayouts";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["IAD"],
  destinationCodes: ["HND"],
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

const expandedAirportGroupSearch: SavedSearch = {
  ...search,
  id: "search-2",
  name: "Paris Winter Trip",
  originCodes: ["DCA", "IAD", "BWI"],
  destinationCodes: ["CDG", "ORY"],
  departDate: "2026-12-01",
  returnDate: "2026-12-10",
};

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getCalledUrl(callIndex = 0): URL {
  const [calledUrl] = fetchMock.mock.calls[callIndex] as [string];

  return new URL(calledUrl);
}

describe("searchTravelpayoutsCashFlights", () => {
  const originalToken = process.env.TRAVELPAYOUTS_TOKEN;

  beforeEach(() => {
    process.env.TRAVELPAYOUTS_TOKEN = "test-token";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.TRAVELPAYOUTS_TOKEN = originalToken;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never calls the real Travelpayouts API", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {} }),
    );

    await searchTravelpayoutsCashFlights(search);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getCalledUrl().origin + getCalledUrl().pathname).toBe(
      "https://api.travelpayouts.com/v1/prices/cheap",
    );
  });

  it("sends the token via the X-Access-Token header, not as a query param", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {} }),
    );

    await searchTravelpayoutsCashFlights(search);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).not.toContain("test-token");
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["X-Access-Token"]).toBe("test-token");
  });

  it("sends Travelpayouts cheap-prices dates at month granularity", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {} }),
    );

    await searchTravelpayoutsCashFlights(search);

    const calledUrl = getCalledUrl();

    expect(calledUrl.searchParams.get("origin")).toBe("IAD");
    expect(calledUrl.searchParams.get("destination")).toBe("HND");
    expect(calledUrl.searchParams.get("depart_date")).toBe("2027-05");
    expect(calledUrl.searchParams.get("return_date")).toBe("2027-05");
    expect(calledUrl.searchParams.get("currency")).toBe("usd");
  });

  it("uses a matching Travelpayouts airport group code before member airports", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          PAR: {
            "0": {
              price: 1003,
              airline: "UA",
              flight_number: 57,
              departure_at: "2026-12-23T22:17:00-05:00",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(
      expandedAirportGroupSearch,
    );
    const calledUrl = getCalledUrl();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl.searchParams.get("origin")).toBe("WAS");
    expect(calledUrl.searchParams.get("destination")).toBe("PAR");
    expect(calledUrl.searchParams.get("depart_date")).toBe("2026-12");
    expect(calledUrl.searchParams.get("return_date")).toBe("2026-12");
    expect(envelope.data[0]).toMatchObject({
      cashPriceUsd: 1003,
      destination: "PAR",
      origin: "WAS",
    });
  });

  it("falls back through member airport pairs when a group route has no cached fares", async () => {
    for (let index = 0; index < 4; index += 1) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ success: true, data: {} }),
      );
    }

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          CDG: {
            "0": {
              price: 1195,
              airline: "AC",
              flight_number: 860,
              departure_at: "2026-12-23T20:45:00-05:00",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(
      expandedAirportGroupSearch,
    );
    const calledUrl = getCalledUrl(4);

    expect(calledUrl.searchParams.get("origin")).toBe("DCA");
    expect(calledUrl.searchParams.get("destination")).toBe("CDG");
    expect(envelope.status).toBe("stale");
    expect(envelope.data[0]).toMatchObject({
      cashPriceUsd: 1195,
      destination: "CDG",
      origin: "DCA",
    });
  });

  it("flattens the nested data object and maps fields on a successful response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          HND: {
            "0": {
              price: 812,
              airline: "NH",
              flight_number: 6,
              departure_at: "2027-05-01T10:00:00Z",
              return_at: "2027-05-10T12:00:00Z",
              expires_at: "2026-06-13T00:00:00Z",
            },
            "1": {
              price: 950,
              airline: "UA",
              flight_number: 79,
              departure_at: "2027-05-02T09:00:00Z",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.data).toHaveLength(2);

    const [first, second] = envelope.data;

    expect(first.airline).toBe("NH");
    expect(first.flightNumbers).toEqual(["NH6"]);
    expect(first.destination).toBe("HND");
    expect(first.origin).toBe("IAD");
    expect(first.cashPriceUsd).toBe(812);
    expect(first.source).toBe("travelpayouts");
    expect(first.departureDateTime).toBe("2027-05-01T10:00:00Z");
    expect(first.freshness).toMatchObject({
      isLive: true,
      isStale: true,
      staleReason: expect.stringContaining("cached and aggregated"),
    });
    expect(first.priceBreakdown?.total).toEqual({
      amount: 812,
      currency: "USD",
    });
    expect(first.priceBreakdown?.taxesAndFees).toBeUndefined();

    expect(second.airline).toBe("UA");
    expect(second.flightNumbers).toEqual(["UA79"]);
    expect(second.cashPriceUsd).toBe(950);
  });

  it("leaves arrivalDateTime, durationMinutes, and stops undefined rather than fabricating placeholder values", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          HND: {
            "0": {
              price: 812,
              airline: "NH",
              flight_number: 6,
              departure_at: "2027-05-01T10:00:00Z",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);
    const [first] = envelope.data;

    expect(first.arrivalDateTime).toBeUndefined();
    expect(first.durationMinutes).toBeUndefined();
    expect(first.stops).toBeUndefined();
  });

  it("marks cabin as unconfirmed - it is only the searched cabin echoed back, not a provider-confirmed fare attribute", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          HND: {
            "0": {
              price: 812,
              airline: "NH",
              flight_number: 6,
              departure_at: "2027-05-01T10:00:00Z",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);
    const [first] = envelope.data;

    expect(first.cabin).toBe(search.cabin);
    expect(first.cabinConfirmed).toBe(false);
  });

  it("marks a successful response with usable data as stale, not success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          HND: {
            "0": {
              price: 812,
              airline: "NH",
              flight_number: 6,
              departure_at: "2027-05-01T10:00:00Z",
              expires_at: "2026-06-13T00:00:00Z",
            },
          },
        },
      }),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("stale");
    expect(envelope.metadata.isStale).toBe(true);
    expect(envelope.metadata.isLive).toBe(true);
  });

  it("maps an empty data object to no_results", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {} }),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("no_results");
    expect(envelope.data).toEqual([]);
  });

  it("maps HTTP 401 to error without leaking the token or response body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, error: "invalid token test-token" }, 401),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("error");
    expect(envelope.data).toEqual([]);
    const messageText = JSON.stringify(envelope.messages);
    expect(messageText).not.toContain("test-token");
    expect(messageText).not.toContain("invalid token");
  });

  it("maps HTTP 403 to error without leaking the token or response body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, error: "forbidden test-token" }, 403),
    );

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("error");
    const messageText = JSON.stringify(envelope.messages);
    expect(messageText).not.toContain("test-token");
  });

  it("maps HTTP 429 to rate_limited", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("rate_limited");
    expect(envelope.data).toEqual([]);
  });

  it("maps a network failure to error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("error");
    expect(envelope.data).toEqual([]);
  });

  it("maps a non-2xx/401/403/429 failure (5xx) to error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("error");
  });

  it("returns error and does not call fetch when the token is missing", async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN;

    const envelope = await searchTravelpayoutsCashFlights(search);

    expect(envelope.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
