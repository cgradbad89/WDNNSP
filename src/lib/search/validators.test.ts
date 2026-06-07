import { describe, expect, it } from "vitest";
import { isSavedSearch, isSavedSearchArray } from "@/lib/search/validators";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Tokyo Spring Trip",
  originCodes: ["DCA", "IAD", "BWI"],
  destinationCodes: ["HND", "NRT"],
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

describe("search validators", () => {
  it("accepts a valid saved search", () => {
    expect(isSavedSearch(search)).toBe(true);
  });

  it("accepts optional return date, flexible days, and max stops", () => {
    const oneWaySearch: SavedSearch = {
      ...search,
      returnDate: undefined,
      tripType: "one_way",
      flexibleDays: undefined,
      maxStops: undefined,
    };

    expect(isSavedSearch(oneWaySearch)).toBe(true);
  });

  it("rejects empty origin or destination code arrays", () => {
    expect(isSavedSearch({ ...search, originCodes: [] })).toBe(false);
    expect(isSavedSearch({ ...search, destinationCodes: [] })).toBe(false);
  });

  it("rejects invalid trip types and cabins", () => {
    expect(isSavedSearch({ ...search, tripType: "multi_city" })).toBe(false);
    expect(isSavedSearch({ ...search, cabin: "suite" })).toBe(false);
  });

  it("rejects invalid numeric constraints", () => {
    expect(isSavedSearch({ ...search, passengers: 0 })).toBe(false);
    expect(isSavedSearch({ ...search, flexibleDays: -1 })).toBe(false);
    expect(isSavedSearch({ ...search, maxStops: Number.POSITIVE_INFINITY })).toBe(
      false,
    );
  });

  it("validates arrays only when every saved search is valid", () => {
    expect(isSavedSearchArray([search])).toBe(true);
    expect(isSavedSearchArray([search, { ...search, name: 123 }])).toBe(false);
  });
});
