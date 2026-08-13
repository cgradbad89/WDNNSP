import { describe, expect, it } from "vitest";
import {
  CABIN_LABELS,
  formatDateRangeSummary,
  formatTravelersCabinSummary,
  TRIP_TYPE_OPTIONS,
} from "@/lib/search/searchBarFormatting";

describe("TRIP_TYPE_OPTIONS", () => {
  it("only offers round trip and one way, never multi-city", () => {
    expect(TRIP_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "round_trip",
      "one_way",
    ]);
  });
});

describe("formatDateRangeSummary", () => {
  it("formats a complete round-trip range", () => {
    expect(
      formatDateRangeSummary("round_trip", "2027-05-01", "2027-05-10"),
    ).toBe("May 1 - May 10");
  });

  it("prompts for a return date when only depart is set on a round trip", () => {
    expect(formatDateRangeSummary("round_trip", "2027-05-01", "")).toBe(
      "May 1 - Add return date",
    );
  });

  it("shows only the departure date for one-way trips", () => {
    expect(formatDateRangeSummary("one_way", "2027-05-01", "2027-05-10")).toBe(
      "May 1",
    );
  });

  it("falls back to placeholder copy when no dates are set", () => {
    expect(formatDateRangeSummary("round_trip", "", "")).toBe("Add dates");
    expect(formatDateRangeSummary("one_way", "", "")).toBe(
      "Add departure date",
    );
  });
});

describe("formatTravelersCabinSummary", () => {
  it("pluralizes travelers and includes the cabin label", () => {
    expect(formatTravelersCabinSummary("2", "business")).toBe(
      "2 travelers - Business",
    );
  });

  it("uses singular traveler for one passenger", () => {
    expect(formatTravelersCabinSummary("1", "economy")).toBe(
      "1 traveler - Economy",
    );
  });

  it("falls back to placeholder copy for invalid passenger counts", () => {
    expect(formatTravelersCabinSummary("", "first")).toBe("Travelers - First");
    expect(formatTravelersCabinSummary("0", "premium_economy")).toBe(
      "Travelers - Premium economy",
    );
  });
});

describe("CABIN_LABELS", () => {
  it("has a label for every cabin", () => {
    expect(Object.keys(CABIN_LABELS).sort()).toEqual(
      ["business", "economy", "first", "premium_economy"].sort(),
    );
  });
});
