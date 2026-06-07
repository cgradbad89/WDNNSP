"use client";

import type { JSX } from "react";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import type { ScoredAwardOption } from "@/lib/scoring/recommendations";
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
  cashOption: CashFlightOption | undefined;
  selectedSearchName: string;
}

export function ResultsHeader({
  bestAwardOption,
  cashOption,
  selectedSearchName,
}: ResultsHeaderProps): JSX.Element {
  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Results
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
            Best option for {selectedSearchName}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
            Mock cash and award data are compared for the active search, then
            ranked with the weighted recommendation engine.
          </p>
        </div>
        <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[420px] sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              Recommendation score
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {bestAwardOption?.score.totalScore ?? "None"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              <CentsPerPointHelp />
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {bestAwardOption?.centsPerPoint?.toFixed(1) ?? "0.0"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              Cash benchmark
            </p>
            <p className="mt-2 text-xl font-semibold text-[#14211b]">
              {cashOption ? formatCurrency(cashOption.cashPriceUsd) : "None"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
