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
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "air-canada-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: true,
  },
  {
    id: "chase-aeroplan-duplicate",
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "air-canada-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: true,
  },
  {
    id: "chase-united-inactive",
    fromProgramId: "chase-ultimate-rewards",
    toProgramId: "united-mileageplus",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "United MileagePlus",
    transferRatio: 1,
    estimatedTransferTime: "instant",
    isActive: false,
  },
  {
    id: "amex-ana",
    fromProgramId: "american-express-membership-rewards",
    toProgramId: "ana-mileage-club",
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

  it("matches program IDs before falling back to names", () => {
    expect(
      getTransferPartnersForProgram("chase-ultimate-rewards", partners).map(
        (partner) => partner.id,
      ),
    ).toEqual(["chase-aeroplan", "chase-aeroplan-duplicate"]);
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

  it("uses wallet program IDs before falling back to names", () => {
    const renamedAccounts: PointsAccount[] = [
      {
        ...accounts[0],
        programName: "Legacy Chase Label",
      },
    ];
    const legacyAccounts: PointsAccount[] = [
      {
        ...accounts[0],
        programId: "legacy-chase-id",
      },
    ];

    expect(getTransferOptionsFromWallet(renamedAccounts, partners)).toHaveLength(1);
    expect(getTransferOptionsFromWallet(legacyAccounts, partners)).toHaveLength(1);
  });
});
