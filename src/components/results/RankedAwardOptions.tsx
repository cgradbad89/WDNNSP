"use client";

import type { JSX } from "react";
import { useState } from "react";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import { NoProviderResultsState } from "@/components/results/NoProviderResultsState";
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
import type { ProviderStatus } from "@/lib/providers/types";
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

function ChevronIcon({
  className,
  isExpanded,
}: {
  className?: string;
  isExpanded: boolean;
}): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={`${className ?? ""} transition-transform ${
        isExpanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

interface AwardOptionRowProps {
  directBalance: number;
  onViewRoute: (trigger: HTMLElement) => void;
  option: ScoredAwardOption;
  transferPaths: TransferPathDisplay[];
}

// Compact, single-line-ish row: badges + program/route summary + score +
// points/taxes are always visible. Everything that was previously always
// shown (direct balance, transfer path details, explanation/warning text)
// is still shown, just behind the expand affordance instead of always-on -
// a display/progressive-disclosure change only, not a data reduction.
// "View route details" stays an explicit, always-visible button so that
// existing detail-view interaction isn't hidden behind the expand toggle.
function AwardOptionRow({
  directBalance,
  onViewRoute,
  option,
  transferPaths,
}: AwardOptionRowProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTransferRequired =
    directBalance < option.pointsRequired && transferPaths.length > 0;
  const extraContentId = `award-option-details-${option.id}`;
  const hasExtraContext =
    isTransferRequired ||
    option.score.explanation.length > 0 ||
    option.score.warnings.length > 0;

  return (
    <article className="rounded-lg border border-[#d9e2d6] bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${getLabelTone(
                option.recommendationLabel,
              )}`}
            >
              {formatRecommendationLabel(option.recommendationLabel)}
            </span>
            <span className="rounded-md bg-[#f7faf6] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#637268]">
              {option.confidence} confidence
            </span>
            {isTransferRequired ? (
              <span className="rounded-md bg-[#fff9df] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#5d4c1d]">
                Transfer required
              </span>
            ) : null}
          </div>
          <h4 className="mt-2 truncate text-base font-semibold tracking-tight text-[#14211b]">
            {option.airlineProgram}
          </h4>
          <p className="truncate text-sm text-[#637268]">
            {getRouteSummary(option)} - {cabinLabels[option.cabin]} -{" "}
            {formatStops(option.stops)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4 lg:gap-6">
          <div className="text-left">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#637268]">
              Score
            </p>
            <p className="text-lg font-semibold text-[#14211b]">
              {option.score.totalScore}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#637268]">
              Points + taxes
            </p>
            <p className="text-sm font-semibold text-[#14211b]">
              {formatNumber(option.pointsRequired)} +{" "}
              {formatCurrency(option.taxesAndFeesUsd)}
            </p>
          </div>
          <button
            className="w-fit shrink-0 rounded-md border border-[#b8c8b2] px-3 py-2 text-xs font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={(event) => onViewRoute(event.currentTarget)}
            type="button"
          >
            View route details
          </button>
          <button
            aria-controls={extraContentId}
            aria-expanded={isExpanded}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#b8c8b2] text-[#405147] transition hover:bg-[#edf3ea]"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            <ChevronIcon className="h-4 w-4" isExpanded={isExpanded} />
            <span className="sr-only">
              {isExpanded ? "Hide details" : "Show details"}
            </span>
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 space-y-3 border-t border-[#edf3ea] pt-4" id={extraContentId}>
          {option.routeDetail?.layovers[0] ? (
            <p className="text-sm font-medium text-[#405147]">
              Stop: {option.routeDetail.layovers[0].airport} for{" "}
              {formatDuration(option.routeDetail.layovers[0].durationMinutes)}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
                Duration
              </p>
              <p className="mt-2 text-lg font-semibold text-[#14211b]">
                {formatDuration(
                  option.routeDetail?.totalDurationMinutes ??
                    option.durationMinutes ??
                    0,
                )}
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

          {[...option.score.explanation, ...option.score.warnings].length >
          0 ? (
            <div className="grid gap-2 text-sm leading-6 text-[#526158] md:grid-cols-2">
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
        </div>
      ) : hasExtraContext ? (
        <p className="mt-2 text-xs font-medium text-[#637268]">
          Transfer options, warnings, and more detail available - expand for
          more.
        </p>
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
  awardStatus: ProviderStatus;
  awardOptions: RankedAwardOptionViewModel[];
  cashOption: ScoredCashOption | undefined;
  hasCashResults: boolean;
  hasProviderAwardResults: boolean;
  onViewRoute: (modal: RouteDetailsDrawerState, trigger: HTMLElement) => void;
  totalAwardOptionCount: number;
}

export function RankedAwardOptions({
  awardStatus,
  awardOptions,
  cashOption,
  hasCashResults,
  hasProviderAwardResults,
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
          below
        </p>
      </div>

      {!hasProviderAwardResults ? (
        <NoProviderResultsState
          hasOtherResults={hasCashResults}
          kind="awards"
          status={awardStatus}
        />
      ) : awardOptions.length > 0 ? (
        <div className="space-y-3">
          {awardOptions.map(({ directBalance, option, transferPaths }) => (
            <AwardOptionRow
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
          ))}
        </div>
      ) : (
        <ResultsEmptyState />
      )}

      {cashOption && hasProviderAwardResults ? (
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
