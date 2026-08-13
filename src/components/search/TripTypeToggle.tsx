"use client";

import type { JSX } from "react";
import { TRIP_TYPE_OPTIONS } from "@/lib/search/searchBarFormatting";
import type { TripType } from "@/types/search";

interface TripTypeToggleProps {
  onChange: (value: TripType) => void;
  value: TripType;
}

// Only Round trip / One way are offered. Multi-city is intentionally absent:
// see the comment on TRIP_TYPE_OPTIONS in src/lib/search/searchBarFormatting.ts
// for why there is no backing search logic for it today.
export function TripTypeToggle({
  onChange,
  value,
}: TripTypeToggleProps): JSX.Element {
  return (
    <div
      aria-label="Trip type"
      className="inline-flex w-fit gap-1 rounded-md border border-[#b8c8b2] bg-[#f9fbf8] p-1"
      role="radiogroup"
    >
      {TRIP_TYPE_OPTIONS.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            aria-checked={isSelected}
            className={
              isSelected
                ? "rounded-md bg-[#2f6b4f] px-3 py-2 text-sm font-semibold text-white transition"
                : "rounded-md px-3 py-2 text-sm font-semibold text-[#526158] transition hover:bg-[#edf3ea]"
            }
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
