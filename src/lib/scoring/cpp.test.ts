import { describe, expect, it } from "vitest";
import { calculateCentsPerPoint } from "@/lib/scoring/cpp";

describe("calculateCentsPerPoint", () => {
  it("calculates cpp for a normal redemption", () => {
    expect(calculateCentsPerPoint(1000, 0, 50000)).toBe(2);
  });

  it("subtracts taxes and fees before dividing by points", () => {
    expect(calculateCentsPerPoint(7100, 100, 100000)).toBe(7);
  });

  it("rounds cpp to one decimal place", () => {
    expect(calculateCentsPerPoint(7100, 186, 120000)).toBe(5.8);
  });

  it("returns 0 for zero or negative points", () => {
    expect(calculateCentsPerPoint(1000, 0, 0)).toBe(0);
    expect(calculateCentsPerPoint(1000, 0, -1000)).toBe(0);
  });

  it("returns 0 when taxes and fees meet or exceed cash price", () => {
    expect(calculateCentsPerPoint(100, 100, 10000)).toBe(0);
    expect(calculateCentsPerPoint(100, 120, 10000)).toBe(0);
  });
});
