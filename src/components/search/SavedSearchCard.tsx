"use client";

import type { JSX } from "react";
import { CABIN_LABELS } from "@/lib/search/searchBarFormatting";
import type { SavedSearch, TripType } from "@/types/search";
import type { SavedSearchSupportStatus } from "@/lib/search/validation";

interface SavedSearchCardProps {
  onDeleteSearch: (searchId: string) => void | Promise<void>;
  onRunSearch: (search: SavedSearch) => void | Promise<void>;
  search: SavedSearch;
  supportStatus: SavedSearchSupportStatus;
}

function CloseIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m4 4 8 8m0-8-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function formatCodes(codes: string[]): string {
  return codes.length > 0 ? codes.join("/") : "Not set";
}

function formatTripType(tripType: TripType): string {
  return tripType === "round_trip" ? "Round trip" : "One way";
}

// Quick-access chip for a saved search. Clicking the chip body reuses the
// exact same "run this saved search" flow the previous full-detail card
// used (save as active search, then navigate to /results) - this session
// only changes how saved searches are presented, not what happens when one
// is run. See TripSearchForm's handleRunSavedSearch.
export function SavedSearchCard({
  onDeleteSearch,
  onRunSearch,
  search,
  supportStatus,
}: SavedSearchCardProps): JSX.Element {
  const supportMessage =
    supportStatus.message ?? "Needs update before running.";
  const routeSummary = `${formatCodes(search.originCodes)} to ${formatCodes(
    search.destinationCodes,
  )}`;
  const detailSummary = `${formatTripType(search.tripType)} - ${
    CABIN_LABELS[search.cabin]
  }`;

  return (
    <div
      className={
        supportStatus.isSupported
          ? "group relative flex items-stretch overflow-hidden rounded-full border border-[#d9e2d6] bg-[#f7faf6] pr-8 transition hover:border-[#2f6b4f] hover:bg-[#edf3ea]"
          : "group relative flex items-stretch overflow-hidden rounded-full border border-dashed border-[#ead99d] bg-[#fff9df] pr-8"
      }
      title={supportStatus.isSupported ? undefined : supportMessage}
    >
      <button
        aria-disabled={!supportStatus.isSupported}
        className="flex min-w-0 flex-col items-start gap-0.5 px-4 py-2 text-left"
        onClick={() => {
          if (!supportStatus.isSupported) {
            return;
          }

          void onRunSearch(search);
        }}
        type="button"
      >
        <span className="max-w-[220px] truncate text-sm font-semibold text-[#14211b]">
          {search.name}
        </span>
        <span className="max-w-[220px] truncate text-xs leading-5 text-[#637268]">
          {routeSummary} - {detailSummary}
        </span>
        {!supportStatus.isSupported ? (
          <span className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#6d5520]">
            Needs update
          </span>
        ) : null}
      </button>
      <button
        aria-label={`Delete saved search "${search.name}"`}
        className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#637268] transition hover:bg-white hover:text-[#8f2d2d]"
        onClick={() => {
          void onDeleteSearch(search.id);
        }}
        type="button"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
