"use client";

import type { JSX } from "react";
import type { Cabin } from "@/types/flights";
import type { SavedSearch, TripType } from "@/types/search";
import type { SavedSearchSupportStatus } from "@/lib/search/validation";

interface SavedSearchCardProps {
  onDeleteSearch: (searchId: string) => void | Promise<void>;
  onRunSearch: (search: SavedSearch) => void | Promise<void>;
  search: SavedSearch;
  supportStatus: SavedSearchSupportStatus;
}

const numberFormatter = new Intl.NumberFormat("en-US");

const cabinLabels: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

function ArrowIcon({ className }: { className?: string }): JSX.Element {
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

function formatCodes(codes: string[]): string {
  return codes.length > 0 ? codes.join("/") : "Not set";
}

function formatDate(date: string | undefined): string {
  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatTripType(tripType: TripType): string {
  return tripType === "round_trip" ? "Round trip" : "One way";
}

export function SavedSearchCard({
  onDeleteSearch,
  onRunSearch,
  search,
  supportStatus,
}: SavedSearchCardProps): JSX.Element {
  const supportMessage =
    supportStatus.message ?? "Needs update before running.";

  return (
    <article className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-semibold text-[#24382d]">
              {search.name}
            </p>
            {!supportStatus.isSupported ? (
              <span className="w-fit rounded-md border border-[#ead99d] bg-[#fff9df] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d5520]">
                Needs update
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
            {formatCodes(search.originCodes)} to{" "}
            {formatCodes(search.destinationCodes)}
          </p>
        </div>

        <dl className="grid gap-3 text-sm leading-6 text-[#526158] sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#24382d]">Trip type</dt>
            <dd>{formatTripType(search.tripType)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#24382d]">Cabin</dt>
            <dd>{cabinLabels[search.cabin]}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#24382d]">Depart</dt>
            <dd>{formatDate(search.departDate)}</dd>
          </div>
          {search.tripType === "round_trip" ? (
            <div>
              <dt className="font-semibold text-[#24382d]">Return</dt>
              <dd>{formatDate(search.returnDate)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-[#24382d]">Passengers</dt>
            <dd>{formatNumber(search.passengers)}</dd>
          </div>
        </dl>

        {!supportStatus.isSupported ? (
          <p className="rounded-md border border-[#ead99d] bg-white px-3 py-2 text-sm leading-6 text-[#6d5520]">
            {supportMessage} Recreate this search with a supported airport or
            metro area, or delete it.
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className={
              supportStatus.isSupported
                ? "inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#25573f]"
                : "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md bg-[#9da99f] px-4 py-2.5 text-sm font-semibold text-white"
            }
            disabled={!supportStatus.isSupported}
            onClick={() => {
              void onRunSearch(search);
            }}
            type="button"
          >
            Run search
            <ArrowIcon className="h-4 w-4" />
          </button>
          <button
            className="rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-white"
            onClick={() => {
              void onDeleteSearch(search.id);
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
