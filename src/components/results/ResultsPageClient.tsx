"use client";

import type { FormEvent, JSX, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BestRecommendationCard } from "@/components/results/BestRecommendationCard";
import { CashBenchmarkCard } from "@/components/results/CashBenchmarkCard";
import {
  EditSearchDrawer,
  type EditSearchFormState,
} from "@/components/results/EditSearchDrawer";
import { NoProviderResultsState } from "@/components/results/NoProviderResultsState";
import { ProviderMessagesList } from "@/components/results/ProviderMessagesList";
import { ProviderSourceNote } from "@/components/results/ProviderSourceNote";
import { ProviderStatusBanner } from "@/components/results/ProviderStatusBanner";
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
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { expandAirportCode } from "@/lib/airports/groups";
import { getFlightSearchDisplayState } from "@/lib/providers/display";
import { mockFlightSearchProviderSet } from "@/lib/providers/mock";
import { searchFlightsWithProviders } from "@/lib/providers/search";
import type { FlightSearchEnvelope } from "@/lib/providers/types";
import {
  applyResultsFilters,
  type ResultsFilters as ResultsFiltersState,
} from "@/lib/results/filters";
import { selectResultsSearch } from "@/lib/results/searchSelection";
import { getTransferPathDisplays } from "@/lib/results/transferPaths";
import { scoreAwardOptions } from "@/lib/scoring/recommendations";
import { useSearchData } from "@/lib/search/useSearchData";
import {
  hasSearchValidationErrors,
  type SearchValidationErrors,
  validateSavedSearchInput,
} from "@/lib/search/validation";
import { useWalletAccounts } from "@/lib/wallet/useWalletAccounts";
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
  const wallet = useWalletAccounts({ seedLocalAccounts: true });
  const searchData = useSearchData();
  const accounts = wallet.accounts;
  const savedSearches = searchData.savedSearches;
  const activeSearch = searchData.activeSearch ?? undefined;
  const baseSelectedSearch = useMemo(
    () =>
      selectResultsSearch(activeSearch, savedSearches, fallbackSavedSearch),
    [activeSearch, savedSearches],
  );
  const selectedSearchBaseKey = [
    searchData.source,
    baseSelectedSearch.id,
    baseSelectedSearch.updatedAt,
  ].join(":");
  const [selectedSearchOverride, setSelectedSearchOverride] =
    useState<{ baseKey: string; search: SavedSearch }>();
  const selectedSearch =
    selectedSearchOverride?.baseKey === selectedSearchBaseKey
      ? selectedSearchOverride.search
      : baseSelectedSearch;
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
    results: FlightSearchEnvelope;
    searchId: string;
  }>();
  const [providerError, setProviderError] = useState<{
    message: string;
    searchId: string;
  }>();
  const modalTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (searchData.isLoading) {
      return;
    }

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
  }, [searchData.isLoading, selectedSearch]);

  const flightSearchResults =
    flightSearchState?.searchId === selectedSearch.id
      ? flightSearchState.results
      : undefined;
  const currentProviderError =
    providerError?.searchId === selectedSearch.id ? providerError.message : "";
  const providerDisplay = flightSearchResults
    ? getFlightSearchDisplayState(flightSearchResults)
    : undefined;
  const cashOptions = flightSearchResults?.cash.data ?? EMPTY_CASH_OPTIONS;
  const cashOption = cashOptions[0];
  const awardOptions =
    flightSearchResults?.awards.data ?? EMPTY_AWARD_OPTIONS;
  const hasCashResults = providerDisplay?.hasCashResults ?? false;
  const hasAwardResults = providerDisplay?.hasAwardResults ?? false;
  const hasAnyProviderResults = hasCashResults || hasAwardResults;
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
    hasAwardResults
      ? (filteredAwardOptions.find(
          (option) => option.recommendationLabel === "best_overall",
        ) ?? filteredAwardOptions[0])
      : undefined;
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

  async function handleSaveSearch(): Promise<void> {
    const nextSearch: SavedSearch = {
      ...selectedSearch,
      updatedAt: new Date().toISOString(),
    };
    const nextSavedSearches = [
      nextSearch,
      ...savedSearches.filter(
        (savedSearch) => !isDuplicateSearch(savedSearch, nextSearch),
      ),
    ];

    try {
      await searchData.saveSavedSearches(nextSavedSearches);
      setSaveStatus(
        searchData.source === "cloud"
          ? `Saved "${nextSearch.name}" to cloud.`
          : `Saved "${nextSearch.name}" locally.`,
      );
    } catch {
      setSaveStatus(
        searchData.source === "cloud"
          ? "Cloud saved search could not be saved."
          : "Saved search could not be saved.",
      );
    }
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

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
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

    try {
      await searchData.saveActiveSearch(updatedSearch);
      setSelectedSearchOverride({
        baseKey: selectedSearchBaseKey,
        search: updatedSearch,
      });
      setEditFormState(createEditFormState(updatedSearch));
      setEditErrors({});
      setIsEditOpen(false);
      restoreModalTriggerFocus();
      setSaveStatus(
        searchData.source === "cloud"
          ? "Cloud active search updated."
          : "Active search updated.",
      );
    } catch {
      setSaveStatus(
        searchData.source === "cloud"
          ? "Cloud active search could not be saved."
          : "Active search could not be saved.",
      );
    }
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

  if (wallet.isLoading || searchData.isLoading) {
    return (
      <div className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Results
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
          Loading trip data
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#637268]">
          Recommendations are waiting for the{" "}
          {wallet.source === "cloud" ? "cloud wallet" : "browser wallet"} and{" "}
          {searchData.source === "cloud"
            ? "cloud search data"
            : "browser search data"}{" "}
          so scoring does not use stale inputs.
        </p>
      </div>
    );
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

  if (!flightSearchResults || !providerDisplay) {
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

      {wallet.error ? (
        <section
          className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5 text-sm leading-6 text-[#5d4c1d]"
          role="alert"
        >
          <p className="font-semibold text-[#14211b]">Wallet warning</p>
          <p className="mt-1">
            {wallet.error} Results are continuing with an empty wallet.
          </p>
        </section>
      ) : null}

      {searchData.error ? (
        <section
          className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5 text-sm leading-6 text-[#5d4c1d]"
          role="alert"
        >
          <p className="font-semibold text-[#14211b]">Search warning</p>
          <p className="mt-1">
            {searchData.error} Results are continuing with the safe fallback
            search if cloud data is unavailable.
          </p>
        </section>
      ) : null}

      {providerDisplay.showStatusBanner ? (
        <div className="space-y-3">
          <ProviderStatusBanner display={providerDisplay.banner} />
          <ProviderMessagesList messages={flightSearchResults.messages} />
        </div>
      ) : null}

      <section
        aria-label="Booking disclaimer"
        className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 text-xs leading-5 text-[#526158]"
      >
        WDNNSP compares provider data for planning only; it is not a booking
        engine. Verify prices, fees, and award space directly before booking or
        transferring points.
      </section>

      <section
        className={
          hasAwardResults
            ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
            : "grid gap-6"
        }
      >
        <div className="space-y-6">
          {hasAnyProviderResults ? (
            <>
              <BestRecommendationCard
                bestAwardOption={bestAwardOption}
                cashBenchmark={cashOption?.cashPriceUsd}
              />

              <div className="space-y-3">
                <CashBenchmarkCard
                  cashOption={recommendationResults.cashOption}
                  hasAwardResults={hasAwardResults}
                  passengers={selectedSearch.passengers}
                  status={flightSearchResults.cash.status}
                />
                <ProviderSourceNote
                  envelope={flightSearchResults.cash}
                  label="Cash benchmark"
                />
              </div>

              <div className="space-y-3">
                <RankedAwardOptions
                  awardOptions={rankedAwardOptionViewModels}
                  awardStatus={flightSearchResults.awards.status}
                  cashOption={recommendationResults.cashOption}
                  hasCashResults={hasCashResults}
                  hasProviderAwardResults={hasAwardResults}
                  onViewRoute={handleOpenRouteDetails}
                  totalAwardOptionCount={decoratedAwardOptions.length}
                />
                <ProviderSourceNote
                  envelope={flightSearchResults.awards}
                  label="Award availability"
                />
              </div>
            </>
          ) : (
            <>
              <NoProviderResultsState
                kind="all"
                status={flightSearchResults.overallStatus}
              />
              <div className="grid gap-3 lg:grid-cols-2">
                <ProviderSourceNote
                  envelope={flightSearchResults.cash}
                  label="Cash benchmark"
                />
                <ProviderSourceNote
                  envelope={flightSearchResults.awards}
                  label="Award availability"
                />
              </div>
            </>
          )}
        </div>

        {hasAwardResults ? (
          <ResultsFiltersPanel
            filters={filters}
            onChangeFilter={handleChangeFilter}
          />
        ) : null}
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
