"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useReducer, useState, useSyncExternalStore } from "react";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { expandAirportCode } from "@/lib/airports/groups";
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
  name: "Tokyo fall business",
  origin: "WAS",
  destination: "TYO",
  tripType: "round_trip",
  departDate: "2026-10-18",
  returnDate: "2026-10-29",
  cabin: "business",
  passengers: "2",
  maxStops: "1",
  flexibleDays: "3",
};

const cabinLabels: Record<Cabin, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium_economy: "Premium economy",
};

const matchSignals = [
  "Saved criteria are ready for mock cash and award providers.",
  "Airport groups expand before route validation.",
  "Transfer warnings stay visible before points move anywhere.",
];

const walletSources = [
  {
    label: "Chase Ultimate Rewards",
    balance: "154,200",
    status: "Ready",
    detail: "Transfers to Aeroplan, United, Flying Blue",
  },
  {
    label: "United MileagePlus",
    balance: "71,500",
    status: "Watch",
    detail: "Useful when saver pricing appears",
  },
  {
    label: "American Express MR",
    balance: "88,400",
    status: "Available",
    detail: "Backup transfer source for partner programs",
  },
];

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
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
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateRange(search: SavedSearch): string {
  if (search.tripType === "one_way") {
    return formatDate(search.departDate);
  }

  return `${formatDate(search.departDate)} - ${formatDate(search.returnDate)}`;
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

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.5 12.5h16.2c.8 0 1.1 1 .4 1.4l-4.2 2.7-1 3.4h-2.1l.4-4.9-4.9 2.4H6.1l2.8-4.3-5.4-.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m9 12.4-2.8-4h2.2l5.2 3.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m4.2 10.4 3.4 3.2 8.2-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
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
  const isLoaded = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [, refreshSavedSearches] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const savedSearches = isLoaded ? loadSavedSearches() : [];
  const [formState, setFormState] =
    useState<SearchFormState>(initialFormState);
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const originCodes = normalizeSingleCode(formState.origin);
  const destinationCodes = normalizeSingleCode(formState.destination);
  const passengers = parseRequiredNumber(formState.passengers);
  const maxStops = parseOptionalNumber(formState.maxStops);
  const flexibleDays = parseOptionalNumber(formState.flexibleDays);
  const sourceRows = [
    {
      source: "Award benchmark",
      route: `${formState.origin || "Origin"} -> ${
        formState.destination || "Destination"
      }`,
      cost: "Mock later",
      detail: "No live APIs",
      confidence: "Pending",
      value: "Decision list",
    },
    {
      source: "Cash benchmark",
      route: formatCodes(originCodes),
      cost: "Manual/mock",
      detail: `${passengers || 0} passenger${passengers === 1 ? "" : "s"}`,
      confidence: "Planned",
      value: "Baseline",
    },
    {
      source: "Expanded destination",
      route: formatCodes(destinationCodes),
      cost: cabinLabels[formState.cabin],
      detail:
        formState.tripType === "round_trip" ? "Round trip" : "One way",
      confidence: "Ready",
      value: `+/- ${flexibleDays ?? 0} days`,
    },
  ];

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

  function persistSavedSearches(nextSearches: SavedSearch[]): void {
    saveSavedSearches(nextSearches);
    refreshSavedSearches();
  }

  function handleSaveSearch(event: FormEvent<HTMLFormElement>): void {
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

    const nextSearch = createSavedSearch({
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

    persistSavedSearches([nextSearch, ...savedSearches]);
    setErrors({});
    setStatusMessage(`Saved "${nextSearch.name}" locally in this browser.`);
  }

  function handleDeleteSearch(searchId: string): void {
    persistSavedSearches(deleteSavedSearch(savedSearches, searchId));
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
              Search smarter before moving points
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Save the trip criteria now. Cash, award, and recommendation
              providers stay mocked or manual until the next phases.
            </p>
          </div>
          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[360px] sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Saved searches
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {isLoaded ? savedSearches.length : "Loading"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Origin
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatCodes(originCodes)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Destination
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatCodes(destinationCodes)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <form
          className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.07)] md:p-6"
          onSubmit={handleSaveSearch}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#14211b]">
                Trip search
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#637268]">
                Enter one airport code or supported airport group per side.
              </p>
            </div>
            <span className="rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
              {formState.tripType === "round_trip" ? "Round trip" : "One way"}
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-[#24382d]">
              Search name
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
                Origin
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
              <span className="text-sm font-semibold text-[#24382d]">
                Destination
              </span>
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

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
                  className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
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

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
          </div>

          <div className="mt-5 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
            <label className="block max-w-xs">
              <span className="text-sm font-semibold text-[#24382d]">
                Flexible date range
              </span>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm font-semibold text-[#526158]">
                  +/-
                </span>
                <input
                  className="w-24 rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:ring-4 focus:ring-[#2f6b4f]/10"
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f]"
              type="submit"
            >
              <SearchIcon className="h-4 w-4" />
              Save search
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
          <section className="rounded-lg border border-[#d9e2d6] bg-[#0f2f22] p-5 text-white shadow-[0_18px_50px_rgba(15,47,34,0.18)] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a8d5bd]">
                  Recommendation preview
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  Save this search before checking options
                </h3>
              </div>
              <PlaneIcon className="h-9 w-9 shrink-0 text-[#a8d5bd]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Points
                </p>
                <p className="mt-2 text-xl font-semibold">Mock</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Fees
                </p>
                <p className="mt-2 text-xl font-semibold">Manual</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Value
                </p>
                <p className="mt-2 text-xl font-semibold">Later</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {matchSignals.map((signal) => (
                <div className="flex gap-3 text-sm leading-6" key={signal}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a8d5bd] text-[#0f2f22]">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[#e7f2eb]">{signal}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5">
            <p className="text-sm font-semibold text-[#5d4c1d]">
              Verify award space before transferring points.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f6028]">
              Transfers are often irreversible. This screen saves the search
              criteria only; it does not move points or book flights.
            </p>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Source comparison
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
                Options to investigate first
              </h3>
            </div>
            <p className="text-sm text-[#637268]">
              Layout ready for mock providers
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-[#d9e2d6]">
            <div className="hidden grid-cols-[1.05fr_0.9fr_0.75fr_0.75fr_0.95fr_0.9fr] bg-[#edf3ea] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#526158] md:grid">
              <span>Source</span>
              <span>Route</span>
              <span>Cost</span>
              <span>Detail</span>
              <span>Confidence</span>
              <span>Value</span>
            </div>
            {sourceRows.map((row) => (
              <div
                className="grid gap-3 border-t border-[#d9e2d6] px-4 py-4 text-sm first:border-t-0 md:grid-cols-[1.05fr_0.9fr_0.75fr_0.75fr_0.95fr_0.9fr] md:items-center"
                key={`${row.source}-${row.route}`}
              >
                <p className="font-semibold text-[#24382d]">{row.source}</p>
                <p className="font-medium text-[#526158]">{row.route}</p>
                <p className="font-semibold text-[#14211b]">{row.cost}</p>
                <p className="font-medium text-[#526158]">{row.detail}</p>
                <p>
                  <span className="rounded-md bg-[#edf3ea] px-2.5 py-1 text-xs font-semibold text-[#2f6b4f]">
                    {row.confidence}
                  </span>
                </p>
                <p className="font-semibold text-[#14211b]">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Wallet readiness
          </p>
          <div className="mt-4 space-y-3">
            {walletSources.map((source) => (
              <article
                className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                key={source.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#24382d]">
                      {source.label}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-[#637268]">
                      {source.detail}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#2f6b4f]">
                    {source.status}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
                  {source.balance}
                </p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Saved searches
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Search criteria saved in this browser
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#24382d]">
                      {search.name}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
                      {formatCodes(search.originCodes)} to{" "}
                      {formatCodes(search.destinationCodes)}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-[#b8c8b2] px-3 py-2 text-xs font-semibold text-[#24382d] transition hover:bg-white"
                    onClick={() => handleDeleteSearch(search.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#637268]">
                  {formatDateRange(search)} - {search.passengers} passenger
                  {search.passengers === 1 ? "" : "s"} -{" "}
                  {cabinLabels[search.cabin]}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {isLoaded && savedSearches.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] bg-[#f7faf6] p-5 text-sm leading-6 text-[#526158]">
            No saved searches yet. Fill out the trip form above and save it to
            see it here and on the dashboard.
          </div>
        ) : null}
      </section>
    </div>
  );
}
