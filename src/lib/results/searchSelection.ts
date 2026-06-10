import type { ActiveSearch, SavedSearch } from "@/types/search";
import { getSavedSearchSupportStatus } from "@/lib/search/validation";

export function selectResultsSearch(
  activeSearch: ActiveSearch | undefined,
  savedSearches: SavedSearch[],
  fallbackSearch: SavedSearch,
): SavedSearch {
  if (activeSearch && getSavedSearchSupportStatus(activeSearch).isSupported) {
    return activeSearch;
  }

  return (
    savedSearches.find(
      (savedSearch) => getSavedSearchSupportStatus(savedSearch).isSupported,
    ) ?? fallbackSearch
  );
}
