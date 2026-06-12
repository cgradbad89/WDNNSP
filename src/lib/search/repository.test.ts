import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLocalSearchRepository,
  getSearchRepositorySource,
} from "@/lib/search/repository";
import type { SavedSearch } from "@/types/search";

const searches: SavedSearch[] = [
  {
    id: "search-1",
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
  },
  {
    id: "search-2",
    userId: "local-user",
    name: "London Summer",
    originCodes: ["IAD"],
    destinationCodes: ["LHR"],
    departDate: "2027-07-01",
    tripType: "one_way",
    passengers: 1,
    cabin: "economy",
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
  },
];

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

function installWindowWithStorage(): void {
  vi.stubGlobal("window", {
    localStorage: createMemoryStorage(),
  });
}

describe("search repository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chooses local storage when no user is signed in", () => {
    expect(getSearchRepositorySource(null)).toBe("local");
    expect(getSearchRepositorySource(undefined)).toBe("local");
  });

  it("chooses cloud storage when a user id exists", () => {
    expect(getSearchRepositorySource("user-1")).toBe("cloud");
  });

  it("loads uninitialized local saved and active searches as empty", async () => {
    installWindowWithStorage();

    const repository = createLocalSearchRepository();

    await expect(repository.loadSavedSearches()).resolves.toEqual({
      searches: [],
      hasStoredValue: false,
      source: "local",
    });
    await expect(repository.loadActiveSearch()).resolves.toEqual({
      search: null,
      hasStoredValue: false,
      source: "local",
    });
  });

  it("saves, loads, and deletes local saved searches", async () => {
    installWindowWithStorage();

    const repository = createLocalSearchRepository();

    await repository.saveSavedSearches(searches);
    await expect(repository.loadSavedSearches()).resolves.toEqual({
      searches,
      hasStoredValue: true,
      source: "local",
    });

    await repository.deleteSavedSearch("search-1");
    await expect(repository.loadSavedSearches()).resolves.toEqual({
      searches: [searches[1]],
      hasStoredValue: true,
      source: "local",
    });
  });

  it("saves, loads, and clears the local active search", async () => {
    installWindowWithStorage();

    const repository = createLocalSearchRepository();

    await repository.saveActiveSearch(searches[0]);
    await expect(repository.loadActiveSearch()).resolves.toEqual({
      search: searches[0],
      hasStoredValue: true,
      source: "local",
    });

    await repository.clearActiveSearch();
    await expect(repository.loadActiveSearch()).resolves.toEqual({
      search: null,
      hasStoredValue: false,
      source: "local",
    });
  });
});
