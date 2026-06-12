import type { ActiveSearch } from "@/types/search";
import {
  createPersistedEnvelope,
  unwrapPersistedEnvelope,
} from "@/lib/persistence/schema";
import { isSavedSearch } from "@/lib/search/validators";

const ACTIVE_SEARCH_STORAGE_KEY = "wdnnsp.activeSearch";
export const ACTIVE_SEARCH_CHANGED_EVENT = "wdnnsp.activeSearchChanged";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function parseActiveSearch(value: unknown): ActiveSearch | undefined {
  return (
    unwrapPersistedEnvelope(value, isSavedSearch) ??
    (isSavedSearch(value) ? value : undefined)
  );
}

export function loadActiveSearch(): ActiveSearch | undefined {
  if (!hasBrowserStorage()) {
    return undefined;
  }

  try {
    const storedValue = window.localStorage.getItem(ACTIVE_SEARCH_STORAGE_KEY);

    if (!storedValue) {
      return undefined;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return parseActiveSearch(parsedValue);
  } catch {
    return undefined;
  }
}

export function hasStoredActiveSearch(): boolean {
  if (!hasBrowserStorage()) {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(ACTIVE_SEARCH_STORAGE_KEY);

    if (storedValue === null) {
      return false;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return parseActiveSearch(parsedValue) !== undefined;
  } catch {
    return false;
  }
}

export function saveActiveSearch(search: ActiveSearch): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_SEARCH_STORAGE_KEY,
    JSON.stringify(createPersistedEnvelope(search)),
  );

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(ACTIVE_SEARCH_CHANGED_EVENT));
  }
}

export function clearActiveSearch(): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_SEARCH_STORAGE_KEY);

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(ACTIVE_SEARCH_CHANGED_EVENT));
  }
}
