import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWalletAccount,
  deleteWalletAccount,
  hasStoredWalletAccounts,
  loadWalletAccounts,
  saveWalletAccounts,
  updateWalletAccount,
} from "@/lib/wallet/storage";
import type { PointsAccount } from "@/types/points";

const accounts: PointsAccount[] = [
  {
    id: "account-1",
    userId: "local-user",
    programId: "chase-ultimate-rewards",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 1000,
    lastUpdatedAt: "2026-06-01T00:00:00.000Z",
    notes: "Keep",
  },
  {
    id: "account-2",
    userId: "local-user",
    programId: "united-mileageplus",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 2000,
    lastUpdatedAt: "2026-06-02T00:00:00.000Z",
  },
];

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function installWindowWithStorage(): Storage {
  const localStorage = createMemoryStorage();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("wallet storage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns empty array when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(loadWalletAccounts()).toEqual([]);
  });

  it("save no-ops when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveWalletAccounts(accounts)).not.toThrow();
  });

  it("returns empty array for malformed JSON", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem("wdnnsp.pointsAccounts", "{bad-json");

    expect(loadWalletAccounts()).toEqual([]);
    expect(hasStoredWalletAccounts()).toBe(false);
  });

  it("loads saved accounts from localStorage", () => {
    installWindowWithStorage();
    saveWalletAccounts(accounts);

    expect(loadWalletAccounts()).toEqual(accounts);
  });

  it("stores saved accounts in a versioned envelope", () => {
    const localStorage = installWindowWithStorage();
    saveWalletAccounts(accounts);

    expect(JSON.parse(localStorage.getItem("wdnnsp.pointsAccounts") ?? "")).toEqual({
      version: 1,
      data: accounts,
    });
  });

  it("loads old unwrapped account arrays for backward compatibility", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem("wdnnsp.pointsAccounts", JSON.stringify(accounts));

    expect(loadWalletAccounts()).toEqual(accounts);
    expect(hasStoredWalletAccounts()).toBe(true);
  });

  it("rejects malformed-but-valid JSON account arrays", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem(
      "wdnnsp.pointsAccounts",
      JSON.stringify([{ id: "missing-wallet-fields" }]),
    );

    expect(loadWalletAccounts()).toEqual([]);
    expect(hasStoredWalletAccounts()).toBe(false);
  });

  it("rejects envelopes with invalid versions", () => {
    const localStorage = installWindowWithStorage();
    localStorage.setItem(
      "wdnnsp.pointsAccounts",
      JSON.stringify({ version: 0, data: accounts }),
    );

    expect(loadWalletAccounts()).toEqual([]);
    expect(hasStoredWalletAccounts()).toBe(false);
  });

  it("detects saved wallet storage even when the wallet is empty", () => {
    installWindowWithStorage();
    saveWalletAccounts([]);

    expect(hasStoredWalletAccounts()).toBe(true);
    expect(loadWalletAccounts()).toEqual([]);
  });

  it("create account adds id and lastUpdatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    vi.stubGlobal("crypto", {
      randomUUID: () => "generated-id",
    });

    expect(
      createWalletAccount({
        userId: "local-user",
        programId: "bilt-rewards",
        programName: "Bilt Rewards",
        programType: "credit_card",
        balance: 3000,
      }),
    ).toEqual({
      id: "generated-id",
      userId: "local-user",
      programId: "bilt-rewards",
      programName: "Bilt Rewards",
      programType: "credit_card",
      balance: 3000,
      lastUpdatedAt: "2026-06-06T12:00:00.000Z",
    });
  });

  it("update account updates only matching account", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));

    const updatedAccounts = updateWalletAccount(accounts, "account-1", {
      balance: 1500,
      notes: "Updated",
    });

    expect(updatedAccounts).toEqual([
      {
        ...accounts[0],
        balance: 1500,
        notes: "Updated",
        lastUpdatedAt: "2026-06-06T12:00:00.000Z",
      },
      accounts[1],
    ]);
  });

  it("delete account removes only matching account", () => {
    expect(deleteWalletAccount(accounts, "account-1")).toEqual([accounts[1]]);
  });
});
