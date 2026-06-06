"use client";

import type { JSX } from "react";
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import {
  getMockAwardOptionsForSearch,
  getMockCashOptionForSearch,
} from "@/data/mockResults";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import { scoreAwardOptions } from "@/lib/scoring/recommendations";
import { loadSavedSearches } from "@/lib/search/storage";
import { loadWalletAccounts } from "@/lib/wallet/storage";
import type {
  RecommendationLabel,
  ScoredAwardOption,
  ScoredCashOption,
} from "@/lib/scoring/recommendations";
import type { AwardFlightOption } from "@/types/awards";
import type { Cabin } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch } from "@/types/search";

const LOCAL_USER_ID = "local-user";
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

const scoringWeights = [
  { label: "Value", value: "35%" },
  { label: "Points fit", value: "20%" },
  { label: "Convenience", value: "20%" },
  { label: "Availability confidence", value: "15%" },
  { label: "Transfer simplicity", value: "10%" },
];

const filterOptions = [
  "Show business cabin",
  "Prefer one stop or less",
  "Hide low-confidence awards",
  "Show cash benchmark",
];

const fallbackSavedSearch: SavedSearch = {
  id: "mock-tokyo-spring-trip",
  userId: LOCAL_USER_ID,
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

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function createSeedAccounts(): PointsAccount[] {
  return MOCK_POINTS_ACCOUNTS.map((account) => ({
    ...account,
    userId: LOCAL_USER_ID,
  }));
}

function getWalletAccountsSnapshot(): PointsAccount[] {
  const walletAccounts = loadWalletAccounts();

  return walletAccounts.length > 0 ? walletAccounts : createSeedAccounts();
}

function formatCodes(codes: string[]): string {
  return codes.length > 0 ? codes.join("/") : "Not set";
}

function formatDateShort(date: string | undefined): string {
  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateRange(search: SavedSearch): string {
  if (search.tripType === "one_way") {
    return formatDateShort(search.departDate);
  }

  const departDate = new Date(`${search.departDate}T00:00:00`);
  const returnDate = search.returnDate
    ? new Date(`${search.returnDate}T00:00:00`)
    : undefined;

  if (
    returnDate &&
    departDate.getMonth() === returnDate.getMonth() &&
    departDate.getFullYear() === returnDate.getFullYear()
  ) {
    return `${formatDateShort(search.departDate)}-${returnDate.getDate()}`;
  }

  return `${formatDateShort(search.departDate)} - ${formatDateShort(
    search.returnDate,
  )}`;
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

function formatDuration(durationMinutes: number | undefined): string {
  if (!durationMinutes) {
    return "Not shown";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
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

function formatTransferSources(sources: string[]): string {
  if (sources.length === 0) {
    return "No transfer source listed";
  }

  if (sources.length === 1) {
    return sources[0];
  }

  if (sources.length === 2) {
    return `${sources[0]} or ${sources[1]}`;
  }

  return `${sources.slice(0, -1).join(", ")}, or ${sources.at(-1)}`;
}

function formatRecommendationAction(option: AwardFlightOption): string {
  if (option.transferSources.length === 0) {
    return `Check ${option.airlineProgram} miles before paying cash`;
  }

  return `Transfer ${formatTransferSources(option.transferSources)} points to ${
    option.airlineProgram
  }`;
}

function PlaneIcon({ className }: { className?: string }) {
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

function CheckIcon({ className }: { className?: string }) {
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SummaryStrip({ search }: { search: SavedSearch }) {
  const summaryItems = [
    { label: "Saved search", value: search.name },
    {
      label: "Route",
      value: `${formatCodes(search.originCodes)} -> ${formatCodes(
        search.destinationCodes,
      )}`,
    },
    { label: "Dates", value: formatDateRange(search) },
    { label: "Cabin", value: cabinLabels[search.cabin] },
    { label: "Passengers", value: formatNumber(search.passengers) },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-5">
      {summaryItems.map((item) => (
        <article
          className="rounded-lg border border-[#d9e2d6] bg-white p-4"
          key={item.label}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}

function RecommendationPanel({
  bestAwardOption,
  cashBenchmark,
}: {
  bestAwardOption: ScoredAwardOption;
  cashBenchmark: number;
}) {
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
        </div>
        <PlaneIcon className="h-10 w-10 shrink-0 text-[#a8d5bd]" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
            Score
          </p>
          <p className="mt-2 text-xl font-semibold">
            {bestAwardOption.score.totalScore}
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
            Miles needed
          </p>
          <p className="mt-2 text-xl font-semibold">
            {formatNumber(bestAwardOption.pointsRequired)}
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
            Taxes and fees
          </p>
          <p className="mt-2 text-xl font-semibold">
            {formatCurrency(bestAwardOption.taxesAndFeesUsd)}
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
            Cash benchmark
          </p>
          <p className="mt-2 text-xl font-semibold">
            {formatCurrency(cashBenchmark)}
          </p>
        </div>
        <div className="rounded-md border border-white/12 bg-white/8 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
            <CentsPerPointHelp />
          </p>
          <p className="mt-2 text-xl font-semibold">
            {bestAwardOption.centsPerPoint?.toFixed(1) ?? "0.0"}
          </p>
        </div>
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

function AwardOptionCard({ option }: { option: ScoredAwardOption }) {
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
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#14211b]">
            {option.airlineProgram}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#637268]">
            {option.origin}
            {" -> "}
            {option.destination} - {cabinLabels[option.cabin]} -{" "}
            {formatStops(option.stops)} -{" "}
            {formatDuration(option.durationMinutes)}
          </p>
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
            Transfer sources
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {formatTransferSources(option.transferSources)}
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
            Route
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            {option.origin}
            {" -> "}
            {option.destination}
          </p>
        </div>
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

function CashOptionCard({ option }: { option: ScoredCashOption }) {
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
            {option.airline} - {option.origin}
            {" -> "}
            {option.destination} -{" "}
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
            Transfer sources
          </p>
          <p className="mt-2 text-lg font-semibold text-[#14211b]">
            No transfer needed
          </p>
        </div>
      </div>
    </article>
  );
}

function SidePanel() {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Filters
        </p>
        <div className="mt-4 space-y-3">
          {filterOptions.map((filterOption) => (
            <label
              className="flex items-center gap-3 text-sm font-medium text-[#405147]"
              key={filterOption}
            >
              <input
                checked
                className="h-4 w-4 accent-[#2f6b4f]"
                readOnly
                type="checkbox"
              />
              {filterOption}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Scoring weights
        </p>
        <div className="mt-4 space-y-3">
          {scoringWeights.map((weight) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-[#edf3ea] pb-3 last:border-b-0 last:pb-0"
              key={weight.label}
            >
              <span className="text-sm text-[#526158]">{weight.label}</span>
              <span className="text-sm font-semibold text-[#14211b]">
                {weight.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Next actions
        </p>
        <div className="mt-4 space-y-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
            type="button"
          >
            Check airline directly
            <ArrowIcon className="h-4 w-4" />
          </button>
          <Link
            className="block rounded-md border border-[#b8c8b2] px-4 py-3 text-center text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            href="/search"
          >
            Edit saved search
          </Link>
          <button
            className="w-full rounded-md border border-[#b8c8b2] px-4 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            type="button"
          >
            Save result note
          </button>
        </div>
      </section>
    </aside>
  );
}

export function ResultsPageClient(): JSX.Element {
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const savedSearches = useMemo(
    () => (isLoaded ? loadSavedSearches() : []),
    [isLoaded],
  );
  const selectedSearch = savedSearches[0] ?? fallbackSavedSearch;
  const accounts = useMemo(
    () => (isLoaded ? getWalletAccountsSnapshot() : createSeedAccounts()),
    [isLoaded],
  );
  const cashOption = useMemo(
    () => getMockCashOptionForSearch(selectedSearch),
    [selectedSearch],
  );
  const awardOptions = useMemo(
    () => getMockAwardOptionsForSearch(selectedSearch),
    [selectedSearch],
  );
  const recommendationResults = useMemo(
    () =>
      scoreAwardOptions(
        awardOptions,
        cashOption,
        accounts,
        TRANSFER_PARTNERS,
      ),
    [accounts, awardOptions, cashOption],
  );
  const bestAwardOption =
    recommendationResults.bestAwardOption ??
    recommendationResults.rankedAwardOptions[0];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Results
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Best option for {selectedSearch.name}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Mock cash and award data are compared for the selected saved
              search, then ranked with the weighted recommendation engine.
            </p>
          </div>
          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[420px] sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Recommendation score
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {bestAwardOption.score.totalScore}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                <CentsPerPointHelp />
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {bestAwardOption.centsPerPoint?.toFixed(1) ?? "0.0"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Cash benchmark
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatCurrency(cashOption.cashPriceUsd)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SummaryStrip search={selectedSearch} />

      {recommendationResults.warnings.map((warning) => (
        <section
          className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-4 text-sm font-semibold leading-6 text-[#5d4c1d]"
          key={warning}
        >
          {warning}
        </section>
      ))}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
            <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Lowest reasonable cash fare
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-[#14211b]">
                {formatCurrency(cashOption.cashPriceUsd)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#637268]">
                Deterministic mock fare for {formatNumber(selectedSearch.passengers)}{" "}
                passenger{selectedSearch.passengers === 1 ? "" : "s"}. This
                benchmark is used to calculate redemption value after taxes and
                fees.
              </p>
            </article>

            <RecommendationPanel
              bestAwardOption={bestAwardOption}
              cashBenchmark={cashOption.cashPriceUsd}
            />
          </section>

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
                Mock data only - no live award search
              </p>
            </div>

            {recommendationResults.rankedAwardOptions.map((option) => (
              <AwardOptionCard key={option.id} option={option} />
            ))}

            {recommendationResults.cashOption ? (
              <CashOptionCard option={recommendationResults.cashOption} />
            ) : null}
          </section>
        </div>

        <SidePanel />
      </section>
    </div>
  );
}
