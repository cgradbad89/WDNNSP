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

interface SearchSummaryStripProps {
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onSave: () => void | Promise<void>;
  saveStatus: string;
  search: SavedSearch;
}

export function SearchSummaryStrip({
  onEdit,
  onSave,
  saveStatus,
  search,
}: SearchSummaryStripProps): JSX.Element {
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
            onClick={() => {
              void onSave();
            }}
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
