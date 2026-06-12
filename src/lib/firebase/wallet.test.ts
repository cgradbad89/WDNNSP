import { describe, expect, it } from "vitest";
import {
  buildCloudWalletLoadResult,
  isCloudWalletMetaInitialized,
  normalizeCloudWalletAccount,
  parseCloudWalletAccountDocuments,
} from "@/lib/firebase/wallet";
import type { PointsAccount } from "@/types/points";

const account: PointsAccount = {
  id: "account-1",
  userId: "local-user",
  programId: "chase-ultimate-rewards",
  programName: "Chase Ultimate Rewards",
  programType: "credit_card",
  balance: 1000,
  lastUpdatedAt: "2026-06-01T00:00:00.000Z",
};

describe("firebase wallet helpers", () => {
  it("detects initialized wallet metadata only when initialized is true", () => {
    expect(isCloudWalletMetaInitialized({ initialized: true })).toBe(true);
    expect(isCloudWalletMetaInitialized({ initialized: false })).toBe(false);
    expect(isCloudWalletMetaInitialized(null)).toBe(false);
  });

  it("distinguishes uninitialized cloud wallet from intentionally empty cloud wallet", () => {
    expect(
      buildCloudWalletLoadResult({
        accounts: [],
        hasAccountDocuments: false,
        isInitialized: false,
      }),
    ).toEqual({
      accounts: [],
      hasStoredValue: false,
      source: "cloud",
    });

    expect(
      buildCloudWalletLoadResult({
        accounts: [],
        hasAccountDocuments: false,
        isInitialized: true,
      }),
    ).toEqual({
      accounts: [],
      hasStoredValue: true,
      source: "cloud",
    });
  });

  it("treats existing account documents as a stored cloud value", () => {
    expect(
      buildCloudWalletLoadResult({
        accounts: [account],
        hasAccountDocuments: true,
        isInitialized: false,
      }),
    ).toEqual({
      accounts: [account],
      hasStoredValue: true,
      source: "cloud",
    });
  });

  it("normalizes imported or local accounts to the signed-in user id", () => {
    expect(normalizeCloudWalletAccount("user-1", account)).toEqual({
      ...account,
      userId: "user-1",
    });
  });

  it("filters invalid cloud wallet documents safely", () => {
    expect(
      parseCloudWalletAccountDocuments("user-1", [
        {
          id: "valid-account",
          data: {
            ...account,
            id: "ignored-id",
            userId: "ignored-user",
          },
        },
        {
          id: "invalid-account",
          data: {
            ...account,
            balance: -1,
          },
        },
      ]),
    ).toEqual([
      {
        ...account,
        id: "valid-account",
        userId: "user-1",
      },
    ]);
  });
});
