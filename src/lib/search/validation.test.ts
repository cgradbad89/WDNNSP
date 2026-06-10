import { describe, expect, it } from "vitest";
import {
  hasSearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";

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
