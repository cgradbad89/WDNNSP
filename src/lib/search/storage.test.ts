import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSavedSearch,
  deleteSavedSearch,
  loadSavedSearches,
  saveSavedSearches,
  updateSavedSearch,
} from "@/lib/search/storage";
import type { SavedSearch } from "@/types/search";

const searches: SavedSearch[] = [
  {
    id: "search-1",
    userId: "local-user",
    name: "Tokyo fall business",
    originCodes: ["DCA", "IAD", "BWI"],
    destinationCodes: ["HND", "NRT"],
    departDate: "2026-10-18",
    returnDate: "2026-10-29",
    tripType: "round_trip",
    flexibleDays: 3,
    passengers: 2,
    cabin: "business",
    maxStops: 1,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "search-2",
    userId: "local-user",
    name: "London school break",
    originCodes: ["DCA"],
    destinationCodes: ["LHR", "LGW"],
    departDate: "2026-03-21",
    returnDate: "2026-03-29",
    tripType: "round_trip",
    passengers: 4,
    cabin: "economy",
    maxStops: 2,
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
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

function installWindowWithStorage(): Storage {
  const localStorage = createMemoryStorage();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("saved search storage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns empty array when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(loadSavedSearches()).toEqual([]);
  });

  it("save no-ops when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveSavedSearches(searches)).not.toThrow();
  });

  it("returns empty array for malformed JSON", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem("wdnnsp.savedSearches", "{bad-json");

    expect(loadSavedSearches()).toEqual([]);
  });

  it("loads saved searches from localStorage", () => {
    installWindowWithStorage();
    saveSavedSearches(searches);

    expect(loadSavedSearches()).toEqual(searches);
  });

  it("stores saved searches in a versioned envelope", () => {
    const localStorage = installWindowWithStorage();
    saveSavedSearches(searches);

    expect(JSON.parse(localStorage.getItem("wdnnsp.savedSearches") ?? "")).toEqual({
      version: 1,
      data: searches,
    });
  });

  it("loads old unwrapped saved-search arrays for backward compatibility", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem("wdnnsp.savedSearches", JSON.stringify(searches));

    expect(loadSavedSearches()).toEqual(searches);
  });

  it("rejects malformed-but-valid JSON saved-search arrays", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem(
      "wdnnsp.savedSearches",
      JSON.stringify([{ id: "missing-search-fields" }]),
    );

    expect(loadSavedSearches()).toEqual([]);
  });

  it("rejects saved-search envelopes with invalid versions", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem(
      "wdnnsp.savedSearches",
      JSON.stringify({ version: 0, data: searches }),
    );

    expect(loadSavedSearches()).toEqual([]);
  });

  it("create saved search adds id, createdAt, and updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    vi.stubGlobal("crypto", {
      randomUUID: () => "generated-search-id",
    });

    expect(
      createSavedSearch({
        userId: "local-user",
        name: "Paris flexible week",
        originCodes: ["JFK", "LGA", "EWR"],
        destinationCodes: ["CDG", "ORY"],
        departDate: "2026-05-10",
        tripType: "one_way",
        passengers: 2,
        cabin: "premium_economy",
      }),
    ).toEqual({
      id: "generated-search-id",
      userId: "local-user",
      name: "Paris flexible week",
      originCodes: ["JFK", "LGA", "EWR"],
      destinationCodes: ["CDG", "ORY"],
      departDate: "2026-05-10",
      tripType: "one_way",
      passengers: 2,
      cabin: "premium_economy",
      createdAt: "2026-06-06T12:00:00.000Z",
      updatedAt: "2026-06-06T12:00:00.000Z",
    });
  });

  it("create saved search falls back when randomUUID is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    vi.stubGlobal("crypto", {});
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(
      createSavedSearch({
        userId: "local-user",
        name: "Fallback id",
        originCodes: ["DCA"],
        destinationCodes: ["LHR"],
        departDate: "2026-05-10",
        tripType: "one_way",
        passengers: 1,
        cabin: "economy",
      }).id,
    ).toBe("search-1780747200000-i");
  });

  it("update saved search updates only the matching search", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));

    const updatedSearches = updateSavedSearch(searches, "search-1", {
      name: "Updated Tokyo search",
      passengers: 3,
    });

    expect(updatedSearches).toEqual([
      {
        ...searches[0],
        name: "Updated Tokyo search",
        passengers: 3,
        updatedAt: "2026-06-06T12:00:00.000Z",
      },
      searches[1],
    ]);
  });

  it("delete saved search removes only the matching search", () => {
    expect(deleteSavedSearch(searches, "search-1")).toEqual([searches[1]]);
  });
});
