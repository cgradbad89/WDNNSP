"use client";

import type { JSX } from "react";
import Link from "next/link";
import type { ResultsFilters as ResultsFiltersState } from "@/lib/results/filters";

const scoringWeights = [
  { label: "Value", value: "35%" },
  { label: "Points fit", value: "20%" },
  { label: "Convenience", value: "20%" },
  { label: "Availability confidence", value: "15%" },
  { label: "Transfer simplicity", value: "10%" },
];

interface ResultsFiltersProps {
  filters: ResultsFiltersState;
  onChangeFilter: (filter: keyof ResultsFiltersState, value: boolean) => void;
}

export function ResultsFilters({
  filters,
  onChangeFilter,
}: ResultsFiltersProps): JSX.Element {
  const filterOptions: Array<{
    key: keyof ResultsFiltersState;
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
          <div className="rounded-md bg-[#edf3ea] px-4 py-3 text-sm text-[#24382d]">
            <p className="font-semibold">Verify with the airline directly</p>
            <p className="mt-1 text-[#526158]">
              WDNNSP does not link to booking yet. Confirm award space before
              transferring points.
            </p>
          </div>
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
