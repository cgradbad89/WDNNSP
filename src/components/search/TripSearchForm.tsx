"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import { expandAirportCode } from "@/lib/airports/groups";
import {
  getAirlineMileageAccounts,
  getFlexibleCurrencyAccounts,
  getTotalAirlineMiles,
  getTotalFlexiblePoints,
} from "@/lib/points/totals";
import { saveActiveSearch } from "@/lib/search/activeSearch";
import {
  createSavedSearch,
  deleteSavedSearch,
  loadSavedSearches,
  saveSavedSearches,
} from "@/lib/search/storage";
import {
  hasSearchValidationErrors,
  type SearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import {
  loadWalletAccounts,
  WALLET_ACCOUNTS_CHANGED_EVENT,
} from "@/lib/wallet/storage";
import type { Cabin } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch, TripType } from "@/types/search";

type SearchFormState = {
  name: string;
  origin: string;
  destination: string;
  tripType: TripType;
  departDate: string;
  returnDate: string;
  cabin: Cabin;
  passengers: string;
  maxStops: string;
  flexibleDays: string;
};

const LOCAL_USER_ID = "local-user";
const initialFormState: SearchFormState = {
  name: "Tokyo Spring Trip",
  origin: "WAS",
  destination: "TYO",
  tripType: "round_trip",
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  cabin: "business",
  passengers: "2",
  maxStops: "1",
  flexibleDays: "3",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const cabinLabels: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

function createSeedAccounts(): PointsAccount[] {
  return MOCK_POINTS_ACCOUNTS.map((account) => ({
    ...account,
    userId: LOCAL_USER_ID,
  }));
}

function getWalletAccountsSnapshot(): PointsAccount[] {
  const storedAccounts = loadWalletAccounts();

  return storedAccounts.length > 0 ? storedAccounts : createSeedAccounts();
}

function subscribeToWalletAccounts(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("focus", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("focus", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WALLET_ACCOUNTS_CHANGED_EVENT, onStoreChange);
  };
}

function getWalletAccountsClientSnapshot(): string {
  return JSON.stringify(getWalletAccountsSnapshot());
}

function getWalletAccountsServerSnapshot(): string {
  return JSON.stringify(createSeedAccounts());
}

function parseWalletAccountsSnapshot(snapshot: string): PointsAccount[] {
  try {
    const parsedSnapshot: unknown = JSON.parse(snapshot);

    if (Array.isArray(parsedSnapshot)) {
      return parsedSnapshot as PointsAccount[];
    }
  } catch {
    return createSeedAccounts();
  }

  return createSeedAccounts();
}

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

function normalizeSingleCode(value: string): string[] {
  const normalizedValue = value.trim().toUpperCase();

  if (!normalizedValue) {
    return [];
  }

  return expandAirportCode(normalizedValue, AIRPORT_GROUPS);
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function parseRequiredNumber(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return Number(value);
}

function formatCodes(codes: string[]): string {
  return codes.length > 0 ? codes.join("/") : "Not set";
}

function formatDate(date: string | undefined): string {
  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatTripType(tripType: TripType): string {
  return tripType === "round_trip" ? "Round trip" : "One way";
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

function clearErrorsForField(
  errors: SearchValidationErrors,
  field: keyof SearchFormState,
): SearchValidationErrors {
  const nextErrors = { ...errors };

  if (field === "origin") {
    delete nextErrors.originCodes;
  } else if (field === "destination") {
    delete nextErrors.destinationCodes;
  } else if (field === "name") {
    delete nextErrors.name;
  } else if (field === "departDate") {
    delete nextErrors.departDate;
  } else if (field === "returnDate" || field === "tripType") {
    delete nextErrors.returnDate;
  } else if (field === "passengers") {
    delete nextErrors.passengers;
  } else if (field === "cabin") {
    delete nextErrors.cabin;
  } else if (field === "maxStops") {
    delete nextErrors.maxStops;
  } else if (field === "flexibleDays") {
    delete nextErrors.flexibleDays;
  }

  return nextErrors;
}

export function TripSearchForm(): JSX.Element {
  const router = useRouter();
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [formState, setFormState] =
    useState<SearchFormState>(initialFormState);
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [savedSearchVersion, setSavedSearchVersion] = useState(0);
  const walletAccountsSnapshot = useSyncExternalStore(
    subscribeToWalletAccounts,
    getWalletAccountsClientSnapshot,
    getWalletAccountsServerSnapshot,
  );
  const walletAccounts = useMemo(
    () => parseWalletAccountsSnapshot(walletAccountsSnapshot),
    [walletAccountsSnapshot],
  );
  const originCodes = normalizeSingleCode(formState.origin);
  const destinationCodes = normalizeSingleCode(formState.destination);
  const passengers = parseRequiredNumber(formState.passengers);
  const maxStops = parseOptionalNumber(formState.maxStops);
  const flexibleDays = parseOptionalNumber(formState.flexibleDays);
  const flexibleAccounts = getFlexibleCurrencyAccounts(walletAccounts);
  const airlineAccounts = getAirlineMileageAccounts(walletAccounts);
  const topWalletAccounts = [...walletAccounts]
    .toSorted((firstAccount, secondAccount) => secondAccount.balance - firstAccount.balance)
    .slice(0, 3);
  const savedSearches = useMemo(() => {
    void savedSearchVersion;

    return isLoaded ? loadSavedSearches() : [];
  }, [isLoaded, savedSearchVersion]);

  function updateField<Field extends keyof SearchFormState>(
    field: Field,
    value: SearchFormState[Field],
  ): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setErrors((currentErrors) => clearErrorsForField(currentErrors, field));
    setStatusMessage("");
  }

  function handleTripTypeChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextTripType = event.target.value as TripType;
    updateField("tripType", nextTripType);

    if (nextTripType === "one_way") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        returnDate: undefined,
      }));
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const validationInput = {
      name: formState.name,
      userId: LOCAL_USER_ID,
      originCodes,
      destinationCodes,
      departDate: formState.departDate,
      returnDate:
        formState.tripType === "round_trip"
          ? formState.returnDate || undefined
          : undefined,
      tripType: formState.tripType,
      flexibleDays,
      passengers,
      cabin: formState.cabin,
      maxStops,
      createdAt: "",
    };
    const nextErrors = validateSavedSearchInput(validationInput);

    if (hasSearchValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      setStatusMessage("");
      return;
    }

    const activeSearch = createSavedSearch({
      userId: LOCAL_USER_ID,
      name: formState.name.trim(),
      originCodes,
      destinationCodes,
      departDate: formState.departDate,
      returnDate:
        formState.tripType === "round_trip"
          ? formState.returnDate
          : undefined,
      tripType: formState.tripType,
      flexibleDays,
      passengers,
      cabin: formState.cabin,
      maxStops,
    });

    saveActiveSearch(activeSearch);
    setErrors({});
    setStatusMessage("Search ready. Opening mock results...");
    router.push("/results");
  }

  function handleRunSavedSearch(search: SavedSearch): void {
    saveActiveSearch(search);
    setStatusMessage(`Opening results for "${search.name}".`);
    router.push("/results");
  }

  function handleDeleteSavedSearch(searchId: string): void {
    saveSavedSearches(deleteSavedSearch(savedSearches, searchId));
    setSavedSearchVersion((currentVersion) => currentVersion + 1);
    setStatusMessage("Saved search deleted.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Search
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Run a trip search first
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Enter the trip criteria, run the mock comparison, then save the
              search from results if it is useful.
            </p>
          </div>

          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[380px] sm:grid-cols-2">
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Flexible points
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatNumber(getTotalFlexiblePoints(walletAccounts))}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#637268]">
                {flexibleAccounts.length} transferable account
                {flexibleAccounts.length === 1 ? "" : "s"} ready
              </p>
            </article>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Airline miles
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatNumber(getTotalAirlineMiles(walletAccounts))}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#637268]">
                {airlineAccounts.length} direct airline account
                {airlineAccounts.length === 1 ? "" : "s"} tracked
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.07)] md:p-6"
          onSubmit={handleSearch}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#14211b]">
                Trip search
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#637268]">
                Use one airport code or supported airport group per side.
              </p>
            </div>
            <span className="w-fit rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
              {formState.tripType === "round_trip" ? "Round trip" : "One way"}
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-[#24382d]">
              Trip name
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event) => updateField("name", event.target.value)}
              type="text"
              value={formState.name}
            />
            <FieldError>{errors.name}</FieldError>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                From
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                list="airport-group-options"
                onChange={(event) => updateField("origin", event.target.value)}
                type="text"
                value={formState.origin}
              />
              <FieldError>{errors.originCodes}</FieldError>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">To</span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                list="airport-group-options"
                onChange={(event) =>
                  updateField("destination", event.target.value)
                }
                type="text"
                value={formState.destination}
              />
              <FieldError>{errors.destinationCodes}</FieldError>
            </label>
            <datalist id="airport-group-options">
              {AIRPORT_GROUPS.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Trip type
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                onChange={handleTripTypeChange}
                value={formState.tripType}
              >
                <option value="round_trip">Round trip</option>
                <option value="one_way">One way</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Depart
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                onChange={(event) =>
                  updateField("departDate", event.target.value)
                }
                type="date"
                value={formState.departDate}
              />
              <FieldError>{errors.departDate}</FieldError>
            </label>
            {formState.tripType === "round_trip" ? (
              <label className="block">
                <span className="text-sm font-semibold text-[#24382d]">
                  Return
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:ring-4 focus:ring-[#2f6b4f]/10"
                  onChange={(event) =>
                    updateField("returnDate", event.target.value)
                  }
                  type="date"
                  value={formState.returnDate}
                />
                <FieldError>{errors.returnDate}</FieldError>
              </label>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Cabin
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                onChange={(event) =>
                  updateField("cabin", event.target.value as Cabin)
                }
                value={formState.cabin}
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
              <FieldError>{errors.cabin}</FieldError>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Passengers
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                min="1"
                onChange={(event) =>
                  updateField("passengers", event.target.value)
                }
                type="number"
                value={formState.passengers}
              />
              <FieldError>{errors.passengers}</FieldError>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Max stops
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                min="0"
                onChange={(event) =>
                  updateField("maxStops", event.target.value)
                }
                type="number"
                value={formState.maxStops}
              />
              <FieldError>{errors.maxStops}</FieldError>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Flexibility
              </span>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-3 py-2 focus-within:border-[#2f6b4f] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2f6b4f]/10">
                <span className="text-sm font-semibold text-[#526158]">
                  +/-
                </span>
                <input
                  className="w-full bg-transparent py-1 text-sm font-semibold text-[#14211b] outline-none"
                  min="0"
                  onChange={(event) =>
                    updateField("flexibleDays", event.target.value)
                  }
                  type="number"
                  value={formState.flexibleDays}
                />
                <span className="text-sm font-semibold text-[#526158]">
                  days
                </span>
              </div>
              <FieldError>{errors.flexibleDays}</FieldError>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f]"
              type="submit"
            >
              <SearchIcon className="h-4 w-4" />
              Search
              <ArrowIcon className="h-4 w-4" />
            </button>
            <button
              className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
              onClick={() => {
                setFormState(initialFormState);
                setErrors({});
                setStatusMessage("");
              }}
              type="button"
            >
              Reset defaults
            </button>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-md bg-[#edf3ea] px-4 py-3 text-sm font-semibold text-[#2f6b4f]">
              {statusMessage}
            </p>
          ) : null}
        </form>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Wallet readiness
            </p>
            <div className="mt-4 space-y-3">
              {topWalletAccounts.map((account) => (
                <article
                  className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                  key={account.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#24382d]">
                        {account.programName}
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-[#637268]">
                        {account.programType === "credit_card"
                          ? "Transferable points"
                          : "Direct airline miles"}
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#2f6b4f]">
                      Ready
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
                    {formatNumber(account.balance)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Saved searches
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Run a previous trip search
            </h3>
          </div>
          <p className="text-sm text-[#637268]">
            {isLoaded ? `${savedSearches.length} saved` : "Loading"}
          </p>
        </div>

        {isLoaded && savedSearches.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {savedSearches.map((search) => (
              <article
                className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                key={search.id}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#24382d]">
                      {search.name}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
                      {formatCodes(search.originCodes)} to{" "}
                      {formatCodes(search.destinationCodes)}
                    </p>
                  </div>

                  <dl className="grid gap-3 text-sm leading-6 text-[#526158] sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[#24382d]">
                        Trip type
                      </dt>
                      <dd>{formatTripType(search.tripType)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#24382d]">Cabin</dt>
                      <dd>{cabinLabels[search.cabin]}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#24382d]">Depart</dt>
                      <dd>{formatDate(search.departDate)}</dd>
                    </div>
                    {search.tripType === "round_trip" ? (
                      <div>
                        <dt className="font-semibold text-[#24382d]">
                          Return
                        </dt>
                        <dd>{formatDate(search.returnDate)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-semibold text-[#24382d]">
                        Passengers
                      </dt>
                      <dd>{formatNumber(search.passengers)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#25573f]"
                      onClick={() => handleRunSavedSearch(search)}
                      type="button"
                    >
                      Run search
                      <ArrowIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md border border-[#b8c8b2] px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-white"
                      onClick={() => handleDeleteSavedSearch(search.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {isLoaded && savedSearches.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] bg-[#f7faf6] p-5 text-sm leading-6 text-[#526158]">
            No saved searches yet. Run a new search above, review the results,
            then save useful trips from the Results page.
          </div>
        ) : null}
      </section>
    </div>
  );
}
