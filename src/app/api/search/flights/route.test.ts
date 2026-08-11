import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/search/flights/route";
import type { FlightSearchApiResponse } from "@/lib/providers/apiTypes";
import type { SavedSearch } from "@/types/search";
import * as searchModule from "@/lib/providers/search";

vi.mock("@/lib/providers/search", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/providers/search")>();
  return {
    ...mod,
    searchFlightsWithProviders: vi.fn(),
  };
});

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
  beforeEach(() => {
    vi.mocked(searchModule.searchFlightsWithProviders).mockReset();
  });

  const createSuccessEnvelope = () => ({
    status: "success" as const,
    data: [],
    metadata: { providerId: "p1", providerLabel: "Provider", searchedAt: "2026-06-06T00:00:00.000Z", isLive: false },
    messages: []
  });

  it("returns both cash and award envelopes for a valid search", async () => {
    vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
      cash: createSuccessEnvelope(),
      awards: createSuccessEnvelope(),
      overallStatus: "success",
      messages: []
    });

    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.envelope.overallStatus).toBe("success");
      expect(body.envelope.cash.status).toBe("success");
      expect(body.envelope.awards.status).toBe("success");
    }
  });

  it("degrades gracefully without 500 if one provider fails (cash-only/award-only)", async () => {
    const errorEnvelope = {
      status: "error" as const,
      data: [],
      metadata: { providerId: "p2", providerLabel: "FailProvider", searchedAt: "2026", isLive: false },
      messages: [{ code: "err", severity: "error" as const, message: "failed" }]
    };
    
    vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
      cash: createSuccessEnvelope(),
      awards: errorEnvelope,
      overallStatus: "partial",
      messages: errorEnvelope.messages
    });

    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(200); // Does not throw 500
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.envelope.overallStatus).toBe("partial");
      expect(body.envelope.cash.status).toBe("success");
      expect(body.envelope.awards.status).toBe("error");
    }
  });

  it("returns a structured failure state if both providers fail, not a raw thrown error", async () => {
    const errorEnvelope = {
      status: "error" as const,
      data: [],
      metadata: { providerId: "p2", providerLabel: "FailProvider", searchedAt: "2026", isLive: false },
      messages: [{ code: "err", severity: "error" as const, message: "failed" }]
    };

    vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
      cash: errorEnvelope,
      awards: errorEnvelope,
      overallStatus: "error",
      messages: [...errorEnvelope.messages, ...errorEnvelope.messages]
    });

    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(200); // Structured failure, not 500
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.envelope.overallStatus).toBe("error");
      expect(body.envelope.cash.status).toBe("error");
    }
  });

  it("surfaces rate-limited provider as a distinct state", async () => {
    const rateLimitedEnvelope = {
      status: "rate_limited" as const,
      data: [],
      metadata: { providerId: "p2", providerLabel: "RateProvider", searchedAt: "2026", isLive: false },
      messages: [{ code: "rate", severity: "warning" as const, message: "Rate limit exceeded" }]
    };

    vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
      cash: createSuccessEnvelope(),
      awards: rateLimitedEnvelope,
      overallStatus: "partial",
      messages: rateLimitedEnvelope.messages
    });

    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.envelope.awards.status).toBe("rate_limited");
    }
  });

  it("never contains provider API keys or raw upstream stack traces (contract assertion)", async () => {
    vi.mocked(searchModule.searchFlightsWithProviders).mockRejectedValueOnce(
      new Error("Raw upstream error with API_KEY=secret_123")
    );

    const response = await POST(createRequest({ search: validSearch }));
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe("SEARCH_FAILED");
      expect(body.error.message).not.toContain("secret_123");
      expect(body.error.message).not.toContain("Raw upstream error");
      expect(body.error.message).toBe("Flight search failed. Please try again.");
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
        message: "Choose a supported origin, destination, date, and traveler count.",
      },
    });
    // Rejected before provider call
    expect(searchModule.searchFlightsWithProviders).not.toHaveBeenCalled();
  });

  it("returns INVALID_SEARCH for unsupported airport selections", async () => {
    const response = await POST(
      createRequest({
        search: { ...validSearch, originCodes: ["ZZZ"] },
      })
    );
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "INVALID_SEARCH" } });
    expect(searchModule.searchFlightsWithProviders).not.toHaveBeenCalled();
  });

  it("returns INVALID_SEARCH for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/search/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    );
    const body = (await response.json()) as FlightSearchApiResponse;

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "INVALID_SEARCH" } });
    expect(searchModule.searchFlightsWithProviders).not.toHaveBeenCalled();
  });
});
