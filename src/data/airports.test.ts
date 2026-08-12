import { describe, expect, it } from "vitest";
import { AIRPORTS } from "@/data/airports";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import {
  getAirportSuggestions,
  isSupportedAirportSelection,
} from "@/lib/airports/autocomplete";

// Old hand-curated AIRPORTS list had 28 entries. The OurAirports-derived
// dataset should be far larger; this is a sanity floor, not an exact count
// (the exact count will drift on every data refresh).
const OLD_CURATED_AIRPORT_COUNT = 28;

const MAJOR_HUBS: Array<{ code: string; nameContains: string }> = [
  { code: "DEN", nameContains: "Denver" },
  { code: "ORD", nameContains: "Chicago" },
  { code: "ATL", nameContains: "Atlanta" },
  { code: "LAX", nameContains: "Los Angeles" },
  { code: "DFW", nameContains: "Dallas" },
  { code: "SEA", nameContains: "Seattle" },
  { code: "MIA", nameContains: "Miami" },
  { code: "LHR", nameContains: "Heathrow" },
  { code: "NRT", nameContains: "Narita" },
  { code: "CDG", nameContains: "Charles de Gaulle" },
];

describe("AIRPORTS (OurAirports-derived dataset)", () => {
  it("is well above the old hand-curated airport count", () => {
    expect(AIRPORTS.length).toBeGreaterThan(OLD_CURATED_AIRPORT_COUNT * 100);
  });

  it("has no duplicate IATA codes", () => {
    const codes = AIRPORTS.map((airport) => airport.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(MAJOR_HUBS)(
    "includes $code with a matching name",
    ({ code, nameContains }) => {
      const airport = AIRPORTS.find((entry) => entry.code === code);

      expect(airport).toBeDefined();
      expect(airport?.name).toContain(nameContains);
    },
  );

  it.each(MAJOR_HUBS)(
    "resolves $code by IATA code via autocomplete",
    ({ code }) => {
      expect(isSupportedAirportSelection(code, AIRPORTS, AIRPORT_GROUPS)).toBe(
        true,
      );
      expect(
        getAirportSuggestions(code, AIRPORTS, AIRPORT_GROUPS)[0],
      ).toMatchObject({ type: "airport", code });
    },
  );

  it("resolves major hubs by airport name text as well as by code", () => {
    expect(
      getAirportSuggestions("Denver International", AIRPORTS, AIRPORT_GROUPS)[0],
    ).toMatchObject({ type: "airport", code: "DEN" });
  });

  it("still supports every airport referenced by an airport group", () => {
    const airportCodes = new Set(AIRPORTS.map((airport) => airport.code));

    for (const group of AIRPORT_GROUPS) {
      for (const memberCode of group.airportCodes) {
        expect(airportCodes.has(memberCode)).toBe(true);
      }
    }
  });
});
