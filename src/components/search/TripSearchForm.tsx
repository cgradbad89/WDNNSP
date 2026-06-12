"use client";

import type { FormEvent, JSX } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { useAuth } from "@/components/auth/AuthProvider";
import { SavedSearchesList } from "@/components/search/SavedSearchesList";
import { SearchCabinField } from "@/components/search/SearchCabinField";
import { SearchDateFields } from "@/components/search/SearchDateFields";
import { SearchRouteFields } from "@/components/search/SearchRouteFields";
import { SearchSubmitActions } from "@/components/search/SearchSubmitActions";
import { SearchTravelersFields } from "@/components/search/SearchTravelersFields";
import { expandAirportCode } from "@/lib/airports/groups";
import {
  getAirlineMileageAccounts,
  getFlexibleCurrencyAccounts,
  getTotalAirlineMiles,
  getTotalFlexiblePoints,
} from "@/lib/points/totals";
import {
  createSavedSearch,
  hasStoredSavedSearches,
  loadSavedSearches,
  SAVED_SEARCHES_CHANGED_EVENT,
} from "@/lib/search/storage";
import type { SavedSearchesLoadResult } from "@/lib/search/repository";
import { useSearchData } from "@/lib/search/useSearchData";
import {
  getSavedSearchSupportStatus,
  hasSearchValidationErrors,
  type SearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import { useWalletAccounts } from "@/lib/wallet/useWalletAccounts";
import type { Cabin } from "@/types/flights";
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
const emptyLocalSavedSearchesSnapshot: SavedSearchesLoadResult = {
  searches: [],
  hasStoredValue: false,
  source: "local",
};

function getLocalSavedSearchImportSnapshot(): SavedSearchesLoadResult {
  return {
    searches: loadSavedSearches(),
    hasStoredValue: hasStoredSavedSearches(),
    source: "local",
  };
}

function subscribeToLocalSavedSearchImport(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const timeoutId = window.setTimeout(onStoreChange, 0);

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SAVED_SEARCHES_CHANGED_EVENT, onStoreChange);

  return () => {
    window.clearTimeout(timeoutId);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SAVED_SEARCHES_CHANGED_EVENT, onStoreChange);
  };
}

function getLocalSavedSearchImportClientSnapshot(): string {
  return JSON.stringify(getLocalSavedSearchImportSnapshot());
}

function getLocalSavedSearchImportServerSnapshot(): string {
  return JSON.stringify(emptyLocalSavedSearchesSnapshot);
}

function parseLocalSavedSearchImportSnapshot(
  snapshot: string,
): SavedSearchesLoadResult {
  try {
    const parsedSnapshot: unknown = JSON.parse(snapshot);

    if (
      typeof parsedSnapshot === "object" &&
      parsedSnapshot !== null &&
      !Array.isArray(parsedSnapshot) &&
      Array.isArray((parsedSnapshot as SavedSearchesLoadResult).searches) &&
      typeof (parsedSnapshot as SavedSearchesLoadResult).hasStoredValue ===
        "boolean" &&
      (parsedSnapshot as SavedSearchesLoadResult).source === "local"
    ) {
      return parsedSnapshot as SavedSearchesLoadResult;
    }
  } catch {
    return emptyLocalSavedSearchesSnapshot;
  }

  return emptyLocalSavedSearchesSnapshot;
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

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function FieldError({ children }: { children?: string }): JSX.Element | null {
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

function mergeLocalSavedSearchesForImport({
  cloudSearches,
  localSearches,
  uid,
}: {
  cloudSearches: SavedSearch[];
  localSearches: SavedSearch[];
  uid: string;
}): {
  importedCount: number;
  nextSearches: SavedSearch[];
} {
  const existingCloudIds = new Set(cloudSearches.map((search) => search.id));
  const importedSearches = localSearches
    .filter((search) => !existingCloudIds.has(search.id))
    .map((search) => ({
      ...search,
      userId: uid,
    }));

  return {
    importedCount: importedSearches.length,
    nextSearches: [...importedSearches, ...cloudSearches],
  };
}

export function TripSearchForm(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const wallet = useWalletAccounts({ seedLocalAccounts: true });
  const searchData = useSearchData();
  const localSavedSearchSnapshot = useSyncExternalStore(
    subscribeToLocalSavedSearchImport,
    getLocalSavedSearchImportClientSnapshot,
    getLocalSavedSearchImportServerSnapshot,
  );
  const localSavedSearches = user
    ? parseLocalSavedSearchImportSnapshot(localSavedSearchSnapshot)
    : null;
  const [formState, setFormState] =
    useState<SearchFormState>(initialFormState);
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const walletAccounts = wallet.accounts;
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
  const isSearchLoaded = !searchData.isLoading;
  const savedSearches = searchData.savedSearches;
  const savedSearchItems = useMemo(
    () =>
      savedSearches.map((search) => ({
        search,
        supportStatus: getSavedSearchSupportStatus(search),
      })),
    [savedSearches],
  );
  const hasImportableLocalSavedSearches =
    Boolean(user) && (localSavedSearches?.searches.length ?? 0) > 0;
  const searchModeLabel =
    searchData.source === "cloud" ? "Cloud searches" : "Browser searches";
  const searchModeMessage = user
    ? "Search sync is on for this account. Saved searches and active results searches save to Firestore."
    : "Searches save in this browser. Sign in to sync saved searches and active results searches across devices.";

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

  function handleTripTypeChange(nextTripType: TripType): void {
    updateField("tripType", nextTripType);

    if (nextTripType === "one_way") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        returnDate: undefined,
      }));
    }
  }

  async function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
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

    try {
      await searchData.saveActiveSearch(activeSearch);
      setErrors({});
      setStatusMessage(
        searchData.source === "cloud"
          ? "Cloud search ready. Opening mock results..."
          : "Search ready. Opening mock results...",
      );
      router.push("/results");
    } catch {
      setStatusMessage(
        searchData.source === "cloud"
          ? "Cloud active search could not be saved."
          : "Active search could not be saved.",
      );
    }
  }

  async function handleRunSavedSearch(search: SavedSearch): Promise<void> {
    const supportStatus = getSavedSearchSupportStatus(search);

    if (!supportStatus.isSupported) {
      setStatusMessage(supportStatus.message ?? "Needs update before running.");
      return;
    }

    try {
      await searchData.saveActiveSearch(search);
      setStatusMessage(`Opening results for "${search.name}".`);
      router.push("/results");
    } catch {
      setStatusMessage(
        searchData.source === "cloud"
          ? "Cloud active search could not be saved."
          : "Active search could not be saved.",
      );
    }
  }

  async function handleDeleteSavedSearch(searchId: string): Promise<void> {
    try {
      await searchData.deleteSavedSearch(searchId);
      setStatusMessage(
        searchData.source === "cloud"
          ? "Cloud saved search deleted."
          : "Saved search deleted.",
      );
    } catch {
      setStatusMessage(
        searchData.source === "cloud"
          ? "Cloud saved search could not be deleted."
          : "Saved search could not be deleted.",
      );
    }
  }

  function handleResetDefaults(): void {
    setFormState(initialFormState);
    setErrors({});
    setStatusMessage("");
  }

  async function handleImportLocalSavedSearches(): Promise<void> {
    if (!user || !localSavedSearches || localSavedSearches.searches.length === 0) {
      return;
    }

    setIsImporting(true);
    setStatusMessage("");

    try {
      const { importedCount, nextSearches } = mergeLocalSavedSearchesForImport({
        cloudSearches: searchData.savedSearches,
        localSearches: localSavedSearches.searches,
        uid: user.uid,
      });

      if (importedCount === 0) {
        setStatusMessage("This device's saved searches already exist in cloud.");
        return;
      }

      await searchData.saveSavedSearches(nextSearches);
      setStatusMessage(
        `${importedCount} saved search${
          importedCount === 1 ? "" : "es"
        } copied to cloud. Local data was kept.`,
      );
    } catch {
      setStatusMessage(
        "This device's saved searches could not be imported to cloud.",
      );
    } finally {
      setIsImporting(false);
    }
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
                {wallet.isLoading
                  ? "Loading"
                  : formatNumber(getTotalFlexiblePoints(walletAccounts))}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#637268]">
                {wallet.source === "cloud" ? "Cloud" : "Local"} wallet -{" "}
                {flexibleAccounts.length} transferable account
                {flexibleAccounts.length === 1 ? "" : "s"} ready
              </p>
            </article>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Airline miles
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {wallet.isLoading
                  ? "Loading"
                  : formatNumber(getTotalAirlineMiles(walletAccounts))}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#637268]">
                {airlineAccounts.length} direct airline account
                {airlineAccounts.length === 1 ? "" : "s"} tracked
              </p>
            </article>
          </div>
        </div>
      </section>

      {wallet.error ? (
        <section
          className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5 text-sm leading-6 text-[#5d4c1d]"
          role="alert"
        >
          <p className="font-semibold text-[#14211b]">Wallet warning</p>
          <p className="mt-1">{wallet.error}</p>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              {searchModeLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#526158]">
              {searchModeMessage}
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
            {searchData.source === "cloud" ? "Cloud sync on" : "Local fallback"}
          </span>
        </div>

        {searchData.error ? (
          <p
            className="mt-4 rounded-md border border-[#ead99d] bg-[#fff9df] px-4 py-3 text-sm leading-6 text-[#5d4c1d]"
            role="alert"
          >
            {searchData.error}
          </p>
        ) : null}

        {hasImportableLocalSavedSearches ? (
          <div className="mt-4 rounded-md border border-[#b8c8b2] bg-[#f7faf6] p-4 text-sm leading-6 text-[#526158]">
            <p className="font-semibold text-[#24382d]">
              This device has local saved searches.
            </p>
            <p className="mt-1">
              Import copies them to cloud without deleting local data.
              Unsupported searches are copied and remain marked as needing
              update.
            </p>
            <button
              className="mt-3 rounded-md bg-[#2f6b4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImporting || searchData.isLoading}
              onClick={() => {
                void handleImportLocalSavedSearches();
              }}
              type="button"
            >
              {isImporting
                ? "Importing..."
                : "Import this device's saved searches to cloud"}
            </button>
          </div>
        ) : null}
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

          <SearchRouteFields
            destination={formState.destination}
            destinationError={errors.destinationCodes}
            onChangeDestination={(value) => updateField("destination", value)}
            onChangeOrigin={(value) => updateField("origin", value)}
            origin={formState.origin}
            originError={errors.originCodes}
          />

          <SearchDateFields
            departDate={formState.departDate}
            departDateError={errors.departDate}
            onChangeDepartDate={(value) => updateField("departDate", value)}
            onChangeReturnDate={(value) => updateField("returnDate", value)}
            onChangeTripType={handleTripTypeChange}
            returnDate={formState.returnDate}
            returnDateError={errors.returnDate}
            tripType={formState.tripType}
          />

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <SearchCabinField
              error={errors.cabin}
              onChange={(value) => updateField("cabin", value)}
              value={formState.cabin}
            />
            <SearchTravelersFields
              flexibleDays={formState.flexibleDays}
              flexibleDaysError={errors.flexibleDays}
              maxStops={formState.maxStops}
              maxStopsError={errors.maxStops}
              onChangeFlexibleDays={(value) =>
                updateField("flexibleDays", value)
              }
              onChangeMaxStops={(value) => updateField("maxStops", value)}
              onChangePassengers={(value) => updateField("passengers", value)}
              passengers={formState.passengers}
              passengersError={errors.passengers}
            />
          </div>

          <SearchSubmitActions
            onReset={handleResetDefaults}
            statusMessage={statusMessage}
          />
        </form>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Wallet readiness
            </p>
            <div className="mt-4 space-y-3">
              {wallet.isLoading ? (
                <div className="rounded-md border border-dashed border-[#b8c8b2] p-4 text-sm text-[#637268]">
                  Loading wallet balances.
                </div>
              ) : null}

              {!wallet.isLoading && topWalletAccounts.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#b8c8b2] p-4 text-sm text-[#637268]">
                  No wallet balances available for this search yet.
                </div>
              ) : null}

              {!wallet.isLoading && topWalletAccounts.map((account) => (
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

      <SavedSearchesList
        isLoaded={isSearchLoaded}
        onDeleteSearch={handleDeleteSavedSearch}
        onRunSearch={handleRunSavedSearch}
        savedSearches={savedSearchItems}
      />
    </div>
  );
}
