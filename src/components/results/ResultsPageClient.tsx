"use client";

import type { FormEvent, JSX, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BestRecommendationCard } from "@/components/results/BestRecommendationCard";
import { CashBenchmarkCard } from "@/components/results/CashBenchmarkCard";
import {
  EditSearchDrawer,
  type EditSearchFormState,
} from "@/components/results/EditSearchDrawer";
import {
  RankedAwardOptions,
  type RankedAwardOptionViewModel,
} from "@/components/results/RankedAwardOptions";
import { ResultsFilters as ResultsFiltersPanel } from "@/components/results/ResultsFilters";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import {
  RouteDetailsDrawer,
  type RouteDetailsDrawerState,
} from "@/components/results/RouteDetailsDrawer";
import { SearchSummaryStrip } from "@/components/results/SearchSummaryStrip";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { expandAirportCode } from "@/lib/airports/groups";
import { mockFlightSearchProviderSet } from "@/lib/providers/mock";
import {
  searchFlightsWithProviders,
  type FlightSearchResults,
} from "@/lib/providers/search";
import {
  applyResultsFilters,
  type ResultsFilters as ResultsFiltersState,
} from "@/lib/results/filters";
import { selectResultsSearch } from "@/lib/results/searchSelection";
import { getTransferPathDisplays } from "@/lib/results/transferPaths";
import { scoreAwardOptions } from "@/lib/scoring/recommendations";
import { loadActiveSearch, saveActiveSearch } from "@/lib/search/activeSearch";
import { loadSavedSearches, saveSavedSearches } from "@/lib/search/storage";
import {
  hasSearchValidationErrors,
  type SearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import {
  hasStoredWalletAccounts,
  loadWalletAccounts,
  WALLET_ACCOUNTS_CHANGED_EVENT,
} from "@/lib/wallet/storage";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch } from "@/types/search";

const LOCAL_USER_ID = "local-user";
const EMPTY_CASH_OPTIONS: CashFlightOption[] = [];
const EMPTY_AWARD_OPTIONS: AwardFlightOption[] = [];

const defaultFilters: ResultsFiltersState = {
  bookableWithAnyPoints: false,
  bookableWithTransferablePoints: false,
  maxOneStop: false,
  hideHighFeeAwards: false,
  businessCabinOnly: false,
};

const fallbackSavedSearch: SavedSearch = {
  id: "mock-tokyo-spring-trip",
  userId: LOCAL_USER_ID,
  name: "Tokyo Spring Trip",
  originCodes: ["WAS"],
  destinationCodes: ["TYO"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  flexibleDays: 3,
  passengers: 2,
  cabin: "business",
  maxStops: 1,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

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

function subscribeToHydration(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const timeoutId = window.setTimeout(onStoreChange, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
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

function collapseAirportGroup(codes: string[]): string | undefined {
  const normalizedCodes = codes.map((code) => code.trim().toUpperCase());

  return AIRPORT_GROUPS.find((group) => {
    if (group.airportCodes.length !== normalizedCodes.length) {
      return false;
    }

    return group.airportCodes.every((code) => normalizedCodes.includes(code));
  })?.code;
}

function formatEditableCodes(codes: string[]): string {
  return collapseAirportGroup(codes) ?? codes[0] ?? "";
}

function getDirectProgramBalance(
  accounts: PointsAccount[],
  airlineProgram: string,
): number {
  return accounts
    .filter(
      (account) =>
        account.programType === "airline" &&
        account.programName.trim().toLowerCase() ===
          airlineProgram.trim().toLowerCase(),
    )
    .reduce((total, account) => total + account.balance, 0);
}

function createEditFormState(search: SavedSearch): EditSearchFormState {
  return {
    name: search.name,
    origin: formatEditableCodes(search.originCodes),
    destination: formatEditableCodes(search.destinationCodes),
    tripType: search.tripType,
    departDate: search.departDate,
    returnDate: search.returnDate ?? "",
    cabin: search.cabin,
    passengers: String(search.passengers),
    maxStops: search.maxStops === undefined ? "" : String(search.maxStops),
    flexibleDays:
      search.flexibleDays === undefined ? "" : String(search.flexibleDays),
  };
}

function getSavedSearchKey(search: SavedSearch): string {
  return [
    search.name.trim().toLowerCase(),
    search.originCodes.join(","),
    search.destinationCodes.join(","),
    search.departDate,
    search.returnDate ?? "",
    search.tripType,
    search.cabin,
    search.passengers,
  ].join("|");
}

function isDuplicateSearch(
  leftSearch: SavedSearch,
  rightSearch: SavedSearch,
): boolean {
  return (
    leftSearch.id === rightSearch.id ||
    getSavedSearchKey(leftSearch) === getSavedSearchKey(rightSearch)
  );
}

function clearErrorsForField(
  errors: SearchValidationErrors,
  field: keyof EditSearchFormState,
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

export function ResultsPageClient(): JSX.Element {
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const walletAccountsSnapshot = useSyncExternalStore(
    subscribeToWalletAccounts,
    getWalletAccountsClientSnapshot,
    getWalletAccountsServerSnapshot,
  );
  const accounts = useMemo(
    () => parseWalletAccountsSnapshot(walletAccountsSnapshot),
    [walletAccountsSnapshot],
  );
  const [savedSearchVersion, setSavedSearchVersion] = useState(0);
  const savedSearches = useMemo(() => {
    void savedSearchVersion;

    return isLoaded ? loadSavedSearches() : [];
  }, [isLoaded, savedSearchVersion]);
  const activeSearch = useMemo(
    () => (isLoaded ? loadActiveSearch() : undefined),
    [isLoaded],
  );
  const baseSelectedSearch = useMemo(
    () =>
      selectResultsSearch(activeSearch, savedSearches, fallbackSavedSearch),
    [activeSearch, savedSearches],
  );
  const [selectedSearchOverride, setSelectedSearchOverride] =
    useState<SavedSearch>();
  const selectedSearch = selectedSearchOverride ?? baseSelectedSearch;
  const [filters, setFilters] =
    useState<ResultsFiltersState>(defaultFilters);
  const [saveStatus, setSaveStatus] = useState("");
  const [editFormState, setEditFormState] = useState<EditSearchFormState>(
    createEditFormState(fallbackSavedSearch),
  );
  const [editErrors, setEditErrors] = useState<SearchValidationErrors>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [routeModal, setRouteModal] = useState<RouteDetailsDrawerState>();
  const [flightSearchState, setFlightSearchState] = useState<{
    results: FlightSearchResults;
    searchId: string;
  }>();
  const [providerError, setProviderError] = useState<{
    message: string;
    searchId: string;
  }>();
  const modalTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isCurrent = true;

    searchFlightsWithProviders(selectedSearch, mockFlightSearchProviderSet)
      .then((results) => {
        if (isCurrent) {
          setProviderError(undefined);
          setFlightSearchState({
            results,
            searchId: selectedSearch.id,
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setProviderError({
            message: "Mock flight results could not be loaded.",
            searchId: selectedSearch.id,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSearch]);

  const flightSearchResults =
    flightSearchState?.searchId === selectedSearch.id
      ? flightSearchState.results
      : undefined;
  const currentProviderError =
    providerError?.searchId === selectedSearch.id ? providerError.message : "";
  const cashOptions = flightSearchResults?.cashOptions ?? EMPTY_CASH_OPTIONS;
  const cashOption = cashOptions[0];
  const awardOptions = flightSearchResults?.awardOptions ?? EMPTY_AWARD_OPTIONS;
  const recommendationResults = useMemo(
    () =>
      scoreAwardOptions(
        awardOptions,
        cashOption,
        accounts,
        TRANSFER_PARTNERS,
      ),
    [accounts, awardOptions, cashOption],
  );
  const transferPathsByOptionId = useMemo(() => {
    const entries = recommendationResults.rankedAwardOptions.map((option) => [
      option.id,
      getTransferPathDisplays(
        option.airlineProgram,
        option.pointsRequired,
        accounts,
        TRANSFER_PARTNERS,
      ),
    ] as const);

    return new Map(entries);
  }, [accounts, recommendationResults.rankedAwardOptions]);
  const decoratedAwardOptions = useMemo(
    () =>
      recommendationResults.rankedAwardOptions.map((option) => {
        const transferPaths = transferPathsByOptionId.get(option.id) ?? [];

        return {
          ...option,
          sufficientTransferPathCount: transferPaths.filter(
            (path) => path.isSufficient,
          ).length,
        };
      }),
    [recommendationResults.rankedAwardOptions, transferPathsByOptionId],
  );
  const filteredAwardOptions = useMemo(
    () => applyResultsFilters(decoratedAwardOptions, filters),
    [decoratedAwardOptions, filters],
  );
  const bestAwardOption =
    filteredAwardOptions.find(
      (option) => option.recommendationLabel === "best_overall",
    ) ?? filteredAwardOptions[0];
  const rankedAwardOptionViewModels = useMemo<RankedAwardOptionViewModel[]>(
    () =>
      filteredAwardOptions.map((option) => ({
        directBalance: getDirectProgramBalance(
          accounts,
          option.airlineProgram,
        ),
        option,
        transferPaths: transferPathsByOptionId.get(option.id) ?? [],
      })),
    [accounts, filteredAwardOptions, transferPathsByOptionId],
  );

  function saveModalTrigger(trigger?: HTMLElement | null): void {
    if (trigger) {
      modalTriggerRef.current = trigger;
      return;
    }

    modalTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }

  function restoreModalTriggerFocus(): void {
    const trigger = modalTriggerRef.current;
    modalTriggerRef.current = null;

    if (!trigger) {
      return;
    }

    window.setTimeout(() => {
      trigger.focus();
    }, 0);
  }

  function handleSaveSearch(): void {
    const nextSearch: SavedSearch = {
      ...selectedSearch,
      updatedAt: new Date().toISOString(),
    };
    const currentSavedSearches = isLoaded ? loadSavedSearches() : savedSearches;
    const nextSavedSearches = [
      nextSearch,
      ...currentSavedSearches.filter(
        (savedSearch) => !isDuplicateSearch(savedSearch, nextSearch),
      ),
    ];

    saveSavedSearches(nextSavedSearches);
    setSavedSearchVersion((currentVersion) => currentVersion + 1);
    setSaveStatus(`Saved "${nextSearch.name}" locally.`);
  }

  function handleOpenEdit(event: MouseEvent<HTMLButtonElement>): void {
    saveModalTrigger(event.currentTarget);
    setEditFormState(createEditFormState(selectedSearch));
    setEditErrors({});
    setSaveStatus("");
    setIsEditOpen(true);
  }

  function handleCloseEdit(): void {
    setIsEditOpen(false);
    restoreModalTriggerFocus();
  }

  function handleOpenRouteDetails(
    nextRouteModal: RouteDetailsDrawerState,
    trigger: HTMLElement,
  ): void {
    saveModalTrigger(trigger);
    setRouteModal(nextRouteModal);
  }

  function handleCloseRouteDetails(): void {
    setRouteModal(undefined);
    restoreModalTriggerFocus();
  }

  function updateEditField<Field extends keyof EditSearchFormState>(
    field: Field,
    value: EditSearchFormState[Field],
  ): void {
    setEditFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setEditErrors((currentErrors) => clearErrorsForField(currentErrors, field));
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const originCodes = normalizeSingleCode(editFormState.origin);
    const destinationCodes = normalizeSingleCode(editFormState.destination);
    const passengers = parseRequiredNumber(editFormState.passengers);
    const maxStops = parseOptionalNumber(editFormState.maxStops);
    const flexibleDays = parseOptionalNumber(editFormState.flexibleDays);
    const validationInput = {
      name: editFormState.name,
      userId: LOCAL_USER_ID,
      originCodes,
      destinationCodes,
      departDate: editFormState.departDate,
      returnDate:
        editFormState.tripType === "round_trip"
          ? editFormState.returnDate || undefined
          : undefined,
      tripType: editFormState.tripType,
      flexibleDays,
      passengers,
      cabin: editFormState.cabin,
      maxStops,
      createdAt: selectedSearch.createdAt,
    };
    const nextErrors = validateSavedSearchInput(validationInput);

    if (hasSearchValidationErrors(nextErrors)) {
      setEditErrors(nextErrors);
      return;
    }

    const updatedSearch: SavedSearch = {
      ...selectedSearch,
      name: editFormState.name.trim(),
      originCodes,
      destinationCodes,
      departDate: editFormState.departDate,
      returnDate:
        editFormState.tripType === "round_trip"
          ? editFormState.returnDate
          : undefined,
      tripType: editFormState.tripType,
      flexibleDays,
      passengers,
      cabin: editFormState.cabin,
      maxStops,
      updatedAt: new Date().toISOString(),
    };

    saveActiveSearch(updatedSearch);
    setSelectedSearchOverride(updatedSearch);
    setEditFormState(createEditFormState(updatedSearch));
    setEditErrors({});
    setIsEditOpen(false);
    restoreModalTriggerFocus();
    setSaveStatus("Active search updated.");
  }

  function handleChangeFilter(
    filter: keyof ResultsFiltersState,
    value: boolean,
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filter]: value,
    }));
  }

  if (currentProviderError) {
    return (
      <div className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d4c1d]">
          Results
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
          Mock results could not load
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5d4c1d]">
          {currentProviderError} Try running the search again.
        </p>
      </div>
    );
  }

  if (!flightSearchResults) {
    return (
      <div className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Results
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
          Loading mock comparison
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#637268]">
          Cash and award providers are preparing results for{" "}
          {selectedSearch.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultsHeader
        bestAwardOption={bestAwardOption}
        cashOption={cashOption}
        selectedSearchName={selectedSearch.name}
      />

      <SearchSummaryStrip
        onEdit={handleOpenEdit}
        onSave={handleSaveSearch}
        saveStatus={saveStatus}
        search={selectedSearch}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <BestRecommendationCard
            bestAwardOption={bestAwardOption}
            cashBenchmark={cashOption?.cashPriceUsd ?? 0}
          />

          <CashBenchmarkCard
            cashOption={recommendationResults.cashOption}
            passengers={selectedSearch.passengers}
          />

          <RankedAwardOptions
            awardOptions={rankedAwardOptionViewModels}
            cashOption={recommendationResults.cashOption}
            onViewRoute={handleOpenRouteDetails}
            totalAwardOptionCount={decoratedAwardOptions.length}
          />
        </div>

        <ResultsFiltersPanel
          filters={filters}
          onChangeFilter={handleChangeFilter}
        />
      </section>

      {isEditOpen ? (
        <EditSearchDrawer
          errors={editErrors}
          formState={editFormState}
          onChangeField={updateEditField}
          onClose={handleCloseEdit}
          onSubmit={handleEditSubmit}
        />
      ) : null}

      <RouteDetailsDrawer
        modal={routeModal}
        onClose={handleCloseRouteDetails}
      />
    </div>
  );
}
