import { describe, expect, it } from "vitest";
import { expandAirportCode } from "@/lib/airports/groups";
import type { AirportGroup } from "@/types/airports";

const airportGroups: AirportGroup[] = [
  {
    code: "WAS",
    name: "Washington, DC Area",
    airportCodes: ["DCA", "IAD", "BWI"],
  },
  {
    code: "NYC",
    name: "New York City Area",
    airportCodes: ["JFK", "LGA", "EWR"],
  },
];

describe("airport group expansion", () => {
  it("expands known airport groups", () => {
    expect(expandAirportCode("WAS", airportGroups)).toEqual([
      "DCA",
      "IAD",
      "BWI",
    ]);
  });

  it("matches airport groups case-insensitively", () => {
    expect(expandAirportCode("nyc", airportGroups)).toEqual([
      "JFK",
      "LGA",
      "EWR",
    ]);
  });

  it("returns uppercase airport code when no group matches", () => {
    expect(expandAirportCode("iad", airportGroups)).toEqual(["IAD"]);
  });
});
