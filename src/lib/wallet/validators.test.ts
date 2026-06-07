import { describe, expect, it } from "vitest";
import {
  isPointsAccount,
  isPointsAccountArray,
} from "@/lib/wallet/validators";
import type { PointsAccount } from "@/types/points";

const account: PointsAccount = {
  id: "account-1",
  userId: "local-user",
  programId: "chase-ultimate-rewards",
  programName: "Chase Ultimate Rewards",
  programType: "credit_card",
  balance: 100000,
  lastUpdatedAt: "2026-06-06T00:00:00.000Z",
  notes: "Manual balance",
};

describe("wallet validators", () => {
  it("accepts a valid points account", () => {
    expect(isPointsAccount(account)).toBe(true);
  });

  it("accepts optional notes", () => {
    const { notes, ...accountWithoutNotes } = account;
    void notes;

    expect(isPointsAccount(accountWithoutNotes)).toBe(true);
  });

  it("rejects invalid program types", () => {
    expect(
      isPointsAccount({ ...account, programType: "bank_points" }),
    ).toBe(false);
  });

  it("rejects negative or non-finite balances", () => {
    expect(isPointsAccount({ ...account, balance: -1 })).toBe(false);
    expect(isPointsAccount({ ...account, balance: Number.NaN })).toBe(false);
  });

  it("validates arrays only when every account is valid", () => {
    expect(isPointsAccountArray([account])).toBe(true);
    expect(
      isPointsAccountArray([account, { ...account, id: 12 }]),
    ).toBe(false);
  });
});
