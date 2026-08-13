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
    <section aria-label="Saved searches" className="mt-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
          {isLoaded ? `${savedSearches.length} saved search${savedSearches.length === 1 ? "" : "es"}` : "Loading saved searches"}
        </p>
      </div>

      {isLoaded && savedSearches.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
        <div className="mt-3 rounded-md border border-dashed border-[#b8c8b2] bg-[#f7faf6] p-4 text-sm leading-6 text-[#526158]">
          No saved searches yet. Run a search above, review the results, then
          save useful trips from the Results page.
        </div>
      ) : null}
    </section>
  );
}
