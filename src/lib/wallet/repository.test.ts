import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLocalWalletRepository,
  getWalletRepositorySource,
} from "@/lib/wallet/repository";
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

function installWindowWithStorage(): void {
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage: createMemoryStorage(),
  });
}

describe("wallet repository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chooses local storage when no user is signed in", () => {
    expect(getWalletRepositorySource(null)).toBe("local");
    expect(getWalletRepositorySource(undefined)).toBe("local");
  });

  it("chooses cloud storage when a user id exists", () => {
    expect(getWalletRepositorySource("user-1")).toBe("cloud");
  });

  it("loads an uninitialized local wallet as empty without a stored value", async () => {
    installWindowWithStorage();

    await expect(createLocalWalletRepository().loadAccounts()).resolves.toEqual(
      {
        accounts: [],
        hasStoredValue: false,
        source: "local",
      },
    );
  });

  it("saves and loads local wallet accounts", async () => {
    installWindowWithStorage();
    const repository = createLocalWalletRepository();

    await repository.saveAccounts(accounts);

    await expect(repository.loadAccounts()).resolves.toEqual({
      accounts,
      hasStoredValue: true,
      source: "local",
    });
  });

  it("preserves an intentionally empty local wallet as a stored value", async () => {
    installWindowWithStorage();
    const repository = createLocalWalletRepository();

    await repository.saveAccounts([]);

    await expect(repository.loadAccounts()).resolves.toEqual({
      accounts: [],
      hasStoredValue: true,
      source: "local",
    });
  });
});
