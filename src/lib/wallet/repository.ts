import { loadCloudWalletAccounts, saveCloudWalletAccounts } from "@/lib/firebase/wallet";
import {
  hasStoredWalletAccounts,
  loadWalletAccounts,
  saveWalletAccounts,
} from "@/lib/wallet/storage";
import type { PointsAccount } from "@/types/points";

export type WalletSource = "local" | "cloud";

export interface WalletLoadResult {
  accounts: PointsAccount[];
  hasStoredValue: boolean;
  source: WalletSource;
}

export interface WalletRepository {
  loadAccounts(): Promise<WalletLoadResult>;
  saveAccounts(accounts: PointsAccount[]): Promise<void>;
}

export function getWalletRepositorySource(
  uid: string | null | undefined,
): WalletSource {
  return uid ? "cloud" : "local";
}

export function createLocalWalletRepository(): WalletRepository {
  return {
    async loadAccounts() {
      return {
        accounts: loadWalletAccounts(),
        hasStoredValue: hasStoredWalletAccounts(),
        source: "local",
      };
    },
    async saveAccounts(accounts) {
      saveWalletAccounts(accounts);
    },
  };
}

export function createCloudWalletRepository(uid: string): WalletRepository {
  return {
    async loadAccounts() {
      return loadCloudWalletAccounts(uid);
    },
    async saveAccounts(accounts) {
      await saveCloudWalletAccounts(uid, accounts);
    },
  };
}

export function createWalletRepository(
  uid: string | null | undefined,
): WalletRepository {
  return uid ? createCloudWalletRepository(uid) : createLocalWalletRepository();
}
