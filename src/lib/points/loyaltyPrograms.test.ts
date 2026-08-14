import { describe, expect, it } from "vitest";
import {
  normalizeLoyaltyProgram,
  normalizeLoyaltyProgramId,
} from "@/lib/points/loyaltyPrograms";

describe("loyalty program normalization", () => {
  it("maps Seats.aero aeroplan to the canonical Aeroplan ID", () => {
    expect(
      normalizeLoyaltyProgramId({
        provider: "seats-aero",
        rawProgramId: "aeroplan",
      }),
    ).toBe("air-canada-aeroplan");
  });

  it("maps United slugs to the canonical MileagePlus ID", () => {
    expect(
      normalizeLoyaltyProgramId({
        provider: "seats-aero",
        rawProgramId: "united",
      }),
    ).toBe("united-mileageplus");
  });

  it("preserves unknown provider values without fabricating an ID", () => {
    expect(
      normalizeLoyaltyProgram({
        provider: "seats-aero",
        rawProgramId: "mystery-program",
      }),
    ).toEqual({
      provider: "seats-aero",
      rawProgramId: "mystery-program",
      isResolved: false,
    });
  });
});
