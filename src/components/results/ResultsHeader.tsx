"use client";

import type { JSX } from "react";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import type { ScoredAwardOption } from "@/lib/scoring/recommendations";
import type { DecisionOption } from "@/types/decisions";
import type { CashFlightOption } from "@/types/flights";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

interface ResultsHeaderProps {
  bestAwardOption: ScoredAwardOption | undefined;
  bestDecisionOption: DecisionOption | undefined;
  cashOption: CashFlightOption | undefined;
  hasAwardResults: boolean;
  hasCashResults: boolean;
  selectedSearchName: string;
}

export function ResultsHeader({
  bestAwardOption,
  bestDecisionOption,
  cashOption,
  hasAwardResults,
  hasCashResults,
  selectedSearchName,
}: ResultsHeaderProps): JSX.Element {
  const hasAnyResults = hasCashResults || hasAwardResults;
  const title = bestDecisionOption
    ? `Best option for ${selectedSearchName}`
    : hasAwardResults && !hasCashResults
      ? `Partial results for ${selectedSearchName}`
      : hasCashResults && !hasAwardResults
        ? `Cash results for ${selectedSearchName}`
        : hasAnyResults
          ? `Partial results for ${selectedSearchName}`
          : `No provider results for ${selectedSearchName}`;
  const description =
    bestDecisionOption?.type === "cash"
      ? "Cash and award options are evaluated as competing ways to satisfy the active search using default point-valuation assumptions."
      : bestDecisionOption?.type === "award"
        ? "Cash fare estimates and award provider data are compared for the active search, then ranked by the unified decision engine."
        : hasAwardResults && !hasCashResults
          ? "Award options are available, but cash pricing is unavailable or not comparable for this search."
          : hasCashResults && !hasAwardResults
            ? "No comparable award options were found for this search."
            : hasAnyResults
              ? "Provider results are available, but no cash-vs-award option is safe enough to recommend yet."
              : "The current providers did not return usable cash or award results for this search.";
  const cashEstimate = hasCashResults && cashOption
    ? formatCurrency(cashOption.cashPriceUsd)
    : "None";

  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Results
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
            {description}
          </p>
        </div>
        <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[420px] sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              Recommendation score
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {bestDecisionOption?.score ?? "None"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              <CentsPerPointHelp />
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {bestAwardOption?.centsPerPoint?.toFixed(1) ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              Cash estimate
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {cashEstimate}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
