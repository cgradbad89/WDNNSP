import { describe, expect, it } from "vitest";
import {
  getTransferOptionsFromWallet,
  getTransferPartnersForProgram,
} from "@/lib/transferPartners/lookup";
import type { PointsAccount } from "@/types/points";
import type { TransferPartner } from "@/types/transferPartners";

const partners: TransferPartner[] = [
  {
    id: "chase-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: true,
  },
  {
    id: "chase-aeroplan-duplicate",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: true,
  },
  {
    id: "chase-united-inactive",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "United MileagePlus",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: false,
  },
  {
    id: "amex-ana",
    fromProgram: "American Express Membership Rewards",
    toProgram: "ANA Mileage Club",
    transferRatio: 1,
    estimatedTransferTime: "one_to_two_days",
    isActive: true,
  },
];

const accounts: PointsAccount[] = [
  {
    id: "wallet-chase",
    userId: "user-1",
    programId: "chase-ultimate-rewards",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 50000,
    lastUpdatedAt: "2026-06-01",
  },
  {
    id: "wallet-united",
    userId: "user-1",
    programId: "united-mileageplus",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 50000,
    lastUpdatedAt: "2026-06-01",
  },
];

describe("transfer partner lookup", () => {
  it("returns active partners for a program", () => {
    expect(
      getTransferPartnersForProgram("Chase Ultimate Rewards", partners).map(
        (partner) => partner.id,
      ),
    ).toEqual(["chase-aeroplan", "chase-aeroplan-duplicate"]);
  });

  it("matches program names case-insensitively", () => {
    expect(
      getTransferPartnersForProgram("chase ultimate rewards", partners),
    ).toHaveLength(2);
  });

  it("excludes inactive transfer partners", () => {
    const result = getTransferPartnersForProgram(
      "Chase Ultimate Rewards",
      partners,
    );

    expect(
      result.some((partner) => partner.id === "chase-united-inactive"),
    ).toBe(false);
  });

  it("builds wallet options from credit card accounts only and dedupes routes", () => {
    expect(
      getTransferOptionsFromWallet(accounts, partners).map(
        (partner) => partner.id,
      ),
    ).toEqual(["chase-aeroplan"]);
  });
});
