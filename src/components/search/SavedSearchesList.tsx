"use client";

import type { JSX } from "react";
import { SavedSearchCard } from "@/components/search/SavedSearchCard";
import type { SavedSearch } from "@/types/search";
import type { SavedSearchSupportStatus } from "@/lib/search/validation";

interface SavedSearchListItem {
  search: SavedSearch;
  supportStatus: SavedSearchSupportStatus;
}

type SavedSearchActionResult = void | Promise<void>;

interface SavedSearchesListProps {
  isLoaded: boolean;
  onDeleteSearch: (searchId: string) => SavedSearchActionResult;
  onRunSearch: (search: SavedSearch) => SavedSearchActionResult;
  savedSearches: SavedSearchListItem[];
}

export function SavedSearchesList({
  isLoaded,
  onDeleteSearch,
  onRunSearch,
  savedSearches,
}: SavedSearchesListProps): JSX.Element {
  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Saved searches
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
            Run a previous trip search
          </h3>
        </div>
        <p className="text-sm text-[#637268]">
          {isLoaded ? `${savedSearches.length} saved` : "Loading"}
        </p>
      </div>

      {isLoaded && savedSearches.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedSearches.map(({ search, supportStatus }) => (
            <SavedSearchCard
              key={search.id}
              onDeleteSearch={onDeleteSearch}
              onRunSearch={onRunSearch}
              search={search}
              supportStatus={supportStatus}
            />
          ))}
        </div>
      ) : null}

      {isLoaded && savedSearches.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] bg-[#f7faf6] p-5 text-sm leading-6 text-[#526158]">
          No saved searches yet. Run a new search above, review the results,
          then save useful trips from the Results page.
        </div>
      ) : null}
    </section>
  );
}
