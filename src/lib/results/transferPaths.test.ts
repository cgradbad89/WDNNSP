import { describe, expect, it } from "vitest";
import { getTransferPathDisplays } from "@/lib/results/transferPaths";
import type { PointsAccount } from "@/types/points";
import type { TransferPartner } from "@/types/transferPartners";

const accounts: PointsAccount[] = [
  {
    id: "chase",
    userId: "local-user",
    programId: "chase",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 125000,
    lastUpdatedAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "amex",
    userId: "local-user",
    programId: "amex",
    programName: "American Express Membership Rewards",
    programType: "credit_card",
    balance: 60000,
    lastUpdatedAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "united",
    userId: "local-user",
    programId: "united",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 250000,
    lastUpdatedAt: "2026-06-06T00:00:00.000Z",
  },
];

const partners: TransferPartner[] = [
  {
    id: "chase-aeroplan",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
  {
    id: "amex-aeroplan",
    fromProgram: "American Express Membership Rewards",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "unknown",
    isActive: true,
  },
  {
    id: "inactive-aeroplan",
    fromProgram: "Capital One Miles",
    toProgram: "Air Canada Aeroplan",
    transferRatio: 1,
    estimatedTransferTime: "unknown",
    isActive: false,
  },
  {
    id: "chase-united",
    fromProgram: "Chase Ultimate Rewards",
    toProgram: "United MileagePlus",
    transferRatio: 1,
    estimatedTransferTime: "same_day",
    isActive: true,
  },
];

describe("transfer path displays", () => {
  it("shows sufficient paths first", () => {
    const displays = getTransferPathDisplays(
      "Air Canada Aeroplan",
      100000,
      accounts,
      partners,
    );

    expect(displays.map((display) => display.fromProgram)).toEqual([
      "Chase Ultimate Rewards",
      "American Express Membership Rewards",
    ]);
    expect(displays[0].isSufficient).toBe(true);
    expect(displays[1].isSufficient).toBe(false);
  });

  it("excludes inactive partners", () => {
    const displays = getTransferPathDisplays(
      "Air Canada Aeroplan",
      50000,
      accounts,
      partners,
    );

    expect(displays.map((display) => display.fromProgram)).not.toContain(
      "Capital One Miles",
    );
  });

  it("excludes airline mileage accounts", () => {
    const displays = getTransferPathDisplays(
      "United MileagePlus",
      100000,
      accounts,
      partners,
    );

    expect(displays).toHaveLength(1);
    expect(displays[0].fromProgram).toBe("Chase Ultimate Rewards");
  });

  it("uses transfer ratio when checking sufficiency", () => {
    const displays = getTransferPathDisplays(
      "Emirates Skywards",
      90000,
      accounts,
      [
        {
          id: "amex-emirates",
          fromProgram: "American Express Membership Rewards",
          toProgram: "Emirates Skywards",
          transferRatio: 0.8,
          estimatedTransferTime: "unknown",
          isActive: true,
        },
      ],
    );

    expect(displays[0]).toMatchObject({
      availableBalance: 60000,
      isSufficient: false,
      transferRatio: 0.8,
    });
  });
});
