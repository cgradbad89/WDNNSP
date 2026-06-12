"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import {
  createWalletRepository,
  getWalletRepositorySource,
  type WalletLoadResult,
  type WalletSource,
} from "@/lib/wallet/repository";
import { WALLET_ACCOUNTS_CHANGED_EVENT } from "@/lib/wallet/storage";
import type { PointsAccount } from "@/types/points";

const LOCAL_USER_ID = "local-user";

export interface UseWalletAccountsResult {
  accounts: PointsAccount[];
  hasStoredValue: boolean;
  source: WalletSource;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveAccounts: (accounts: PointsAccount[]) => Promise<void>;
}

export interface UseWalletAccountsOptions {
  seedLocalAccounts?: boolean;
}

function createSeedAccounts(): PointsAccount[] {
  return MOCK_POINTS_ACCOUNTS.map((account) => ({
    ...account,
    userId: LOCAL_USER_ID,
  }));
}

function getWalletStateKey(uid: string | null | undefined): string {
  return uid ? `cloud:${uid}` : "local";
}

function getLoadErrorMessage(source: WalletSource): string {
  return source === "cloud"
    ? "Cloud wallet could not be loaded. Wallet-based summaries are using an empty wallet until reload succeeds."
    : "This browser wallet could not be loaded.";
}

function getSaveErrorMessage(source: WalletSource): string {
  return source === "cloud"
    ? "Cloud wallet could not be saved."
    : "This browser wallet could not be saved.";
}

function applySeedLocalAccounts(
  result: WalletLoadResult,
  seedLocalAccounts: boolean,
): WalletLoadResult {
  if (
    seedLocalAccounts &&
    result.source === "local" &&
    !result.hasStoredValue
  ) {
    return {
      ...result,
      accounts: createSeedAccounts(),
    };
  }

  return result;
}

export function useWalletAccounts({
  seedLocalAccounts = false,
}: UseWalletAccountsOptions = {}): UseWalletAccountsResult {
  const { isLoading: isAuthLoading, user } = useAuth();
  const targetSource = getWalletRepositorySource(user?.uid);
  const targetKey = getWalletStateKey(user?.uid);
  const loadIdRef = useRef(0);
  const [state, setState] = useState<
    WalletLoadResult & {
      error: string | null;
      isLoading: boolean;
      key: string;
    }
  >({
    accounts: [],
    error: null,
    hasStoredValue: false,
    isLoading: true,
    key: "auth-loading",
    source: "local",
  });

  const loadAccounts = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;

    if (isAuthLoading) {
      setState({
        accounts: [],
        error: null,
        hasStoredValue: false,
        isLoading: true,
        key: "auth-loading",
        source: targetSource,
      });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      accounts: currentState.key === targetKey ? currentState.accounts : [],
      error: null,
      hasStoredValue:
        currentState.key === targetKey ? currentState.hasStoredValue : false,
      isLoading: true,
      key: targetKey,
      source: targetSource,
    }));

    try {
      const repository = createWalletRepository(user?.uid);
      const result = applySeedLocalAccounts(
        await repository.loadAccounts(),
        seedLocalAccounts,
      );

      if (loadIdRef.current !== loadId) {
        return;
      }

      setState({
        ...result,
        error: null,
        isLoading: false,
        key: targetKey,
      });
    } catch {
      if (loadIdRef.current !== loadId) {
        return;
      }

      setState({
        accounts: [],
        error: getLoadErrorMessage(targetSource),
        hasStoredValue: false,
        isLoading: false,
        key: targetKey,
        source: targetSource,
      });
    }
  }, [isAuthLoading, seedLocalAccounts, targetKey, targetSource, user?.uid]);

  const saveAccounts = useCallback(
    async (accounts: PointsAccount[]) => {
      if (isAuthLoading) {
        throw new Error("Wallet is still loading.");
      }

      try {
        const repository = createWalletRepository(user?.uid);
        await repository.saveAccounts(accounts);
        const result = applySeedLocalAccounts(
          await repository.loadAccounts(),
          seedLocalAccounts,
        );

        setState({
          ...result,
          error: null,
          isLoading: false,
          key: targetKey,
        });
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : getSaveErrorMessage(targetSource),
          isLoading: false,
          key: targetKey,
          source: targetSource,
        }));
        throw error;
      }
    },
    [isAuthLoading, seedLocalAccounts, targetKey, targetSource, user?.uid],
  );

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (isAuthLoading || user) {
      return;
    }

    function handleLocalWalletChange(): void {
      void loadAccounts();
    }

    window.addEventListener("focus", handleLocalWalletChange);
    window.addEventListener("storage", handleLocalWalletChange);
    window.addEventListener(
      WALLET_ACCOUNTS_CHANGED_EVENT,
      handleLocalWalletChange,
    );

    return () => {
      window.removeEventListener("focus", handleLocalWalletChange);
      window.removeEventListener("storage", handleLocalWalletChange);
      window.removeEventListener(
        WALLET_ACCOUNTS_CHANGED_EVENT,
        handleLocalWalletChange,
      );
    };
  }, [isAuthLoading, loadAccounts, user]);

  const isStateCurrent = state.key === targetKey;

  return {
    accounts: isStateCurrent ? state.accounts : [],
    error: isStateCurrent ? state.error : null,
    hasStoredValue: isStateCurrent ? state.hasStoredValue : false,
    isLoading: isAuthLoading || !isStateCurrent || state.isLoading,
    reload: loadAccounts,
    saveAccounts,
    source: isStateCurrent ? state.source : targetSource,
  };
}
