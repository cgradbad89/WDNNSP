import { describe, expect, it } from "vitest";
import {
  getAirlineMileageAccounts,
  getFlexibleCurrencyAccounts,
  getTotalAirlineMiles,
  getTotalFlexiblePoints,
} from "@/lib/points/totals";
import type { PointsAccount } from "@/types/points";

const accounts: PointsAccount[] = [
  {
    id: "chase",
    userId: "user-1",
    programId: "chase-ultimate-rewards",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 120000,
    lastUpdatedAt: "2026-06-01",
  },
  {
    id: "bilt",
    userId: "user-1",
    programId: "bilt-rewards",
    programName: "Bilt Rewards",
    programType: "credit_card",
    balance: 25000,
    lastUpdatedAt: "2026-06-02",
  },
  {
    id: "united",
    userId: "user-1",
    programId: "united-mileageplus",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 45000,
    lastUpdatedAt: "2026-06-03",
  },
  {
    id: "marriott",
    userId: "user-1",
    programId: "marriott-bonvoy",
    programName: "Marriott Bonvoy",
    programType: "hotel",
    balance: 80000,
    lastUpdatedAt: "2026-06-04",
  },
];

describe("points totals", () => {
  it("totals flexible points from credit card accounts only", () => {
    expect(getTotalFlexiblePoints(accounts)).toBe(145000);
  });

  it("totals airline miles from airline accounts only", () => {
    expect(getTotalAirlineMiles(accounts)).toBe(45000);
  });

  it("filters flexible currency accounts", () => {
    expect(
      getFlexibleCurrencyAccounts(accounts).map((account) => account.id),
    ).toEqual(["chase", "bilt"]);
  });

  it("filters airline mileage accounts", () => {
    expect(
      getAirlineMileageAccounts(accounts).map((account) => account.id),
    ).toEqual(["united"]);
  });
});
