import type { SavedSearch } from "@/types/search";
import {
  createPersistedEnvelope,
  unwrapPersistedEnvelope,
} from "@/lib/persistence/schema";
import { isSavedSearchArray } from "@/lib/search/validators";

const SAVED_SEARCHES_STORAGE_KEY = "wdnnsp.savedSearches";
export const SAVED_SEARCHES_CHANGED_EVENT = "wdnnsp.savedSearchesChanged";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createClientId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `search-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseSavedSearches(value: unknown): SavedSearch[] | undefined {
  return (
    unwrapPersistedEnvelope(value, isSavedSearchArray) ??
    (isSavedSearchArray(value) ? value : undefined)
  );
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

    return parseSavedSearches(parsedValue) ?? [];
  } catch {
    return [];
  }
}

export function hasStoredSavedSearches(): boolean {
  if (!hasBrowserStorage()) {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);

    if (storedValue === null) {
      return false;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return parseSavedSearches(parsedValue) !== undefined;
  } catch {
    return false;
  }
}

export function saveSavedSearches(searches: SavedSearch[]): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    SAVED_SEARCHES_STORAGE_KEY,
    JSON.stringify(createPersistedEnvelope(searches)),
  );

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(SAVED_SEARCHES_CHANGED_EVENT));
  }
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
