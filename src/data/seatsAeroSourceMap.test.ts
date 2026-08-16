import { describe, expect, it } from "vitest";
import { SEATS_AERO_SOURCE_MAP } from "@/data/seatsAeroSourceMap";
import { getCardProgramsForAirline } from "@/lib/transferPartners/lookup";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";

describe("SEATS_AERO_SOURCE_MAP", () => {
  it("resolves every key to a non-empty program name (no typos left as empty values)", () => {
    for (const [slug, programName] of Object.entries(SEATS_AERO_SOURCE_MAP)) {
      expect(programName, `source "${slug}" has an empty program name`).toEqual(
        expect.stringMatching(/\S/),
      );
    }
  });

  it("maps known Seats.aero sources to program names that resolve to real card transfer partners", () => {
    expect(
      getCardProgramsForAirline(
        SEATS_AERO_SOURCE_MAP.aeroplan,
        TRANSFER_PARTNERS,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      getCardProgramsForAirline(
        SEATS_AERO_SOURCE_MAP.united,
        TRANSFER_PARTNERS,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("gracefully resolves sources with no known card transfer partners to an empty array", () => {
    expect(
      getCardProgramsForAirline(SEATS_AERO_SOURCE_MAP.delta, TRANSFER_PARTNERS),
    ).toEqual([]);
  });

  it("uses the documented British Airways display label", () => {
    expect(SEATS_AERO_SOURCE_MAP.british).toBe("British Airways Avios");
  });
});
