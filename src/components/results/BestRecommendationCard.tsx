"use client";

import type { JSX } from "react";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import { formatRouteSummary } from "@/lib/results/routeDetails";
import type {
  RecommendationLabel,
  ScoredAwardOption,
} from "@/lib/scoring/recommendations";
import type { AwardFlightOption } from "@/types/awards";
import type { Cabin, RouteDetail } from "@/types/flights";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const cabinLabels: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatRecommendationLabel(label: RecommendationLabel): string {
  if (label === "best_overall") {
    return "Best Overall";
  }

  if (label === "best_value") {
    return "Best Value";
  }

  if (label === "lowest_fees") {
    return "Lowest Fees";
  }

  if (label === "cash_check") {
    return "Pay Cash Check";
  }

  return "Not Enough Points";
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

function formatRecommendationAction(option: AwardFlightOption): string {
  if (option.transferSources.length === 0) {
    return `Check ${option.airlineProgram} miles before paying cash`;
  }

  return `Transfer points to ${option.airlineProgram}`;
}

function PlaneIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.5 12.5h16.2c.8 0 1.1 1 .4 1.4l-4.2 2.7-1 3.4h-2.1l.4-4.9-4.9 2.4H6.1l2.8-4.3-5.4-.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m9 12.4-2.8-4h2.2l5.2 3.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m4.2 10.4 3.4 3.2 8.2-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: JSX.Element | string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-white/12 bg-white/8 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-semibold leading-tight text-white">
        {value}
      </p>
    </div>
  );
}

interface BestRecommendationCardProps {
  bestAwardOption: ScoredAwardOption | undefined;
  cashBenchmark: number;
}

export function BestRecommendationCard({
  bestAwardOption,
  cashBenchmark,
}: BestRecommendationCardProps): JSX.Element {
  if (!bestAwardOption) {
    return (
      <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Best Overall
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
          No award option matches the current filters
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#637268]">
          Relax one or more filters to restore the recommendation panel.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-[#d9e2d6] bg-[#0f2f22] p-5 text-white shadow-[0_18px_50px_rgba(15,47,34,0.18)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a8d5bd]">
            {formatRecommendationLabel(bestAwardOption.recommendationLabel)}
          </p>
          <h3 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight">
            {formatRecommendationAction(bestAwardOption)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#cfe6d8]">
            {getRouteSummary(bestAwardOption)} -{" "}
            {cabinLabels[bestAwardOption.cabin]}
          </p>
        </div>
        <PlaneIcon className="h-10 w-10 shrink-0 text-[#a8d5bd]" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Score"
          value={String(bestAwardOption.score.totalScore)}
        />
        <MetricCard
          label="Miles"
          value={formatNumber(bestAwardOption.pointsRequired)}
        />
        <MetricCard
          label="Taxes"
          value={formatCurrency(bestAwardOption.taxesAndFeesUsd)}
        />
        <MetricCard label="Cash" value={formatCurrency(cashBenchmark)} />
        <MetricCard
          label={<CentsPerPointHelp />}
          value={bestAwardOption.centsPerPoint?.toFixed(1) ?? "0.0"}
        />
      </div>

      <div className="mt-5 space-y-3">
        {bestAwardOption.score.explanation.map((explanation) => (
          <div className="flex gap-3 text-sm leading-6" key={explanation}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a8d5bd] text-[#0f2f22]">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[#e7f2eb]">{explanation}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
