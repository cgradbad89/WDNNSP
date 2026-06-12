import { describe, expect, it } from "vitest";
import {
  buildCloudActiveSearchLoadResult,
  buildCloudSavedSearchesLoadResult,
  fromFirestoreActiveSearch,
  fromFirestoreSavedSearch,
  isCloudSearchMetaInitialized,
  normalizeCloudSavedSearch,
  parseCloudSavedSearchDocuments,
  toFirestoreSavedSearch,
} from "@/lib/firebase/searches";
import type { SavedSearch } from "@/types/search";

const search: SavedSearch = {
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
};

describe("firebase search helpers", () => {
  it("detects initialized search metadata only when initialized is true", () => {
    expect(isCloudSearchMetaInitialized({ initialized: true })).toBe(true);
    expect(isCloudSearchMetaInitialized({ initialized: false })).toBe(false);
    expect(isCloudSearchMetaInitialized(null)).toBe(false);
  });

  it("distinguishes uninitialized saved searches from intentionally empty saved searches", () => {
    expect(
      buildCloudSavedSearchesLoadResult({
        searches: [],
        hasSearchDocuments: false,
        isInitialized: false,
      }),
    ).toEqual({
      searches: [],
      hasStoredValue: false,
      source: "cloud",
    });

    expect(
      buildCloudSavedSearchesLoadResult({
        searches: [],
        hasSearchDocuments: false,
        isInitialized: true,
      }),
    ).toEqual({
      searches: [],
      hasStoredValue: true,
      source: "cloud",
    });
  });

  it("treats existing saved search documents as stored cloud state", () => {
    expect(
      buildCloudSavedSearchesLoadResult({
        searches: [search],
        hasSearchDocuments: true,
        isInitialized: false,
      }),
    ).toEqual({
      searches: [search],
      hasStoredValue: true,
      source: "cloud",
    });
  });

  it("reports active search storage when the active document exists", () => {
    expect(
      buildCloudActiveSearchLoadResult({
        search: null,
        hasActiveDocument: true,
      }),
    ).toEqual({
      search: null,
      hasStoredValue: true,
      source: "cloud",
    });
  });

  it("normalizes local or imported searches to the signed-in user id", () => {
    expect(normalizeCloudSavedSearch("user-1", search)).toEqual({
      ...search,
      userId: "user-1",
    });
  });

  it("serializes saved searches without undefined optional fields", () => {
    const payload = toFirestoreSavedSearch({
      ...search,
      flexibleDays: undefined,
      maxStops: undefined,
      returnDate: undefined,
      tripType: "one_way",
    });

    expect(payload).not.toHaveProperty("flexibleDays");
    expect(payload).not.toHaveProperty("maxStops");
    expect(payload).not.toHaveProperty("returnDate");
    expect(Object.values(payload)).not.toContain(undefined);
  });

  it("preserves required fields and zero-valued optional fields", () => {
    expect(
      toFirestoreSavedSearch({
        ...search,
        flexibleDays: 0,
        maxStops: 0,
      }),
    ).toMatchObject({
      id: search.id,
      userId: search.userId,
      name: search.name,
      originCodes: search.originCodes,
      destinationCodes: search.destinationCodes,
      departDate: search.departDate,
      returnDate: search.returnDate,
      tripType: search.tripType,
      flexibleDays: 0,
      passengers: search.passengers,
      cabin: search.cabin,
      maxStops: 0,
      createdAt: search.createdAt,
      updatedAt: search.updatedAt,
    });
  });

  it("parses saved search documents using the document id and signed-in user id", () => {
    expect(
      fromFirestoreSavedSearch("user-1", "cloud-search", {
        ...search,
        id: "ignored-id",
        userId: "ignored-user",
      }),
    ).toEqual({
      ...search,
      id: "cloud-search",
      userId: "user-1",
    });
  });

  it("parses active searches using the stored search id and signed-in user id", () => {
    expect(
      fromFirestoreActiveSearch("user-1", {
        ...search,
        userId: "ignored-user",
      }),
    ).toEqual({
      ...search,
      userId: "user-1",
    });
  });

  it("filters malformed saved search documents safely", () => {
    expect(
      parseCloudSavedSearchDocuments("user-1", [
        {
          id: "valid-search",
          data: {
            ...search,
            id: "ignored-id",
            userId: "ignored-user",
          },
        },
        {
          id: "invalid-search",
          data: {
            ...search,
            passengers: 0,
          },
        },
      ]),
    ).toEqual([
      {
        ...search,
        id: "valid-search",
        userId: "user-1",
      },
    ]);
  });
});
