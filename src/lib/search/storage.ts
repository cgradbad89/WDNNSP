import type { SavedSearch } from "@/types/search";

const SAVED_SEARCHES_STORAGE_KEY = "wdnnsp.savedSearches";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createClientId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `search-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadSavedSearches(): SavedSearch[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue as SavedSearch[];
  } catch {
    return [];
  }
}

export function saveSavedSearches(searches: SavedSearch[]): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    SAVED_SEARCHES_STORAGE_KEY,
    JSON.stringify(searches),
  );
}

export function createSavedSearch(
  input: Omit<SavedSearch, "id" | "createdAt" | "updatedAt">,
): SavedSearch {
  const now = new Date().toISOString();

  return {
    ...input,
    id: createClientId(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSavedSearch(
  searches: SavedSearch[],
  searchId: string,
  updates: Partial<
    Pick<
      SavedSearch,
      | "name"
      | "originCodes"
      | "destinationCodes"
      | "departDate"
      | "returnDate"
      | "tripType"
      | "flexibleDays"
      | "passengers"
      | "cabin"
      | "maxStops"
    >
  >,
): SavedSearch[] {
  return searches.map((search) => {
    if (search.id !== searchId) {
      return search;
    }

    return {
      ...search,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function deleteSavedSearch(
  searches: SavedSearch[],
  searchId: string,
): SavedSearch[] {
  return searches.filter((search) => search.id !== searchId);
}
