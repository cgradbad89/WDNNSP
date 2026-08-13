import { describe, expect, it } from "vitest";
import {
  buildTables,
  getCashAuditSummary,
  renderMarkdownReport,
} from "./flight-price-audit.mjs";

function createRecord({
  cashResults,
  date,
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
    providerQueried: {
      cash: "Travelpayouts",
      awards: "Mock Award Provider",
    },
    fallback: {
      anyFallbackTriggered: true,
    },
    providerMetadata: {
      cash: {
        providerId: "travelpayouts",
        providerLabel: "Travelpayouts",
        isLive: true,
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
});
