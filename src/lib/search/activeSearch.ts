import type { SavedSearch } from "@/types/search";

const ACTIVE_SEARCH_STORAGE_KEY = "wdnnsp.activeSearch";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadActiveSearch(): SavedSearch | undefined {
  if (!hasBrowserStorage()) {
    return undefined;
  }

  try {
    const storedValue = window.localStorage.getItem(ACTIVE_SEARCH_STORAGE_KEY);

    if (!storedValue) {
      return undefined;
    }

    return JSON.parse(storedValue) as SavedSearch;
  } catch {
    return undefined;
  }
}

export function saveActiveSearch(search: SavedSearch): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_SEARCH_STORAGE_KEY,
    JSON.stringify(search),
  );
}

export function clearActiveSearch(): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_SEARCH_STORAGE_KEY);
}
