import type { PointsAccount } from "@/types/points";
import {
  createPersistedEnvelope,
  unwrapPersistedEnvelope,
} from "@/lib/persistence/schema";
import { isPointsAccountArray } from "@/lib/wallet/validators";

const WALLET_STORAGE_KEY = "wdnnsp.pointsAccounts";
export const WALLET_ACCOUNTS_CHANGED_EVENT = "wdnnsp.walletAccountsChanged";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createClientId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseWalletAccounts(value: unknown): PointsAccount[] | undefined {
  return (
    unwrapPersistedEnvelope(value, isPointsAccountArray) ??
    (isPointsAccountArray(value) ? value : undefined)
  );
}

export function loadWalletAccounts(): PointsAccount[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(WALLET_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return parseWalletAccounts(parsedValue) ?? [];
  } catch {
    return [];
  }
}

export function hasStoredWalletAccounts(): boolean {
  if (!hasBrowserStorage()) {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(WALLET_STORAGE_KEY);

    if (storedValue === null) {
      return false;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return parseWalletAccounts(parsedValue) !== undefined;
  } catch {
    return false;
  }
}

export function saveWalletAccounts(accounts: PointsAccount[]): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    WALLET_STORAGE_KEY,
    JSON.stringify(createPersistedEnvelope(accounts)),
  );

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(WALLET_ACCOUNTS_CHANGED_EVENT));
  }
}

export function createWalletAccount(
  input: Omit<PointsAccount, "id" | "lastUpdatedAt">,
): PointsAccount {
  return {
    ...input,
    id: createClientId(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function updateWalletAccount(
  accounts: PointsAccount[],
  accountId: string,
  updates: Partial<Pick<PointsAccount, "balance" | "notes">>,
): PointsAccount[] {
  return accounts.map((account) => {
    if (account.id !== accountId) {
      return account;
    }

    return {
      ...account,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
  });
}

export function deleteWalletAccount(
  accounts: PointsAccount[],
  accountId: string,
): PointsAccount[] {
  return accounts.filter((account) => account.id !== accountId);
}
