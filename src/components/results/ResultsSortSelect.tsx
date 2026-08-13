"use client";

import type { ChangeEvent, JSX } from "react";
import { RESULTS_SORT_OPTIONS, type ResultsSortOption } from "@/lib/results/sorting";

interface ResultsSortSelectProps {
  onChange: (value: ResultsSortOption) => void;
  value: ResultsSortOption;
}

export function ResultsSortSelect({
  onChange,
  value,
}: ResultsSortSelectProps): JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold text-[#24382d]">Sort</span>
      <select
        className="rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:ring-4 focus:ring-[#2f6b4f]/10"
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value as ResultsSortOption)
        }
        value={value}
      >
        {RESULTS_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
