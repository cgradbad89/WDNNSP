import { describe, expect, it } from "vitest";
import {
  getSavedSearchSupportStatus,
  hasSearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import type { SavedSearch } from "@/types/search";

function createSavedSearch(
  overrides: Partial<SavedSearch> = {},
): SavedSearch {
  return {
    id: "search-1",
    userId: "local-user",
    name: "Tokyo",
    originCodes: ["IAD"],
    destinationCodes: ["NRT"],
    departDate: "2026-10-18",
    returnDate: "2026-10-29",
    tripType: "round_trip",
    passengers: 2,
    cabin: "business",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("search validation", () => {
  it("catches missing required fields", () => {
    expect(validateSavedSearchInput({})).toEqual({
      name: "Name is required.",
      originCodes: "Origin is required.",
      destinationCodes: "Destination is required.",
      departDate: "Departure date is required.",
      passengers: "Passengers must be at least 1.",
      cabin: "Cabin is required.",
    });
  });

  it("requires return date for round-trip searches", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "round_trip",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({
      returnDate: "Return date is required for round trips.",
    });
  });

  it("does not require return date for one-way searches", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({});
  });

  it("accepts supported airport codes", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["IAD"],
        destinationCodes: ["HND"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({});
  });

  it("accepts supported airport group codes", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({});
  });

  it("marks a supported airport saved search as supported", () => {
    expect(getSavedSearchSupportStatus(createSavedSearch())).toEqual({
      isSupported: true,
      originSupported: true,
      destinationSupported: true,
      sameRoute: false,
      message: undefined,
    });
  });

  it("marks a supported group saved search as supported", () => {
    expect(
      getSavedSearchSupportStatus(
        createSavedSearch({
          originCodes: ["WAS"],
          destinationCodes: ["TYO"],
        }),
      ),
    ).toEqual({
      isSupported: true,
      originSupported: true,
      destinationSupported: true,
      sameRoute: false,
      message: undefined,
    });
  });

  it("marks unsupported saved-search origins with a clear message", () => {
    expect(
      getSavedSearchSupportStatus(
        createSavedSearch({
          originCodes: ["ZZZ"],
          destinationCodes: ["TYO"],
        }),
      ),
    ).toEqual({
      isSupported: false,
      originSupported: false,
      destinationSupported: true,
      sameRoute: false,
      message:
        "Needs update: choose a supported origin airport or metro area.",
    });
  });

  it("marks unsupported saved-search destinations with a clear message", () => {
    expect(
      getSavedSearchSupportStatus(
        createSavedSearch({
          originCodes: ["WAS"],
          destinationCodes: ["ZZZ"],
        }),
      ),
    ).toEqual({
      isSupported: false,
      originSupported: true,
      destinationSupported: false,
      sameRoute: false,
      message:
        "Needs update: choose a supported destination airport or metro area.",
    });
  });

  it("marks identical saved-search origin and destination as unsupported", () => {
    expect(
      getSavedSearchSupportStatus(
        createSavedSearch({
          originCodes: ["IAD"],
          destinationCodes: ["IAD"],
        }),
      ),
    ).toEqual({
      isSupported: false,
      originSupported: true,
      destinationSupported: true,
      sameRoute: true,
      message: "Needs update: origin and destination cannot be the same.",
    });
  });

  it("matches validation rules for saved-search group/member duplicate routes", () => {
    expect(
      getSavedSearchSupportStatus(
        createSavedSearch({
          originCodes: ["WAS"],
          destinationCodes: ["DCA"],
        }),
      ),
    ).toEqual({
      isSupported: false,
      originSupported: true,
      destinationSupported: true,
      sameRoute: true,
      message: "Needs update: origin and destination cannot be the same.",
    });
  });

  it("rejects unsupported origin codes", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["ZZZ"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({
      originCodes: "Choose a supported origin airport or metro area.",
    });
  });

  it("rejects unsupported destination codes", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["ZZZ"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({
      destinationCodes: "Choose a supported destination airport or metro area.",
    });
  });

  it("rejects return date before departure date", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        returnDate: "2026-10-17",
        tripType: "round_trip",
        passengers: 2,
        cabin: "business",
      }),
    ).toEqual({
      returnDate: "Return date cannot be before departure date.",
    });
  });

  it("rejects identical origin and destination after airport group expansion", () => {
    expect(
      validateSavedSearchInput({
        name: "Bad route",
        originCodes: ["WAS"],
        destinationCodes: ["DCA"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 1,
        cabin: "economy",
      }),
    ).toEqual({
      destinationCodes: "Origin and destination cannot be the same.",
    });
  });

  it("rejects passengers below 1", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 0,
        cabin: "business",
      }),
    ).toEqual({
      passengers: "Passengers must be at least 1.",
    });
  });

  it("rejects missing or invalid cabin values", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 1,
        cabin: "invalid" as never,
      }),
    ).toEqual({
      cabin: "Cabin is required.",
    });
  });

  it("rejects negative max stops and flexible days", () => {
    expect(
      validateSavedSearchInput({
        name: "Tokyo",
        originCodes: ["WAS"],
        destinationCodes: ["TYO"],
        departDate: "2026-10-18",
        tripType: "one_way",
        passengers: 1,
        cabin: "business",
        maxStops: -1,
        flexibleDays: -3,
      }),
    ).toEqual({
      maxStops: "Max stops must be 0 or greater.",
      flexibleDays: "Flexible days must be 0 or greater.",
    });
  });

  it("detects whether validation errors are present", () => {
    expect(hasSearchValidationErrors({})).toBe(false);
    expect(hasSearchValidationErrors({ name: "Name is required." })).toBe(true);
  });
});
