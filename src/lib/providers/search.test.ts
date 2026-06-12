import { describe, expect, it, vi } from "vitest";
import { searchFlightsWithProviders } from "@/lib/providers/search";
import type {
  FlightSearchProviderSet,
  ProviderResultEnvelope,
  ProviderStatus,
} from "@/lib/providers/types";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
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

const cashOption: CashFlightOption = {
  id: "cash-1",
  source: "mock",
  airline: "Mock cash",
  flightNumbers: ["MOCK100"],
  origin: "IAD",
  destination: "HND",
  departureDateTime: "2027-05-01T10:00:00-04:00",
  arrivalDateTime: "2027-05-02T15:00:00+09:00",
  durationMinutes: 840,
  stops: 1,
  cabin: "business",
  cashPriceUsd: 7100,
};

const awardOption: AwardFlightOption = {
  id: "award-1",
  source: "mock",
  airlineProgram: "Air Canada Aeroplan",
  origin: "IAD",
  destination: "HND",
  departureDateTime: "2027-05-01T09:15:00-04:00",
  arrivalDateTime: "2027-05-02T14:50:00+09:00",
  cabin: "business",
  pointsRequired: 120000,
  taxesAndFeesUsd: 186,
  transferSources: ["Chase"],
  stops: 1,
  durationMinutes: 910,
  confidence: "high",
};

function createEnvelope<T>({
  data,
  providerId,
  providerLabel,
  status,
}: {
  data: T[];
  providerId: string;
  providerLabel: string;
  status: ProviderStatus;
}): ProviderResultEnvelope<T> {
  return {
    status,
    data,
    metadata: {
      providerId,
      providerLabel,
      searchedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
    },
    messages: [
      {
        code: `${providerId}_${status}`,
        severity: status === "error" ? "error" : "info",
        message: `${providerLabel} returned ${status}.`,
      },
    ],
  };
}

function createProviders({
  awardEnvelope = createEnvelope({
    data: [awardOption],
    providerId: "award",
    providerLabel: "Award",
    status: "success",
  }),
  cashEnvelope = createEnvelope({
    data: [cashOption],
    providerId: "cash",
    providerLabel: "Cash",
    status: "success",
  }),
}: {
  awardEnvelope?: ProviderResultEnvelope<AwardFlightOption>;
  cashEnvelope?: ProviderResultEnvelope<CashFlightOption>;
} = {}): FlightSearchProviderSet {
  return {
    cashProvider: {
      id: "cash",
      label: "Cash",
      searchCashFlights: vi.fn().mockResolvedValue(cashEnvelope),
    },
    awardProvider: {
      id: "award",
      label: "Award",
      searchAwardFlights: vi.fn().mockResolvedValue(awardEnvelope),
    },
  };
}

describe("searchFlightsWithProviders", () => {
  it("calls cash and award providers with the search", async () => {
    const providers = createProviders();

    await searchFlightsWithProviders(search, providers);

    expect(providers.cashProvider.searchCashFlights).toHaveBeenCalledWith(search);
    expect(providers.awardProvider.searchAwardFlights).toHaveBeenCalledWith(search);
  });

  it("returns a combined flight search envelope", async () => {
    const providers = createProviders();

    await expect(searchFlightsWithProviders(search, providers)).resolves.toEqual({
      cash: expect.objectContaining({
        status: "success",
        data: [cashOption],
      }),
      awards: expect.objectContaining({
        status: "success",
        data: [awardOption],
      }),
      overallStatus: "success",
      messages: [
        {
          code: "cash_success",
          severity: "info",
          message: "Cash returned success.",
        },
        {
          code: "award_success",
          severity: "info",
          message: "Award returned success.",
        },
      ],
    });
  });

  it("returns partial when cash succeeds and awards have no results", async () => {
    const providers = createProviders({
      awardEnvelope: createEnvelope({
        data: [],
        providerId: "award",
        providerLabel: "Award",
        status: "no_results",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toMatchObject({
      overallStatus: "partial",
      cash: {
        status: "success",
        data: [cashOption],
      },
      awards: {
        status: "no_results",
        data: [],
      },
    });
  });

  it("returns partial when cash has no results and awards succeed", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [],
        providerId: "cash",
        providerLabel: "Cash",
        status: "no_results",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toMatchObject({
      overallStatus: "partial",
      cash: {
        status: "no_results",
        data: [],
      },
      awards: {
        status: "success",
        data: [awardOption],
      },
    });
  });

  it("returns no_results when both providers have no results", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [],
        providerId: "cash",
        providerLabel: "Cash",
        status: "no_results",
      }),
      awardEnvelope: createEnvelope({
        data: [],
        providerId: "award",
        providerLabel: "Award",
        status: "no_results",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toHaveProperty(
      "overallStatus",
      "no_results",
    );
  });

  it("returns error when both providers return error envelopes", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [],
        providerId: "cash",
        providerLabel: "Cash",
        status: "error",
      }),
      awardEnvelope: createEnvelope({
        data: [],
        providerId: "award",
        providerLabel: "Award",
        status: "error",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toHaveProperty(
      "overallStatus",
      "error",
    );
  });

  it("returns unsupported_route when both providers return unsupported_route", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [],
        providerId: "cash",
        providerLabel: "Cash",
        status: "unsupported_route",
      }),
      awardEnvelope: createEnvelope({
        data: [],
        providerId: "award",
        providerLabel: "Award",
        status: "unsupported_route",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toHaveProperty(
      "overallStatus",
      "unsupported_route",
    );
  });

  it("returns rate_limited when both providers return rate_limited", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [],
        providerId: "cash",
        providerLabel: "Cash",
        status: "rate_limited",
      }),
      awardEnvelope: createEnvelope({
        data: [],
        providerId: "award",
        providerLabel: "Award",
        status: "rate_limited",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toHaveProperty(
      "overallStatus",
      "rate_limited",
    );
  });

  it("returns stale when both providers return stale usable data", async () => {
    const providers = createProviders({
      cashEnvelope: createEnvelope({
        data: [cashOption],
        providerId: "cash",
        providerLabel: "Cash",
        status: "stale",
      }),
      awardEnvelope: createEnvelope({
        data: [awardOption],
        providerId: "award",
        providerLabel: "Award",
        status: "stale",
      }),
    });

    await expect(searchFlightsWithProviders(search, providers)).resolves.toMatchObject({
      overallStatus: "stale",
      cash: {
        status: "stale",
        data: [cashOption],
      },
      awards: {
        status: "stale",
        data: [awardOption],
      },
    });
  });

  it("converts provider exceptions into error envelopes", async () => {
    const providers: FlightSearchProviderSet = {
      cashProvider: {
        id: "cash",
        label: "Cash",
        searchCashFlights: vi.fn().mockRejectedValue(new Error("Provider failed")),
      },
      awardProvider: {
        id: "award",
        label: "Award",
        searchAwardFlights: vi.fn().mockResolvedValue(
          createEnvelope({
            data: [awardOption],
            providerId: "award",
            providerLabel: "Award",
            status: "success",
          }),
        ),
      },
    };

    await expect(searchFlightsWithProviders(search, providers)).resolves.toMatchObject({
      cash: {
        status: "error",
        data: [],
        metadata: {
          providerId: "cash",
          providerLabel: "Cash",
          isLive: false,
        },
        messages: [
          {
            code: "cash_exception",
            severity: "error",
            message: "Cash provider failed unexpectedly.",
          },
        ],
      },
      awards: {
        status: "success",
        data: [awardOption],
      },
      overallStatus: "partial",
    });
  });
});
