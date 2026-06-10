import { describe, expect, it } from "vitest";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { AIRPORTS } from "@/data/airports";
import {
  getAirportSuggestions,
  isSupportedAirportSelection,
  normalizeAirportQuery,
} from "@/lib/airports/autocomplete";

describe("airport autocomplete", () => {
  it("ranks an exact group code match first", () => {
    expect(getAirportSuggestions("WAS", AIRPORTS, AIRPORT_GROUPS)[0]).toMatchObject({
      type: "group",
      code: "WAS",
      label: "WAS — Washington, DC Area",
      sublabel: "DCA · IAD · BWI",
    });
  });

  it("ranks an exact airport code match before group member matches", () => {
    const suggestions = getAirportSuggestions("IAD", AIRPORTS, AIRPORT_GROUPS);

    expect(suggestions[0]).toMatchObject({
      type: "airport",
      code: "IAD",
      label: "IAD — Washington Dulles International Airport",
    });
    expect(suggestions.some((suggestion) => suggestion.code === "WAS")).toBe(
      true,
    );
  });

  it("searches by city and airport name", () => {
    expect(
      getAirportSuggestions("Tokyo", AIRPORTS, AIRPORT_GROUPS).map(
        (suggestion) => suggestion.code,
      ),
    ).toEqual(expect.arrayContaining(["TYO", "HND", "NRT"]));

    expect(getAirportSuggestions("Dulles", AIRPORTS, AIRPORT_GROUPS)[0]).toMatchObject({
      type: "airport",
      code: "IAD",
    });
  });

  it("normalizes lowercase queries", () => {
    expect(normalizeAirportQuery("  tokyo  ")).toBe("TOKYO");
    expect(getAirportSuggestions("iad", AIRPORTS, AIRPORT_GROUPS)[0]?.code).toBe(
      "IAD",
    );
  });

  it("returns relevant airport groups for member-code queries", () => {
    expect(
      getAirportSuggestions("BWI", AIRPORTS, AIRPORT_GROUPS).some(
        (suggestion) => suggestion.type === "group" && suggestion.code === "WAS",
      ),
    ).toBe(true);
  });

  it("detects supported and unsupported selections", () => {
    expect(isSupportedAirportSelection("IAD", AIRPORTS, AIRPORT_GROUPS)).toBe(
      true,
    );
    expect(isSupportedAirportSelection("WAS", AIRPORTS, AIRPORT_GROUPS)).toBe(
      true,
    );
    expect(isSupportedAirportSelection("ZZZ", AIRPORTS, AIRPORT_GROUPS)).toBe(
      false,
    );
  });

  it("honors the suggestion limit", () => {
    expect(getAirportSuggestions("United", AIRPORTS, AIRPORT_GROUPS, 3)).toHaveLength(
      3,
    );
  });

  it("does not return duplicate suggestion codes", () => {
    const suggestionCodes = getAirportSuggestions(
      "Washington",
      AIRPORTS,
      AIRPORT_GROUPS,
      20,
    ).map((suggestion) => suggestion.code);

    expect(new Set(suggestionCodes).size).toBe(suggestionCodes.length);
  });
});
