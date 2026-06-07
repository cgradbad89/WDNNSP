"use client";

import type { JSX } from "react";

export function ResultsEmptyState(): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-[#b8c8b2] bg-white p-6 text-sm leading-6 text-[#526158]">
      No award options match the current filters. Clear one or more filters to
      compare the mock options again.
    </div>
  );
}
