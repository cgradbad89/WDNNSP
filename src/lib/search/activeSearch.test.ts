import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearActiveSearch,
  loadActiveSearch,
  saveActiveSearch,
} from "@/lib/search/activeSearch";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "active-search",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["WAS"],
  destinationCodes: ["TYO"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  flexibleDays: 3,
  passengers: 2,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function installWindowWithStorage(): Storage {
  const localStorage = createMemoryStorage();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("active search storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(loadActiveSearch()).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem("wdnnsp.activeSearch", "{bad-json");

    expect(loadActiveSearch()).toBeUndefined();
  });

  it("saves and loads the active search", () => {
    installWindowWithStorage();
    saveActiveSearch(search);

    expect(loadActiveSearch()).toEqual(search);
  });

  it("clears the active search", () => {
    installWindowWithStorage();
    saveActiveSearch(search);
    clearActiveSearch();

    expect(loadActiveSearch()).toBeUndefined();
  });
});
