"use client";

import type { JSX } from "react";
import { NoProviderResultsState } from "@/components/results/NoProviderResultsState";
import { formatRouteSummary } from "@/lib/results/routeDetails";
import type { ScoredCashOption } from "@/lib/scoring/recommendations";
import type { ProviderStatus } from "@/lib/providers/types";
import type { RouteDetail } from "@/types/flights";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function getRouteSummary(option: {
  origin: string;
  destination: string;
  routeDetail?: RouteDetail;
}): string {
  if (option.routeDetail) {
    return formatRouteSummary(option.routeDetail);
  }

  return `${option.origin} -> ${option.destination}`;
}

interface CashBenchmarkCardProps {
  cashOption: ScoredCashOption | undefined;
  hasAwardResults: boolean;
  passengers: number;
  status: ProviderStatus;
}

export function CashBenchmarkCard({
  cashOption,
  hasAwardResults,
  passengers,
  status,
}: CashBenchmarkCardProps): JSX.Element {
  if (!cashOption) {
    return (
      <NoProviderResultsState
        hasOtherResults={hasAwardResults}
        kind="cash"
        status={status}
      />
    );
  }

  return (
    <article className="rounded-lg border border-[#ead99d] bg-[#fffdf6] p-5 md:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d4c1d]">
        Lowest reasonable cash fare
      </p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-4xl font-semibold tracking-tight text-[#14211b]">
            {formatCurrency(cashOption.cashPriceUsd)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#637268]">
            Deterministic mock fare for {formatNumber(passengers)} passenger
            {passengers === 1 ? "" : "s"}. This benchmark is used to calculate
            redemption value after taxes and fees.
          </p>
        </div>
        <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#5d4c1d]">
          {getRouteSummary(cashOption)}
        </p>
      </div>
    </article>
  );
}
