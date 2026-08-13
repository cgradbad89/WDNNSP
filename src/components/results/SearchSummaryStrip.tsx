"use client";

import type { JSX, MouseEvent } from "react";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import type { Cabin } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

const numberFormatter = new Intl.NumberFormat("en-US");

const cabinLabels: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

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

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatTravelers(search: SavedSearch): string {
  return `${formatNumber(search.passengers)} traveler${
    search.passengers === 1 ? "" : "s"
  }`;
}

function EditIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m13.3 3.3 3.4 3.4-9 9-4 .7.7-4 9-9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

interface SearchSummaryStripProps {
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onSave: () => void | Promise<void>;
  saveStatus: string;
  search: SavedSearch;
}

/**
 * Sticky top bar for the results page: the active search collapses into a
 * single editable pill (route, dates, travelers, cabin). Clicking the pill
 * or the "Edit search" label opens the same edit-search drawer as before -
 * onEdit is passed through unchanged from ResultsPageClient.handleOpenEdit.
 */
export function SearchSummaryStrip({
  onEdit,
  onSave,
  saveStatus,
  search,
}: SearchSummaryStripProps): JSX.Element {
  const routeSummary = `${formatCodes(search.originCodes)} -> ${formatCodes(
    search.destinationCodes,
  )}`;

  return (
    <section
      aria-label="Active search"
      className="sticky top-3 z-30 rounded-full border border-[#d9e2d6] bg-white/95 p-2 shadow-[0_10px_30px_rgba(31,63,45,0.12)] backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-4 py-2 text-left transition hover:bg-[#edf3ea]"
          onClick={onEdit}
          type="button"
        >
          <span className="min-w-0 truncate text-sm font-semibold text-[#14211b] sm:text-base">
            {routeSummary}
          </span>
          <span className="hidden h-4 w-px shrink-0 bg-[#d9e2d6] sm:block" />
          <span className="hidden shrink-0 truncate text-sm text-[#526158] sm:block">
            {formatDateRange(search)}
          </span>
          <span className="hidden h-4 w-px shrink-0 bg-[#d9e2d6] sm:block" />
          <span className="hidden shrink-0 truncate text-sm text-[#526158] sm:block">
            {formatTravelers(search)} - {cabinLabels[search.cabin]}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[#edf3ea] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#2f6b4f]">
            <EditIcon className="h-3.5 w-3.5" />
            Edit search
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2 pr-1">
          {saveStatus ? (
            <p className="hidden max-w-[220px] truncate text-xs font-semibold text-[#2f6b4f] md:block">
              {saveStatus}
            </p>
          ) : null}
          <button
            className="rounded-full bg-[#2f6b4f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#25573f]"
            onClick={() => {
              void onSave();
            }}
            type="button"
          >
            Save search
          </button>
        </div>
      </div>

      {saveStatus ? (
        <p className="mt-2 px-4 text-xs font-semibold text-[#2f6b4f] md:hidden">
          {saveStatus}
        </p>
      ) : null}
    </section>
  );
}
