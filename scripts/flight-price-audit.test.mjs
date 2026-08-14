import { describe, expect, it } from "vitest";
import {
  buildTables,
  getCashAuditSummary,
  renderMarkdownReport,
} from "./flight-price-audit.mjs";

function createRecord({
  cashProviderId = "travelpayouts",
  cashProviderIsLive = true,
  cashProviderLabel = "Travelpayouts",
  cashResults,
  cashStatus = "success",
  date,
  fallbackTriggered = true,
  itineraryIds,
  runIndex,
  usablePrices,
}) {
  return {
    runIndex,
    origin: "DCA",
    destination: "ATL",
    date,
    providerMode: "mixed",
    status: {
      cash: cashStatus,
      awards: "success",
      overall: cashStatus === "success" ? "success" : "partial",
    },
    providerQueried: {
      cash: cashProviderLabel,
      awards: "Mock Award Provider",
    },
    fallback: {
      anyFallbackTriggered: fallbackTriggered,
    },
    providerMetadata: {
      cash: {
        providerId: cashProviderId,
        providerLabel: cashProviderLabel,
        isLive: cashProviderIsLive,
      },
      awards: {
        providerId: "mock-awards",
        providerLabel: "Mock Award Provider",
        isLive: false,
      },
    },
    priceConsistency: {
      cash: {
        resultCount: cashResults,
        usablePriceCount: usablePrices,
        usablePriceRate:
          cashResults === 0 ? 0 : Math.round((usablePrices / cashResults) * 1000) / 10,
        minPrice: cashResults === 0 ? null : 250,
        medianPrice: cashResults === 0 ? null : 250,
        itineraryIds,
      },
      awards: {
        resultCount: 3,
        usablePointsCount: 3,
        usableFeesCount: 3,
      },
    },
    normalized: {
      calculatedCentsPerPoint: cashResults === 0 ? null : 2.4,
    },
  };
}

describe("flight price audit report classification", () => {
  it("separates stable zero-result coverage gaps from returned-price instability", () => {
    const records = [
      createRecord({
        cashResults: 0,
        date: "2026-09-03",
        itineraryIds: [],
        runIndex: 1,
        usablePrices: 0,
      }),
      createRecord({
        cashResults: 0,
        date: "2026-09-03",
        itineraryIds: [],
        runIndex: 2,
        usablePrices: 0,
      }),
      createRecord({
        cashResults: 1,
        date: "2026-10-29",
        itineraryIds: ["cash-1"],
        runIndex: 1,
        usablePrices: 1,
      }),
      createRecord({
        cashResults: 1,
        date: "2026-10-29",
        itineraryIds: ["cash-1"],
        runIndex: 2,
        usablePrices: 1,
      }),
    ];
    const tables = buildTables(records);
    const summary = getCashAuditSummary(records, tables);
    const report = renderMarkdownReport({
      generatedAt: "2026-08-13T00:00:00.000Z",
      records,
      tables,
    });

    expect(tables.priceConsistency).toEqual([
      expect.objectContaining({
        classification: "stable_zero_results",
        stable: true,
      }),
      expect.objectContaining({
        classification: "stable_returned_prices",
        stable: true,
      }),
    ]);
    expect(summary).toMatchObject({
      actualPriceInstabilityCount: 0,
      cashCoverageGaps: 1,
      returnedCashOptionsWithMissingPrices: 0,
      returnedCashResultUsablePriceRate: 100,
      stableZeroResultCount: 1,
    });
    expect(report).toContain(
      "Cash coverage gaps: 1 of 2 route/date combinations returned zero Travelpayouts cash results.",
    );
    expect(report).toContain("Returned cash result usable price rate: 100%.");
    expect(report).toContain(
      "Repeated returned-price stability: stable for route/date combinations with returned results.",
    );
    expect(report).not.toContain("Routes with unstable prices");
  });

  it("reports no-cash-provider as unavailable without naming a removed candidate", () => {
    const records = [
      createRecord({
        cashProviderId: "no-cash-provider",
        cashProviderIsLive: false,
        cashProviderLabel: "No Cash Provider",
        cashResults: 0,
        date: "2026-09-03",
        fallbackTriggered: true,
        itineraryIds: [],
        runIndex: 1,
        usablePrices: 0,
      }),
    ];
    const tables = buildTables(records);
    const report = renderMarkdownReport({
      generatedAt: "2026-08-13T00:00:00.000Z",
      records,
      tables,
    });

    expect(tables.routeCoverage[0]).toMatchObject({
      cashAvailability: "no_cash_provider_configured",
      provider: "No Cash Provider",
      fallbackTriggered: true,
      notes: "No production cash provider is configured; the app returned an explicit unavailable cash envelope.",
    });
    expect(report).toContain(
      "future structured-provider normalization",
    );
    expect(report).toContain(
      "otherwise returns no cash result in production or mock cash in local/test",
    );
    expect(report).toContain("no_cash_provider_configured");
  });

  it("reports requested live cash as unavailable when no live cash prices are returned from an error envelope", () => {
    const records = [
      createRecord({
        cashProviderId: "travelpayouts",
        cashProviderIsLive: true,
        cashProviderLabel: "Travelpayouts",
        cashResults: 0,
        cashStatus: "error",
        date: "2026-09-03",
        fallbackTriggered: false,
        itineraryIds: [],
        runIndex: 1,
        usablePrices: 0,
      }),
    ];
    const tables = buildTables(records);
    const report = renderMarkdownReport({
      generatedAt: "2026-08-13T00:00:00.000Z",
      records,
      tables,
    });

    expect(tables.routeCoverage[0]).toMatchObject({
      cashAvailability: "live_cash_unavailable",
      provider: "Travelpayouts",
      fallbackTriggered: false,
      resultsReturned: 0,
      resultsWithPrice: 0,
      notes:
        "Live cash provider was requested but returned an unavailable envelope; do not treat this as a live cash price.",
    });
    expect(report).toContain("live_cash_unavailable");
  });
});
