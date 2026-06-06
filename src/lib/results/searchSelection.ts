import type { SavedSearch } from "@/types/search";

export function selectResultsSearch(
  activeSearch: SavedSearch | undefined,
  savedSearches: SavedSearch[],
  fallbackSearch: SavedSearch,
): SavedSearch {
  return activeSearch ?? savedSearches[0] ?? fallbackSearch;
}
