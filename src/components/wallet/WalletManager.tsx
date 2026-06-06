"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useReducer, useState, useSyncExternalStore } from "react";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import { POINTS_PROGRAMS } from "@/data/pointsPrograms";
import {
  createWalletAccount,
  deleteWalletAccount,
  hasStoredWalletAccounts,
  loadWalletAccounts,
  saveWalletAccounts,
  updateWalletAccount,
} from "@/lib/wallet/storage";
import type { PointsAccount } from "@/types/points";

type AccountDraft = {
  balance: string;
  notes: string;
};

const LOCAL_USER_ID = "local-user";
const numberFormatter = new Intl.NumberFormat("en-US");
const programTypeLabels = {
  airline: "Airline miles",
  credit_card: "Flexible points",
  hotel: "Hotel points",
} as const;

function formatDate(date: string): string {
  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(normalizedDate));
}

function createSeedAccounts(): PointsAccount[] {
  return MOCK_POINTS_ACCOUNTS.map((account) => ({
    ...account,
    userId: LOCAL_USER_ID,
  }));
}

function getWalletAccountsSnapshot(): PointsAccount[] {
  return hasStoredWalletAccounts()
    ? loadWalletAccounts()
    : createSeedAccounts();
}

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
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

export function WalletManager(): JSX.Element {
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [, refreshWalletSnapshot] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const accounts = isLoaded ? getWalletAccountsSnapshot() : [];
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

  function persistAccounts(nextAccounts: PointsAccount[]): void {
    setAccountDrafts(createAccountDrafts(nextAccounts));
    saveWalletAccounts(nextAccounts);
    refreshWalletSnapshot();
  }

  function handleProgramChange(event: ChangeEvent<HTMLSelectElement>): void {
    setSelectedProgramId(event.target.value);
    setAddError("");
  }

  function handleAddAccount(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

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
      userId: LOCAL_USER_ID,
      programId: selectedProgram.id,
      programName: selectedProgram.name,
      programType: selectedProgram.type,
      balance: parsedBalance,
      notes: newNotes.trim() === "" ? undefined : newNotes.trim(),
    });

    persistAccounts([...accounts, nextAccount]);
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

  function handleSaveAccount(account: PointsAccount): void {
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

    persistAccounts(nextAccounts);
    setEditErrors((currentErrors) => ({
      ...currentErrors,
      [account.id]: "",
    }));
  }

  function handleDeleteAccount(accountId: string): void {
    const nextAccounts = deleteWalletAccount(accounts, accountId);

    persistAccounts(nextAccounts);
    setEditErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      delete remainingErrors[accountId];
      return remainingErrors;
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Wallet
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Manual points wallet
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
          Add, edit, and delete manual points balances in this browser. These
          accounts are saved in localStorage for now; Firebase, account syncing,
          and live loyalty connections are intentionally not implemented here.
        </p>
      </section>

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
          <p className="text-sm text-[#637268]">Saved locally in this browser</p>
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
              className="w-full rounded-md bg-[#2f6b4f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25573f]"
              type="submit"
            >
              Add account
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
            {isLoaded ? `${accounts.length} accounts` : "Loading wallet"}
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
                        className="rounded-md bg-[#2f6b4f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#25573f]"
                        onClick={() => handleSaveAccount(account)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] hover:bg-white"
                        onClick={() => handleDeleteAccount(account.id)}
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
            No points accounts yet. Add a manual balance above to start the
            wallet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
