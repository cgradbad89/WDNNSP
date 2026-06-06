import { describe, expect, it } from "vitest";
import { selectResultsSearch } from "@/lib/results/searchSelection";
import type { SavedSearch } from "@/types/search";

function createSearch(id: string): SavedSearch {
  return {
    id,
    userId: "local-user",
    name: id,
    originCodes: ["IAD"],
    destinationCodes: ["NRT"],
    departDate: "2027-05-01",
    returnDate: "2027-05-10",
    tripType: "round_trip",
    passengers: 2,
    cabin: "business",
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  };
}

describe("results search selection", () => {
  it("uses active search before saved searches", () => {
    const activeSearch = createSearch("active");

    expect(
      selectResultsSearch(activeSearch, [createSearch("saved")], createSearch("fallback")),
    ).toBe(activeSearch);
  });

  it("uses the first saved search when no active search exists", () => {
    const firstSavedSearch = createSearch("first-saved");

    expect(
      selectResultsSearch(undefined, [firstSavedSearch, createSearch("second")], createSearch("fallback")),
    ).toBe(firstSavedSearch);
  });

  it("uses fallback when no active or saved search exists", () => {
    const fallbackSearch = createSearch("fallback");

    expect(selectResultsSearch(undefined, [], fallbackSearch)).toBe(fallbackSearch);
  });
});
