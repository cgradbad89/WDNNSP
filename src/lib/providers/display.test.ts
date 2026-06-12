import { describe, expect, it } from "vitest";
import {
  getFlightSearchDisplayState,
  getNoProviderResultsDisplay,
  getPrimaryProviderMessages,
  getProviderStatusDisplay,
} from "@/lib/providers/display";
import type {
  FlightSearchEnvelope,
  ProviderMessage,
  ProviderResultEnvelope,
  ProviderStatus,
} from "@/lib/providers/types";

type TestCashOption = { id: string };
type TestAwardOption = { id: string };

const cashOption: TestCashOption = { id: "cash-1" };
const awardOption: TestAwardOption = { id: "award-1" };

function createMessage(
  status: ProviderStatus,
  severity: ProviderMessage["severity"] = "info",
): ProviderMessage {
  return {
    code: `provider_${status}`,
    severity,
    message: `Provider returned ${status}.`,
  };
}

function createEnvelope<T>({
  data,
  isStale,
  providerId,
  status,
}: {
  data: T[];
  isStale?: boolean;
  providerId: string;
  status: ProviderStatus;
}): ProviderResultEnvelope<T> {
  return {
    status,
    data,
    metadata: {
      providerId,
      providerLabel: providerId,
      searchedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
      isStale,
    },
    messages: [
      createMessage(
        status,
        status === "error"
          ? "error"
          : status === "success"
            ? "info"
            : "warning",
      ),
    ],
  };
}

function createFlightSearchEnvelope({
  awardData = [awardOption],
  awardIsStale,
  awardStatus = "success",
  cashData = [cashOption],
  cashIsStale,
  cashStatus = "success",
  overallStatus = "success",
}: {
  awardData?: TestAwardOption[];
  awardIsStale?: boolean;
  awardStatus?: ProviderStatus;
  cashData?: TestCashOption[];
  cashIsStale?: boolean;
  cashStatus?: ProviderStatus;
  overallStatus?: ProviderStatus;
} = {}): FlightSearchEnvelope {
  const cash = createEnvelope({
    data: cashData,
    isStale: cashIsStale,
    providerId: "cash",
    status: cashStatus,
  });
  const awards = createEnvelope({
    data: awardData,
    isStale: awardIsStale,
    providerId: "awards",
    status: awardStatus,
  });

  return {
    cash,
    awards,
    overallStatus,
    messages: [...cash.messages, ...awards.messages],
  };
}

describe("provider display helpers", () => {
  it("classifies cash success and award success as full results", () => {
    expect(getFlightSearchDisplayState(createFlightSearchEnvelope())).toMatchObject({
      hasAwardResults: true,
      hasCashResults: true,
      mode: "cash_and_awards",
      showStatusBanner: false,
      status: "success",
    });
  });

  it("classifies cash success and award no-results as cash-only partial results", () => {
    expect(
      getFlightSearchDisplayState(
        createFlightSearchEnvelope({
          awardData: [],
          awardStatus: "no_results",
          overallStatus: "partial",
        }),
      ),
    ).toMatchObject({
      hasAwardResults: false,
      hasCashResults: true,
      mode: "cash_only",
      showStatusBanner: true,
      status: "partial",
    });
  });

  it("classifies cash no-results and award success as award-only partial results", () => {
    expect(
      getFlightSearchDisplayState(
        createFlightSearchEnvelope({
          cashData: [],
          cashStatus: "no_results",
          overallStatus: "partial",
        }),
      ),
    ).toMatchObject({
      hasAwardResults: true,
      hasCashResults: false,
      mode: "awards_only",
      showStatusBanner: true,
      status: "partial",
    });
  });

  it("classifies both no-results as no provider results", () => {
    expect(
      getFlightSearchDisplayState(
        createFlightSearchEnvelope({
          awardData: [],
          awardStatus: "no_results",
          cashData: [],
          cashStatus: "no_results",
          overallStatus: "no_results",
        }),
      ),
    ).toMatchObject({
      mode: "none",
      showStatusBanner: true,
      status: "no_results",
    });
  });

  it("keeps a cash error plus award success as award-only partial results", () => {
    expect(
      getFlightSearchDisplayState(
        createFlightSearchEnvelope({
          cashData: [],
          cashStatus: "error",
          overallStatus: "partial",
        }),
      ),
    ).toMatchObject({
      hasAwardResults: true,
      hasCashResults: false,
      mode: "awards_only",
      status: "partial",
    });
  });

  it("returns an error display when both providers fail", () => {
    const state = getFlightSearchDisplayState(
      createFlightSearchEnvelope({
        awardData: [],
        awardStatus: "error",
        cashData: [],
        cashStatus: "error",
        overallStatus: "error",
      }),
    );

    expect(state.mode).toBe("none");
    expect(state.banner).toMatchObject({
      status: "error",
      tone: "error",
      title: "Provider results unavailable",
    });
  });

  it("returns a rate-limit display when providers are rate limited", () => {
    expect(getProviderStatusDisplay("rate_limited")).toMatchObject({
      tone: "warning",
      title: "Provider rate limit reached",
    });
  });

  it("returns an unsupported-route display when providers cannot cover the route", () => {
    expect(getProviderStatusDisplay("unsupported_route")).toMatchObject({
      tone: "warning",
      title: "Route not supported by current providers",
    });
  });

  it("marks stale provider data for source and freshness cautions", () => {
    expect(
      getFlightSearchDisplayState(
        createFlightSearchEnvelope({
          awardIsStale: true,
          awardStatus: "stale",
          cashIsStale: true,
          cashStatus: "stale",
          overallStatus: "stale",
        }),
      ),
    ).toMatchObject({
      isStale: true,
      mode: "cash_and_awards",
      showStatusBanner: true,
      status: "stale",
    });
  });

  it("sorts user-safe provider messages by severity and removes duplicates", () => {
    const messages: ProviderMessage[] = [
      { code: "mock", severity: "info", message: "Using mock data." },
      { code: "rate", severity: "warning", message: "Rate limited." },
      { code: "rate", severity: "warning", message: "Rate limited." },
      { code: "error", severity: "error", message: "Provider failed." },
    ];

    expect(getPrimaryProviderMessages(messages)).toEqual([
      { code: "error", severity: "error", message: "Provider failed." },
      { code: "rate", severity: "warning", message: "Rate limited." },
      { code: "mock", severity: "info", message: "Using mock data." },
    ]);
  });

  it("describes an unavailable cash benchmark without hiding award results", () => {
    expect(
      getNoProviderResultsDisplay({
        hasOtherResults: true,
        kind: "cash",
        status: "no_results",
      }),
    ).toMatchObject({
      title: "Cash benchmark unavailable",
      description: expect.stringContaining("Award options are still shown"),
    });
  });

  it("describes missing award data without implying a recommendation exists", () => {
    expect(
      getNoProviderResultsDisplay({
        hasOtherResults: true,
        kind: "awards",
        status: "no_results",
      }),
    ).toMatchObject({
      title: "No award options from the provider",
      description: expect.stringContaining("no award recommendation"),
    });
  });
});
