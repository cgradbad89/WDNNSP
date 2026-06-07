"use client";

import type { JSX } from "react";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import { ResultsEmptyState } from "@/components/results/ResultsEmptyState";
import { TransferPathDetails } from "@/components/results/TransferPathDetails";
import type { RouteDetailsDrawerState } from "@/components/results/RouteDetailsDrawer";
import {
  formatDuration,
  formatRouteSummary,
} from "@/lib/results/routeDetails";
import type { TransferPathDisplay } from "@/lib/results/transferPaths";
import type {
  RecommendationLabel,
  ScoredAwardOption,
  ScoredCashOption,
} from "@/lib/scoring/recommendations";
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

export interface RankedAwardOptionViewModel {
  directBalance: number;
  option: ScoredAwardOption;
  transferPaths: TransferPathDisplay[];
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatStops(stops: number): string {
  if (stops <= 0) {
    return "Nonstop";
  }

  return `${stops} stop${stops === 1 ? "" : "s"}`;
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

function getLabelTone(label: RecommendationLabel): string {
  if (label === "cash_check") {
    return "bg-[#fff9df] text-[#5d4c1d]";
  }

  if (label === "not_enough_points") {
    return "bg-[#f9e8df] text-[#8f3b24]";
  }

  return "bg-[#edf3ea] text-[#2f6b4f]";
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

interface AwardOptionCardProps {
  directBalance: number;
  onViewRoute: (trigger: HTMLElement) => void;
  option: ScoredAwardOption;
  transferPaths: TransferPathDisplay[];
}

function AwardOptionCard({
  directBalance,
  onViewRoute,
  option,
  transferPaths,
}: AwardOptionCardProps): JSX.Element {
  const isTransferRequired =
    directBalance < option.pointsRequired && transferPaths.length > 0;

  return (
    <article className="rounded-lg border border-[#d9e2d6] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${getLabelTone(
                option.recommendationLabel,
              )}`}
            >
              {formatRecommendationLabel(option.recommendationLabel)}
            </span>
            <span className="rounded-md bg-[#f7faf6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
              {option.confidence} confidence
            </span>
            {isTransferRequired ? (
              <span className="rounded-md bg-[#fff9df] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d4c1d]">
                Transfer required
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#14211b]">
            {option.airlineProgram}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#637268]">
            {getRouteSummary(option)} - {cabinLabels[option.cabin]} -{" "}
            {formatStops(option.stops)} -{" "}
            {formatDuration(
              option.routeDetail?.totalDurationMinutes ??
                option.durationMinutes ??
                0,
            )}
          </p>
          {option.routeDetail?.layovers[0] ? (
            <p className="mt-1 text-sm font-medium text-[#405147]">
              Stop: {option.routeDetail.layovers[0].airport} for{" "}
              {formatDuration(option.routeDetail.layovers[0].durationMinutes)}
            </p>
          ) : null}
        </div>
        <div className="text-left lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
            Score
          </p>
          <p className="mt-1 text-3xl font-semibold text-[#14211b]">
            {option.score.totalScore}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Points required
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatNumber(option.pointsRequired)}
          </p>
        </div>
        <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Taxes/fees
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatCurrency(option.taxesAndFeesUsd)}
          </p>
        </div>
        <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Stops
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatStops(option.stops)}
          </p>
        </div>
        <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            <CentsPerPointHelp />
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {option.centsPerPoint?.toFixed(1) ?? "0.0"}
          </p>
        </div>
        <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Direct balance
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatNumber(directBalance)}
          </p>
        </div>
      </div>

      <TransferPathDetails
        isTransferRequired={isTransferRequired}
        paths={transferPaths}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="w-fit rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
          onClick={(event) => onViewRoute(event.currentTarget)}
          type="button"
        >
          View route details
        </button>
      </div>

      {[...option.score.explanation, ...option.score.warnings].length > 0 ? (
        <div className="mt-4 grid gap-2 text-sm leading-6 text-[#526158] md:grid-cols-2">
          {option.score.explanation.map((explanation) => (
            <p
              className="rounded-md bg-[#edf3ea] px-3 py-2 text-[#2f6b4f]"
              key={explanation}
            >
              {explanation}
            </p>
          ))}
          {option.score.warnings.map((warning) => (
            <p
              className="rounded-md bg-[#fff9df] px-3 py-2 text-[#5d4c1d]"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

interface CashOptionCardProps {
  onViewRoute: (trigger: HTMLElement) => void;
  option: ScoredCashOption;
}

function CashOptionCard({
  onViewRoute,
  option,
}: CashOptionCardProps): JSX.Element {
  return (
    <article className="rounded-lg border border-[#ead99d] bg-[#fffdf6] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${getLabelTone(
              option.recommendationLabel,
            )}`}
          >
            {formatRecommendationLabel(option.recommendationLabel)}
          </span>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#14211b]">
            Cash Fare Benchmark
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#637268]">
            {option.airline} - {getRouteSummary(option)} -{" "}
            {cabinLabels[option.cabin]} - {formatStops(option.stops)}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
            Mock cash price
          </p>
          <p className="mt-1 text-3xl font-semibold text-[#14211b]">
            {formatCurrency(option.cashPriceUsd)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-[#ead99d] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Source
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">Mock</p>
        </div>
        <div className="rounded-md border border-[#ead99d] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Fees
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">Included</p>
        </div>
        <div className="rounded-md border border-[#ead99d] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Stops
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatStops(option.stops)}
          </p>
        </div>
        <div className="rounded-md border border-[#ead99d] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
            Duration
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatDuration(
              option.routeDetail?.totalDurationMinutes ??
                option.durationMinutes,
            )}
          </p>
        </div>
      </div>

      <button
        className="mt-4 w-fit rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-white"
        onClick={(event) => onViewRoute(event.currentTarget)}
        type="button"
      >
        View route details
      </button>
    </article>
  );
}

interface RankedAwardOptionsProps {
  awardOptions: RankedAwardOptionViewModel[];
  cashOption: ScoredCashOption | undefined;
  onViewRoute: (modal: RouteDetailsDrawerState, trigger: HTMLElement) => void;
  totalAwardOptionCount: number;
}

export function RankedAwardOptions({
  awardOptions,
  cashOption,
  onViewRoute,
  totalAwardOptionCount,
}: RankedAwardOptionsProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Ranked options
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
            What to check first
          </h3>
        </div>
        <p className="text-sm text-[#637268]">
          {awardOptions.length} of {totalAwardOptionCount} award options shown
        </p>
      </div>

      {awardOptions.length > 0 ? (
        awardOptions.map(({ directBalance, option, transferPaths }) => (
          <AwardOptionCard
            directBalance={directBalance}
            key={option.id}
            onViewRoute={(trigger) =>
              onViewRoute(
                {
                  title: option.airlineProgram,
                  routeDetail: option.routeDetail,
                },
                trigger,
              )
            }
            option={option}
            transferPaths={transferPaths}
          />
        ))
      ) : (
        <ResultsEmptyState />
      )}

      {cashOption ? (
        <CashOptionCard
          onViewRoute={(trigger) =>
            onViewRoute(
              {
                title: "Cash Fare Benchmark",
                routeDetail: cashOption.routeDetail,
              },
              trigger,
            )
          }
          option={cashOption}
        />
      ) : null}
    </section>
  );
}
