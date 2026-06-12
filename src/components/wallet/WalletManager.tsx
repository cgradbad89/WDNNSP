"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { POINTS_PROGRAMS } from "@/data/pointsPrograms";
import type { WalletLoadResult } from "@/lib/wallet/repository";
import {
  createWalletAccount,
  deleteWalletAccount,
  hasStoredWalletAccounts,
  loadWalletAccounts,
  updateWalletAccount,
  WALLET_ACCOUNTS_CHANGED_EVENT,
} from "@/lib/wallet/storage";
import { useWalletAccounts } from "@/lib/wallet/useWalletAccounts";
import type { PointsAccount } from "@/types/points";

type AccountDraft = {
  balance: string;
  notes: string;
};

type SaveFeedback = {
  kind: "success" | "error";
  message: string;
} | null;

const LOCAL_USER_ID = "local-user";
const SAVE_FEEDBACK_TIMEOUT_MS = 3000;
const numberFormatter = new Intl.NumberFormat("en-US");
const programTypeLabels = {
  airline: "Airline miles",
  credit_card: "Flexible points",
  hotel: "Hotel points",
} as const;
const emptyLocalWalletSnapshot: WalletLoadResult = {
  accounts: [],
  hasStoredValue: false,
  source: "local",
};

function formatDate(date: string): string {
  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(normalizedDate));
}

function createAccountDrafts(
  accounts: PointsAccount[],
): Record<string, AccountDraft> {
  return Object.fromEntries(
    accounts.map((account) => [
      account.id,
      {
        balance: String(account.balance),
        notes: account.notes ?? "",
      },
    ]),
  );
}

function parseBalance(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function getLocalWalletImportSnapshot(): WalletLoadResult {
  return {
    accounts: loadWalletAccounts(),
    hasStoredValue: hasStoredWalletAccounts(),
    source: "local",
  };
}

function subscribeToLocalWalletImport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const timeoutId = window.setTimeout(onStoreChange, 0);

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);

  return () => {
    window.clearTimeout(timeoutId);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);
  };
}

function getLocalWalletImportClientSnapshot(): string {
  return JSON.stringify(getLocalWalletImportSnapshot());
}

function getLocalWalletImportServerSnapshot(): string {
  return JSON.stringify(emptyLocalWalletSnapshot);
}

function parseLocalWalletImportSnapshot(snapshot: string): WalletLoadResult {
  try {
    const parsedSnapshot: unknown = JSON.parse(snapshot);

    if (
      typeof parsedSnapshot === "object" &&
      parsedSnapshot !== null &&
      !Array.isArray(parsedSnapshot) &&
      Array.isArray((parsedSnapshot as WalletLoadResult).accounts) &&
      typeof (parsedSnapshot as WalletLoadResult).hasStoredValue ===
        "boolean" &&
      (parsedSnapshot as WalletLoadResult).source === "local"
    ) {
      return parsedSnapshot as WalletLoadResult;
    }
  } catch {
    return emptyLocalWalletSnapshot;
  }

  return emptyLocalWalletSnapshot;
}

export function WalletManager(): JSX.Element {
  const { user } = useAuth();
  const wallet = useWalletAccounts({ seedLocalAccounts: true });
  const localWalletSnapshot = useSyncExternalStore(
    subscribeToLocalWalletImport,
    getLocalWalletImportClientSnapshot,
    getLocalWalletImportServerSnapshot,
  );
  const localWallet = user
    ? parseLocalWalletImportSnapshot(localWalletSnapshot)
    : null;
  const accounts = wallet.accounts;
  const isLoaded = !wallet.isLoading;
  const walletUserId = user?.uid ?? LOCAL_USER_ID;
  const [accountDrafts, setAccountDrafts] = useState<
    Record<string, AccountDraft>
  >({});
  const [selectedProgramId, setSelectedProgramId] = useState(
    POINTS_PROGRAMS[0]?.id ?? "",
  );
  const [newBalance, setNewBalance] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addError, setAddError] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const saveFeedbackTimeoutRef = useRef<number | null>(null);
  const hasImportableLocalWallet =
    Boolean(user) &&
    Boolean(localWallet?.hasStoredValue) &&
    (localWallet?.accounts.length ?? 0) > 0;
  const walletModeLabel =
    wallet.source === "cloud" ? "Cloud wallet" : "Browser wallet";
  const walletModeMessage = user
    ? "Cloud wallet sync is on for this account. Wallet balances save to Firestore and are used by dashboard, search, and results."
    : "Wallet changes save in this browser. Sign in to sync this wallet across devices.";
  const addAccountStorageLabel =
    wallet.source === "cloud"
      ? "Saved to Firestore cloud wallet"
      : "Saved locally in this browser";

  useEffect(() => {
    return () => {
      if (saveFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(saveFeedbackTimeoutRef.current);
      }
    };
  }, []);

  function showSaveFeedback(feedback: Exclude<SaveFeedback, null>): void {
    if (saveFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(saveFeedbackTimeoutRef.current);
    }

    setSaveFeedback(feedback);
    saveFeedbackTimeoutRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
      saveFeedbackTimeoutRef.current = null;
    }, SAVE_FEEDBACK_TIMEOUT_MS);
  }

  async function persistAccounts(nextAccounts: PointsAccount[]): Promise<boolean> {
    try {
      await wallet.saveAccounts(nextAccounts);
      setAccountDrafts(createAccountDrafts(nextAccounts));
      showSaveFeedback({
        kind: "success",
        message:
          wallet.source === "cloud"
            ? "Cloud wallet changes saved."
            : "Wallet changes saved.",
      });
      return true;
    } catch {
      showSaveFeedback({
        kind: "error",
        message:
          wallet.source === "cloud"
            ? "Cloud wallet changes could not be saved."
            : "Wallet changes could not be saved.",
      });
      return false;
    }
  }

  function handleProgramChange(event: ChangeEvent<HTMLSelectElement>): void {
    setSelectedProgramId(event.target.value);
    setAddError("");
  }

  async function handleAddAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isLoaded) {
      setAddError("Wallet is still loading.");
      return;
    }

    const selectedProgram = POINTS_PROGRAMS.find(
      (program) => program.id === selectedProgramId,
    );
    const parsedBalance = parseBalance(newBalance);

    if (!selectedProgram) {
      setAddError("Choose a points program.");
      return;
    }

    if (parsedBalance === null) {
      setAddError("Enter a non-negative balance.");
      return;
    }

    const nextAccount = createWalletAccount({
      userId: walletUserId,
      programId: selectedProgram.id,
      programName: selectedProgram.name,
      programType: selectedProgram.type,
      balance: parsedBalance,
      notes: newNotes.trim() === "" ? undefined : newNotes.trim(),
    });

    const didSave = await persistAccounts([...accounts, nextAccount]);

    if (!didSave) {
      return;
    }

    setNewBalance("");
    setNewNotes("");
    setAddError("");
  }

  function handleDraftBalanceChange(accountId: string, value: string): void {
    setAccountDrafts((currentDrafts) => ({
      ...currentDrafts,
      [accountId]: {
        balance: value,
        notes: currentDrafts[accountId]?.notes ?? "",
      },
    }));
    setEditErrors((currentErrors) => ({
      ...currentErrors,
      [accountId]: "",
    }));
  }

  function handleDraftNotesChange(accountId: string, value: string): void {
    setAccountDrafts((currentDrafts) => ({
      ...currentDrafts,
      [accountId]: {
        balance: currentDrafts[accountId]?.balance ?? "",
        notes: value,
      },
    }));
  }

  async function handleSaveAccount(account: PointsAccount): Promise<void> {
    const draft = accountDrafts[account.id] ?? {
      balance: String(account.balance),
      notes: account.notes ?? "",
    };
    const parsedBalance = parseBalance(draft.balance);

    if (parsedBalance === null) {
      setEditErrors((currentErrors) => ({
        ...currentErrors,
        [account.id]: "Enter a non-negative balance.",
      }));
      return;
    }

    const nextAccounts = updateWalletAccount(accounts, account.id, {
      balance: parsedBalance,
      notes: draft.notes.trim() === "" ? undefined : draft.notes.trim(),
    });

    const didSave = await persistAccounts(nextAccounts);

    if (!didSave) {
      return;
    }

    setEditErrors((currentErrors) => ({
      ...currentErrors,
      [account.id]: "",
    }));
  }

  async function handleDeleteAccount(accountId: string): Promise<void> {
    const nextAccounts = deleteWalletAccount(accounts, accountId);

    const didSave = await persistAccounts(nextAccounts);

    if (!didSave) {
      return;
    }

    setEditErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      delete remainingErrors[accountId];
      return remainingErrors;
    });
  }

  async function handleImportLocalWallet(): Promise<void> {
    if (!user || !localWallet || localWallet.accounts.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportStatus("");

    try {
      const importedAccounts = localWallet.accounts.map((account) => ({
        ...account,
        userId: user.uid,
      }));

      await wallet.saveAccounts(importedAccounts);
      await wallet.reload();
      setAccountDrafts(createAccountDrafts(importedAccounts));
      showSaveFeedback({
        kind: "success",
        message: "This device's wallet was imported to cloud.",
      });
      setImportStatus("Local wallet copied to cloud. Local data was kept.");
    } catch {
      showSaveFeedback({
        kind: "error",
        message: "This device's wallet could not be imported to cloud.",
      });
      setImportStatus("Import failed. Your cloud wallet was not changed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {saveFeedback ? (
        <div className="pointer-events-none sticky top-4 z-20 flex justify-end">
          <p
            aria-live={saveFeedback.kind === "success" ? "polite" : undefined}
            className={`rounded-md border px-4 py-3 text-sm font-semibold shadow-sm ${
              saveFeedback.kind === "success"
                ? "border-[#b8c8b2] bg-[#eef6ec] text-[#25573f]"
                : "border-[#e0b4b4] bg-[#fff4f4] text-[#8f2d2d]"
            }`}
            role={saveFeedback.kind === "success" ? "status" : "alert"}
          >
            {saveFeedback.message}
          </p>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Wallet
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Manual points wallet
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
          Add, edit, and delete manual points balances. Signed-out wallets stay
          in localStorage; signed-in wallets sync to Firestore for this account.
        </p>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              {walletModeLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#526158]">
              {walletModeMessage}
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
            {wallet.source === "cloud" ? "Cloud sync on" : "Local fallback"}
          </span>
        </div>
        {wallet.error ? (
          <p className="mt-3 text-sm font-medium text-[#8f2d2d]" role="alert">
            {wallet.error}
          </p>
        ) : null}
      </section>

      {hasImportableLocalWallet ? (
        <section className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d4c1d]">
                Local wallet found
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#14211b]">
                Import this device&apos;s wallet to cloud
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d4c1d]">
                This copies {localWallet?.accounts.length ?? 0} local account
                {(localWallet?.accounts.length ?? 0) === 1 ? "" : "s"} into
                your Firestore wallet. Local data stays on this device.
                {accounts.length > 0
                  ? " Importing replaces the current cloud wallet with this device's wallet."
                  : ""}
              </p>
              {importStatus ? (
                <p className="mt-2 text-sm font-medium text-[#5d4c1d]">
                  {importStatus}
                </p>
              ) : null}
            </div>
            <button
              className="w-fit rounded-md bg-[#2f6b4f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImporting || wallet.isLoading}
              onClick={() => {
                void handleImportLocalWallet();
              }}
              type="button"
            >
              {isImporting ? "Importing" : "Import local wallet"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Add account
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              New manual balance
            </h3>
          </div>
          <p className="text-sm text-[#637268]">{addAccountStorageLabel}</p>
        </div>

        <form
          className="mt-5 grid gap-4 md:grid-cols-[1fr_0.6fr_1fr_auto]"
          onSubmit={handleAddAccount}
        >
          <label className="space-y-2 text-sm font-medium text-[#24382d]">
            <span>Program</span>
            <select
              className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
              onChange={handleProgramChange}
              value={selectedProgramId}
            >
              {POINTS_PROGRAMS.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[#24382d]">
            <span>Balance</span>
            <input
              className="w-full rounded-md border border-[#b8c8b2] px-3 py-2 text-sm text-[#14211b]"
              min="0"
              onChange={(event) => {
                setNewBalance(event.target.value);
                setAddError("");
              }}
              placeholder="0"
              type="number"
              value={newBalance}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[#24382d]">
            <span>Notes</span>
            <input
              className="w-full rounded-md border border-[#b8c8b2] px-3 py-2 text-sm text-[#14211b]"
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Optional"
              type="text"
              value={newNotes}
            />
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-md bg-[#2f6b4f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={wallet.isLoading}
              type="submit"
            >
              {wallet.isLoading ? "Loading wallet" : "Add account"}
            </button>
          </div>
        </form>

        {addError ? (
          <p className="mt-3 text-sm font-medium text-[#8f2d2d]">{addError}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Points accounts
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Current wallet
            </h3>
          </div>
          <p className="text-sm text-[#637268]">
            {isLoaded
              ? `${accounts.length} ${wallet.source} account${
                  accounts.length === 1 ? "" : "s"
                }`
              : "Loading wallet"}
          </p>
        </div>

        {isLoaded && accounts.length > 0 ? (
          <div className="mt-5 space-y-4">
            {accounts.map((account) => {
              const draft = accountDrafts[account.id] ?? {
                balance: String(account.balance),
                notes: account.notes ?? "",
              };

              return (
                <article
                  className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                  key={account.id}
                >
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_1fr_auto] md:items-end">
                    <div>
                      <p className="text-sm font-semibold text-[#14211b]">
                        {account.programName}
                      </p>
                      <p className="mt-1 text-xs text-[#637268]">
                        {programTypeLabels[account.programType]} - Last updated{" "}
                        {formatDate(account.lastUpdatedAt)}
                      </p>
                    </div>

                    <label className="space-y-2 text-sm font-medium text-[#24382d]">
                      <span>Balance</span>
                      <input
                        className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
                        min="0"
                        onChange={(event) =>
                          handleDraftBalanceChange(
                            account.id,
                            event.target.value,
                          )
                        }
                        type="number"
                        value={draft.balance}
                      />
                    </label>

                    <div className="text-sm text-[#405147]">
                      <p className="font-medium text-[#24382d]">Current</p>
                      <p className="mt-2 font-semibold text-[#14211b]">
                        {numberFormatter.format(account.balance)}
                      </p>
                    </div>

                    <label className="space-y-2 text-sm font-medium text-[#24382d]">
                      <span>Notes</span>
                      <input
                        className="w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
                        onChange={(event) =>
                          handleDraftNotesChange(account.id, event.target.value)
                        }
                        placeholder="Optional"
                        type="text"
                        value={draft.notes}
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        className="rounded-md bg-[#2f6b4f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={wallet.isLoading}
                        onClick={() => {
                          void handleSaveAccount(account);
                        }}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={wallet.isLoading}
                        onClick={() => {
                          void handleDeleteAccount(account.id);
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editErrors[account.id] ? (
                    <p className="mt-3 text-sm font-medium text-[#8f2d2d]">
                      {editErrors[account.id]}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {isLoaded && accounts.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] p-5 text-sm text-[#526158]">
            No points accounts yet. Add a manual balance above to start the{" "}
            {wallet.source === "cloud" ? "cloud wallet" : "wallet"}.
          </div>
        ) : null}
      </section>
    </div>
  );
}
