import type { ActiveSearch, SavedSearch } from "@/types/search";

export function selectResultsSearch(
  activeSearch: ActiveSearch | undefined,
  savedSearches: SavedSearch[],
  fallbackSearch: SavedSearch,
): SavedSearch {
  return activeSearch ?? savedSearches[0] ?? fallbackSearch;
}
