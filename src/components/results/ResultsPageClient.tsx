"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import {
  getMockAwardOptionsForSearch,
  getMockCashOptionForSearch,
} from "@/data/mockResults";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { CentsPerPointHelp } from "@/components/results/CentsPerPointHelp";
import { expandAirportCode } from "@/lib/airports/groups";
import {
  applyResultsFilters,
  type ResultsFilters,
} from "@/lib/results/filters";
import {
  formatDuration,
  formatRouteSummary,
} from "@/lib/results/routeDetails";
import { selectResultsSearch } from "@/lib/results/searchSelection";
import {
  getTransferPathDisplays,
  type TransferPathDisplay,
} from "@/lib/results/transferPaths";
import {
  scoreAwardOptions,
  type RecommendationLabel,
  type ScoredAwardOption,
  type ScoredCashOption,
} from "@/lib/scoring/recommendations";
import { loadActiveSearch, saveActiveSearch } from "@/lib/search/activeSearch";
import { loadSavedSearches, saveSavedSearches } from "@/lib/search/storage";
import {
  hasSearchValidationErrors,
  type SearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import {
  loadWalletAccounts,
  WALLET_ACCOUNTS_CHANGED_EVENT,
} from "@/lib/wallet/storage";
import type { AwardFlightOption } from "@/types/awards";
import type { Cabin, RouteDetail } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch, TripType } from "@/types/search";

type EditSearchFormState = {
  name: string;
  origin: string;
  destination: string;
  tripType: TripType;
  departDate: string;
  returnDate: string;
  cabin: Cabin;
  passengers: string;
  maxStops: string;
  flexibleDays: string;
};

type RouteModalState = {
  title: string;
  routeDetail?: RouteDetail;
};

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

const defaultFilters: ResultsFilters = {
  bookableWithAnyPoints: false,
  bookableWithTransferablePoints: false,
  maxOneStop: false,
  hideHighFeeAwards: false,
  businessCabinOnly: false,
};

const scoringWeights = [
  { label: "Value", value: "35%" },
  { label: "Points fit", value: "20%" },
  { label: "Convenience", value: "20%" },
  { label: "Availability confidence", value: "15%" },
  { label: "Transfer simplicity", value: "10%" },
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

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

function subscribeToWalletAccounts(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("focus", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("focus", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);
  };
}

function getWalletAccountsClientSnapshot(): string {
  return JSON.stringify(getWalletAccountsSnapshot());
}

function getWalletAccountsServerSnapshot(): string {
  return JSON.stringify(createSeedAccounts());
}

function parseWalletAccountsSnapshot(snapshot: string): PointsAccount[] {
  try {
    const parsedSnapshot: unknown = JSON.parse(snapshot);

    if (Array.isArray(parsedSnapshot)) {
      return parsedSnapshot as PointsAccount[];
    }
  } catch {
    return createSeedAccounts();
  }

  return createSeedAccounts();
}

function normalizeSingleCode(value: string): string[] {
  const normalizedValue = value.trim().toUpperCase();

  if (!normalizedValue) {
    return [];
  }

  return expandAirportCode(normalizedValue, AIRPORT_GROUPS);
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function parseRequiredNumber(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return Number(value);
}

function collapseAirportGroup(codes: string[]): string | undefined {
  const normalizedCodes = codes.map((code) => code.trim().toUpperCase());

  return AIRPORT_GROUPS.find((group) => {
    if (group.airportCodes.length !== normalizedCodes.length) {
      return false;
    }

    return group.airportCodes.every((code) => normalizedCodes.includes(code));
  })?.code;
}

function formatCodes(codes: string[]): string {
  if (codes.length === 0) {
    return "Not set";
  }

  return collapseAirportGroup(codes) ?? codes.join("/");
}

function formatEditableCodes(codes: string[]): string {
  return collapseAirportGroup(codes) ?? codes[0] ?? "";
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

function getRouteSummary(option: { origin: string; destination: string; routeDetail?: RouteDetail }): string {
  if (option.routeDetail) {
    return formatRouteSummary(option.routeDetail);
  }

  return `${option.origin} -> ${option.destination}`;
}

function formatTransferRatio(ratio: number): string {
  return ratio === 1 ? "1:1" : `1:${ratio}`;
}

function formatRecommendationAction(option: AwardFlightOption): string {
  if (option.transferSources.length === 0) {
    return `Check ${option.airlineProgram} miles before paying cash`;
  }

  return `Transfer points to ${option.airlineProgram}`;
}

function getDirectProgramBalance(
  accounts: PointsAccount[],
  airlineProgram: string,
): number {
  return accounts
    .filter(
      (account) =>
        account.programType === "airline" &&
        account.programName.trim().toLowerCase() ===
          airlineProgram.trim().toLowerCase(),
    )
    .reduce((total, account) => total + account.balance, 0);
}

function createEditFormState(search: SavedSearch): EditSearchFormState {
  return {
    name: search.name,
    origin: formatEditableCodes(search.originCodes),
    destination: formatEditableCodes(search.destinationCodes),
    tripType: search.tripType,
    departDate: search.departDate,
    returnDate: search.returnDate ?? "",
    cabin: search.cabin,
    passengers: String(search.passengers),
    maxStops: search.maxStops === undefined ? "" : String(search.maxStops),
    flexibleDays:
      search.flexibleDays === undefined ? "" : String(search.flexibleDays),
  };
}

function getSavedSearchKey(search: SavedSearch): string {
  return [
    search.name.trim().toLowerCase(),
    search.originCodes.join(","),
    search.destinationCodes.join(","),
    search.departDate,
    search.returnDate ?? "",
    search.tripType,
    search.cabin,
    search.passengers,
  ].join("|");
}

function isDuplicateSearch(leftSearch: SavedSearch, rightSearch: SavedSearch): boolean {
  return (
    leftSearch.id === rightSearch.id ||
    getSavedSearchKey(leftSearch) === getSavedSearchKey(rightSearch)
  );
}

function clearErrorsForField(
  errors: SearchValidationErrors,
  field: keyof EditSearchFormState,
): SearchValidationErrors {
  const nextErrors = { ...errors };

  if (field === "origin") {
    delete nextErrors.originCodes;
  } else if (field === "destination") {
    delete nextErrors.destinationCodes;
  } else if (field === "name") {
    delete nextErrors.name;
  } else if (field === "departDate") {
    delete nextErrors.departDate;
  } else if (field === "returnDate" || field === "tripType") {
    delete nextErrors.returnDate;
  } else if (field === "passengers") {
    delete nextErrors.passengers;
  } else if (field === "cabin") {
    delete nextErrors.cabin;
  } else if (field === "maxStops") {
    delete nextErrors.maxStops;
  } else if (field === "flexibleDays") {
    delete nextErrors.flexibleDays;
  }

  return nextErrors;
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

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

function SummaryStrip({
  onEdit,
  onSave,
  saveStatus,
  search,
}: {
  onEdit: () => void;
  onSave: () => void;
  saveStatus: string;
  search: SavedSearch;
}) {
  const summaryItems = [
    { label: "Search", value: search.name },
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
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="grid gap-3 md:grid-cols-5">
        {summaryItems.map((item) => (
          <article
            className="rounded-lg border border-[#d9e2d6] bg-white p-4"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              {item.label}
            </p>
            <p className="mt-2 text-base font-semibold tracking-tight text-[#14211b] md:text-lg">
              {item.value}
            </p>
          </article>
        ))}
      </div>
      <article className="rounded-lg border border-[#d9e2d6] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
          Actions
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            className="rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onEdit}
            type="button"
          >
            Edit search
          </button>
          <button
            className="rounded-md bg-[#2f6b4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#25573f]"
            onClick={onSave}
            type="button"
          >
            Save search
          </button>
        </div>
        {saveStatus ? (
          <p className="mt-3 rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold text-[#2f6b4f]">
            {saveStatus}
          </p>
        ) : null}
      </article>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: JSX.Element | string;
  value: string;
}) {
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

function RecommendationPanel({
  bestAwardOption,
  cashBenchmark,
}: {
  bestAwardOption: ScoredAwardOption | undefined;
  cashBenchmark: number;
}) {
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

function CashBenchmarkPanel({
  cashOption,
  passengers,
}: {
  cashOption: ScoredCashOption | undefined;
  passengers: number;
}) {
  if (!cashOption) {
    return null;
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

function TransferPathRows({
  isTransferRequired,
  paths,
}: {
  isTransferRequired: boolean;
  paths: TransferPathDisplay[];
}) {
  const visiblePaths = paths.slice(0, 2);

  if (!isTransferRequired || visiblePaths.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
      <span className="rounded-md bg-[#fff9df] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d4c1d]">
        Transfer required
      </span>
      <div className="mt-3 space-y-2">
        {visiblePaths.map((path) => (
          <div className="text-sm leading-6 text-[#405147]" key={path.fromProgram}>
            <p className="font-semibold text-[#24382d]">
              {path.fromProgram}
              {" -> "}
              {path.toProgram} -{" "}
              {formatTransferRatio(path.transferRatio)}
            </p>
            <p>
              Available: {formatNumber(path.availableBalance)} - Needed:{" "}
              {formatNumber(path.pointsNeeded)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium leading-5 text-[#5d4c1d]">
        Verify award space with the airline before moving points.
      </p>
    </div>
  );
}

function AwardOptionCard({
  directBalance,
  onViewRoute,
  option,
  transferPaths,
}: {
  directBalance: number;
  onViewRoute: () => void;
  option: ScoredAwardOption;
  transferPaths: TransferPathDisplay[];
}) {
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
            {formatDuration(option.routeDetail?.totalDurationMinutes ?? option.durationMinutes ?? 0)}
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

      <TransferPathRows
        isTransferRequired={isTransferRequired}
        paths={transferPaths}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="w-fit rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
          onClick={onViewRoute}
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

function CashOptionCard({
  onViewRoute,
  option,
}: {
  onViewRoute: () => void;
  option: ScoredCashOption;
}) {
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
            {formatDuration(option.routeDetail?.totalDurationMinutes ?? option.durationMinutes)}
          </p>
        </div>
      </div>

      <button
        className="mt-4 w-fit rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-white"
        onClick={onViewRoute}
        type="button"
      >
        View route details
      </button>
    </article>
  );
}

function SidePanel({
  filters,
  onChangeFilter,
}: {
  filters: ResultsFilters;
  onChangeFilter: (filter: keyof ResultsFilters, value: boolean) => void;
}) {
  const filterOptions: Array<{
    key: keyof ResultsFilters;
    label: string;
  }> = [
    {
      key: "bookableWithAnyPoints",
      label: "Show only options bookable with my points",
    },
    {
      key: "bookableWithTransferablePoints",
      label: "Show only options bookable with my transferable points",
    },
    { key: "maxOneStop", label: "Max one stop" },
    { key: "hideHighFeeAwards", label: "Hide high-fee awards" },
    { key: "businessCabinOnly", label: "Business cabin only" },
  ];

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Filters
        </p>
        <div className="mt-4 space-y-3">
          {filterOptions.map((filterOption) => (
            <label
              className="flex items-start gap-3 text-sm font-medium leading-6 text-[#405147]"
              key={filterOption.key}
            >
              <input
                checked={filters[filterOption.key]}
                className="mt-1 h-4 w-4 accent-[#2f6b4f]"
                onChange={(event) =>
                  onChangeFilter(filterOption.key, event.target.checked)
                }
                type="checkbox"
              />
              {filterOption.label}
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
            Run another search
          </Link>
        </div>
      </section>
    </aside>
  );
}

function RouteDetailsModal({
  modal,
  onClose,
}: {
  modal: RouteModalState | undefined;
  onClose: () => void;
}) {
  if (!modal) {
    return null;
  }

  const routeDetail = modal.routeDetail;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211b]/45 p-4 sm:items-center">
      <section
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(20,33,27,0.28)] md:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Route details
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              {modal.title}
            </h3>
          </div>
          <button
            className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {routeDetail ? (
          <div className="mt-5 space-y-3">
            {routeDetail.segments.map((segment, index) => (
              <div key={segment.id}>
                <article className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                    Segment {index + 1}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-[#14211b]">
                    {segment.origin}
                    {" -> "}
                    {segment.destination}
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-[#526158]">
                    {segment.flightNumber ?? "Mock flight"} -{" "}
                    {segment.departureTime} to {segment.arrivalTime} -{" "}
                    {formatDuration(segment.durationMinutes)}
                  </p>
                </article>
                {routeDetail.layovers[index] ? (
                  <div className="mx-4 border-x border-[#d9e2d6] px-4 py-3 text-sm font-semibold text-[#405147]">
                    Layover at {routeDetail.layovers[index].airport} for{" "}
                    {formatDuration(routeDetail.layovers[index].durationMinutes)}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="rounded-md border border-[#ead99d] bg-[#fff9df] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5d4c1d]">
                Total duration
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatDuration(routeDetail.totalDurationMinutes)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 text-sm leading-6 text-[#526158]">
            Route details are not available for this mock option.
          </p>
        )}
      </section>
    </div>
  );
}

function EditSearchModal({
  errors,
  formState,
  onChangeField,
  onClose,
  onSubmit,
}: {
  errors: SearchValidationErrors;
  formState: EditSearchFormState;
  onChangeField: <Field extends keyof EditSearchFormState>(
    field: Field,
    value: EditSearchFormState[Field],
  ) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211b]/45 p-4 sm:items-center">
      <form
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(20,33,27,0.28)] md:p-6"
        onSubmit={onSubmit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Edit search
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Update active search
            </h3>
          </div>
          <button
            className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-[#24382d]">
            Trip name
          </span>
          <input
            className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
            onChange={(event) => onChangeField("name", event.target.value)}
            type="text"
            value={formState.name}
          />
          <FieldError>{errors.name}</FieldError>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Origin
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              list="edit-airport-group-options"
              onChange={(event) => onChangeField("origin", event.target.value)}
              type="text"
              value={formState.origin}
            />
            <FieldError>{errors.originCodes}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Destination
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              list="edit-airport-group-options"
              onChange={(event) =>
                onChangeField("destination", event.target.value)
              }
              type="text"
              value={formState.destination}
            />
            <FieldError>{errors.destinationCodes}</FieldError>
          </label>
          <datalist id="edit-airport-group-options">
            {AIRPORT_GROUPS.map((group) => (
              <option key={group.code} value={group.code}>
                {group.name}
              </option>
            ))}
          </datalist>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Trip type
            </span>
            <select
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onChangeField("tripType", event.target.value as TripType)
              }
              value={formState.tripType}
            >
              <option value="round_trip">Round trip</option>
              <option value="one_way">One way</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Depart
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event) => onChangeField("departDate", event.target.value)}
              type="date"
              value={formState.departDate}
            />
            <FieldError>{errors.departDate}</FieldError>
          </label>
          {formState.tripType === "round_trip" ? (
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Return
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                onChange={(event) =>
                  onChangeField("returnDate", event.target.value)
                }
                type="date"
                value={formState.returnDate}
              />
              <FieldError>{errors.returnDate}</FieldError>
            </label>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">Cabin</span>
            <select
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event) =>
                onChangeField("cabin", event.target.value as Cabin)
              }
              value={formState.cabin}
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
            <FieldError>{errors.cabin}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Passengers
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="1"
              onChange={(event) => onChangeField("passengers", event.target.value)}
              type="number"
              value={formState.passengers}
            />
            <FieldError>{errors.passengers}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Max stops
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="0"
              onChange={(event) => onChangeField("maxStops", event.target.value)}
              type="number"
              value={formState.maxStops}
            />
            <FieldError>{errors.maxStops}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Flexible days
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="0"
              onChange={(event) =>
                onChangeField("flexibleDays", event.target.value)
              }
              type="number"
              value={formState.flexibleDays}
            />
            <FieldError>{errors.flexibleDays}</FieldError>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
            type="submit"
          >
            Save edit
          </button>
          <button
            className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function ResultsPageClient(): JSX.Element {
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const walletAccountsSnapshot = useSyncExternalStore(
    subscribeToWalletAccounts,
    getWalletAccountsClientSnapshot,
    getWalletAccountsServerSnapshot,
  );
  const accounts = useMemo(
    () => parseWalletAccountsSnapshot(walletAccountsSnapshot),
    [walletAccountsSnapshot],
  );
  const [savedSearchVersion, setSavedSearchVersion] = useState(0);
  const savedSearches = useMemo(() => {
    void savedSearchVersion;

    return isLoaded ? loadSavedSearches() : [];
  }, [isLoaded, savedSearchVersion]);
  const activeSearch = useMemo(
    () => (isLoaded ? loadActiveSearch() : undefined),
    [isLoaded],
  );
  const baseSelectedSearch = useMemo(
    () =>
      selectResultsSearch(activeSearch, savedSearches, fallbackSavedSearch),
    [activeSearch, savedSearches],
  );
  const [selectedSearchOverride, setSelectedSearchOverride] =
    useState<SavedSearch>();
  const selectedSearch = selectedSearchOverride ?? baseSelectedSearch;
  const [filters, setFilters] = useState<ResultsFilters>(defaultFilters);
  const [saveStatus, setSaveStatus] = useState("");
  const [editFormState, setEditFormState] = useState<EditSearchFormState>(
    createEditFormState(fallbackSavedSearch),
  );
  const [editErrors, setEditErrors] = useState<SearchValidationErrors>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [routeModal, setRouteModal] = useState<RouteModalState>();

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
  const transferPathsByOptionId = useMemo(() => {
    const entries = recommendationResults.rankedAwardOptions.map((option) => [
      option.id,
      getTransferPathDisplays(
        option.airlineProgram,
        option.pointsRequired,
        accounts,
        TRANSFER_PARTNERS,
      ),
    ] as const);

    return new Map(entries);
  }, [accounts, recommendationResults.rankedAwardOptions]);
  const decoratedAwardOptions = useMemo(
    () =>
      recommendationResults.rankedAwardOptions.map((option) => {
        const transferPaths = transferPathsByOptionId.get(option.id) ?? [];

        return {
          ...option,
          sufficientTransferPathCount: transferPaths.filter(
            (path) => path.isSufficient,
          ).length,
        };
      }),
    [recommendationResults.rankedAwardOptions, transferPathsByOptionId],
  );
  const filteredAwardOptions = useMemo(
    () => applyResultsFilters(decoratedAwardOptions, filters),
    [decoratedAwardOptions, filters],
  );
  const bestAwardOption =
    filteredAwardOptions.find(
      (option) => option.recommendationLabel === "best_overall",
    ) ?? filteredAwardOptions[0];

  function handleSaveSearch(): void {
    const nextSearch: SavedSearch = {
      ...selectedSearch,
      updatedAt: new Date().toISOString(),
    };
    const currentSavedSearches = isLoaded ? loadSavedSearches() : savedSearches;
    const nextSavedSearches = [
      nextSearch,
      ...currentSavedSearches.filter(
        (savedSearch) => !isDuplicateSearch(savedSearch, nextSearch),
      ),
    ];

    saveSavedSearches(nextSavedSearches);
    setSavedSearchVersion((currentVersion) => currentVersion + 1);
    setSaveStatus(`Saved "${nextSearch.name}" locally.`);
  }

  function handleOpenEdit(): void {
    setEditFormState(createEditFormState(selectedSearch));
    setEditErrors({});
    setSaveStatus("");
    setIsEditOpen(true);
  }

  function updateEditField<Field extends keyof EditSearchFormState>(
    field: Field,
    value: EditSearchFormState[Field],
  ): void {
    setEditFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setEditErrors((currentErrors) => clearErrorsForField(currentErrors, field));
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const originCodes = normalizeSingleCode(editFormState.origin);
    const destinationCodes = normalizeSingleCode(editFormState.destination);
    const passengers = parseRequiredNumber(editFormState.passengers);
    const maxStops = parseOptionalNumber(editFormState.maxStops);
    const flexibleDays = parseOptionalNumber(editFormState.flexibleDays);
    const validationInput = {
      name: editFormState.name,
      userId: LOCAL_USER_ID,
      originCodes,
      destinationCodes,
      departDate: editFormState.departDate,
      returnDate:
        editFormState.tripType === "round_trip"
          ? editFormState.returnDate || undefined
          : undefined,
      tripType: editFormState.tripType,
      flexibleDays,
      passengers,
      cabin: editFormState.cabin,
      maxStops,
      createdAt: selectedSearch.createdAt,
    };
    const nextErrors = validateSavedSearchInput(validationInput);

    if (hasSearchValidationErrors(nextErrors)) {
      setEditErrors(nextErrors);
      return;
    }

    const updatedSearch: SavedSearch = {
      ...selectedSearch,
      name: editFormState.name.trim(),
      originCodes,
      destinationCodes,
      departDate: editFormState.departDate,
      returnDate:
        editFormState.tripType === "round_trip"
          ? editFormState.returnDate
          : undefined,
      tripType: editFormState.tripType,
      flexibleDays,
      passengers,
      cabin: editFormState.cabin,
      maxStops,
      updatedAt: new Date().toISOString(),
    };

    saveActiveSearch(updatedSearch);
    setSelectedSearchOverride(updatedSearch);
    setEditFormState(createEditFormState(updatedSearch));
    setEditErrors({});
    setIsEditOpen(false);
    setSaveStatus("Active search updated.");
  }

  function handleChangeFilter(
    filter: keyof ResultsFilters,
    value: boolean,
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filter]: value,
    }));
  }

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
                {formatCurrency(cashOption.cashPriceUsd)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SummaryStrip
        onEdit={handleOpenEdit}
        onSave={handleSaveSearch}
        saveStatus={saveStatus}
        search={selectedSearch}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RecommendationPanel
            bestAwardOption={bestAwardOption}
            cashBenchmark={cashOption.cashPriceUsd}
          />

          <CashBenchmarkPanel
            cashOption={recommendationResults.cashOption}
            passengers={selectedSearch.passengers}
          />

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
                {filteredAwardOptions.length} of {decoratedAwardOptions.length}{" "}
                award options shown
              </p>
            </div>

            {filteredAwardOptions.length > 0 ? (
              filteredAwardOptions.map((option) => (
                <AwardOptionCard
                  directBalance={getDirectProgramBalance(
                    accounts,
                    option.airlineProgram,
                  )}
                  key={option.id}
                  onViewRoute={() =>
                    setRouteModal({
                      title: option.airlineProgram,
                      routeDetail: option.routeDetail,
                    })
                  }
                  option={option}
                  transferPaths={transferPathsByOptionId.get(option.id) ?? []}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#b8c8b2] bg-white p-6 text-sm leading-6 text-[#526158]">
                No award options match the current filters. Clear one or more
                filters to compare the mock options again.
              </div>
            )}

            {recommendationResults.cashOption ? (
              <CashOptionCard
                onViewRoute={() =>
                  setRouteModal({
                    title: "Cash Fare Benchmark",
                    routeDetail: recommendationResults.cashOption?.routeDetail,
                  })
                }
                option={recommendationResults.cashOption}
              />
            ) : null}
          </section>
        </div>

        <SidePanel filters={filters} onChangeFilter={handleChangeFilter} />
      </section>

      {isEditOpen ? (
        <EditSearchModal
          errors={editErrors}
          formState={editFormState}
          onChangeField={updateEditField}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
        />
      ) : null}

      <RouteDetailsModal
        modal={routeModal}
        onClose={() => setRouteModal(undefined)}
      />
    </div>
  );
}
