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

vi.mock("@/lib/providers/travelpayouts", async (importOriginal) => {
  const mod = await importOriginal<
    typeof import("@/lib/providers/travelpayouts")
  >();
  return {
    ...mod,
    searchTravelpayoutsCashFlights: vi.fn(),
  };
});

vi.mock("@/lib/providers/seatsAero", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/providers/seatsAero")>();
  return {
    ...mod,
    searchSeatsAeroAwardFlights: vi.fn(),
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

  describe("live cash provider toggle", () => {
    const originalEnableFlag = process.env.ENABLE_LIVE_CASH_PROVIDER;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalToken = process.env.TRAVELPAYOUTS_TOKEN;

    afterEach(() => {
      if (originalEnableFlag === undefined) {
        delete process.env.ENABLE_LIVE_CASH_PROVIDER;
      } else {
        process.env.ENABLE_LIVE_CASH_PROVIDER = originalEnableFlag;
      }

      if (originalToken === undefined) {
        delete process.env.TRAVELPAYOUTS_TOKEN;
      } else {
        process.env.TRAVELPAYOUTS_TOKEN = originalToken;
      }

      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("uses the mock cash provider for local/test when the flag is off", async () => {
      process.env.ENABLE_LIVE_CASH_PROVIDER = "false";
      process.env.NODE_ENV = "test";
      process.env.TRAVELPAYOUTS_TOKEN = "test-token";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.cashProvider.id).toBe("mock-cash");
    });

    it("returns no cash provider in production when no cash provider is configured", async () => {
      process.env.ENABLE_LIVE_CASH_PROVIDER = "false";
      process.env.NODE_ENV = "production";
      delete process.env.TRAVELPAYOUTS_TOKEN;
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.cashProvider.id).toBe("no-cash-provider");
      expect(providers.cashProvider.isLive).toBe(false);
      await expect(
        providers.cashProvider.searchCashFlights(validSearch),
      ).resolves.toMatchObject({
        status: "error",
        data: [],
        metadata: {
          providerId: "no-cash-provider",
          providerLabel: "No Cash Provider",
          isLive: false,
        },
        messages: [
          {
            code: "cash_provider_not_configured",
            severity: "error",
            message: "No production cash provider is configured. Configure a structured cash provider or Travelpayouts to show cash results.",
            internalReasons: ["cash_provider_not_configured"],
          },
        ],
      });
    });

    it("returns an unavailable Travelpayouts provider when the token is missing, not mock cash", async () => {
      process.env.ENABLE_LIVE_CASH_PROVIDER = "true";
      delete process.env.TRAVELPAYOUTS_TOKEN;
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.cashProvider.id).toBe("travelpayouts");
      expect(providers.cashProvider.isLive).toBe(true);
      await expect(
        providers.cashProvider.searchCashFlights(validSearch),
      ).resolves.toMatchObject({
        status: "error",
        data: [],
        metadata: {
          providerId: "travelpayouts",
          providerLabel: "Travelpayouts",
          isLive: true,
        },
        messages: [
          {
            code: "travelpayouts_not_configured",
            severity: "error",
            message:
              "Travelpayouts cash provider is enabled but unavailable because required credentials are missing.",
            internalReasons: ["missing_travelpayouts_token"],
          },
        ],
      });
      const unavailableEnvelope =
        await providers.cashProvider.searchCashFlights(validSearch);
      const messageText = JSON.stringify(unavailableEnvelope.messages);

      expect(messageText).not.toContain("TRAVELPAYOUTS_TOKEN");
      expect(messageText).not.toContain("test-token");
    });

    it("uses the live Travelpayouts cash provider when the flag is on and a token is set", async () => {
      process.env.ENABLE_LIVE_CASH_PROVIDER = "true";
      process.env.TRAVELPAYOUTS_TOKEN = "test-token";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.cashProvider.id).toBe("travelpayouts");
    });

    it("keeps the award provider on mock when only the cash toggle is on", async () => {
      process.env.ENABLE_LIVE_CASH_PROVIDER = "true";
      process.env.TRAVELPAYOUTS_TOKEN = "test-token";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.awardProvider.id).toBe("mock-awards");
    });
  });

  describe("live award provider toggle", () => {
    const originalEnableFlag = process.env.ENABLE_LIVE_AWARD_PROVIDER;
    const originalKey = process.env.SEATS_AERO_API_KEY;

    afterEach(() => {
      if (originalEnableFlag === undefined) {
        delete process.env.ENABLE_LIVE_AWARD_PROVIDER;
      } else {
        process.env.ENABLE_LIVE_AWARD_PROVIDER = originalEnableFlag;
      }

      if (originalKey === undefined) {
        delete process.env.SEATS_AERO_API_KEY;
      } else {
        process.env.SEATS_AERO_API_KEY = originalKey;
      }
    });

    it("uses the mock award provider when the flag is off", async () => {
      process.env.ENABLE_LIVE_AWARD_PROVIDER = "false";
      process.env.SEATS_AERO_API_KEY = "test-key";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.awardProvider.id).toBe("mock-awards");
    });

    it("uses the mock award provider when the key is missing, even if the flag is on", async () => {
      process.env.ENABLE_LIVE_AWARD_PROVIDER = "true";
      delete process.env.SEATS_AERO_API_KEY;
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.awardProvider.id).toBe("mock-awards");
    });

    it("uses the live Seats.aero award provider when the flag is on and a key is set", async () => {
      process.env.ENABLE_LIVE_AWARD_PROVIDER = "true";
      process.env.SEATS_AERO_API_KEY = "test-key";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.awardProvider.id).toBe("seats-aero");
    });

    it("keeps the cash provider on mock when only the award toggle is on", async () => {
      process.env.ENABLE_LIVE_AWARD_PROVIDER = "true";
      process.env.SEATS_AERO_API_KEY = "test-key";
      vi.mocked(searchModule.searchFlightsWithProviders).mockResolvedValueOnce({
        cash: createSuccessEnvelope(),
        awards: createSuccessEnvelope(),
        overallStatus: "success",
        messages: [],
      });

      await POST(createRequest({ search: validSearch }));

      const providers = vi.mocked(searchModule.searchFlightsWithProviders).mock
        .calls[0][1];
      expect(providers.cashProvider.id).toBe("mock-cash");
    });
  });
});
