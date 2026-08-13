"use client";

import type { FocusEvent, JSX, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { SearchCabinField } from "@/components/search/SearchCabinField";
import { SearchTravelersFields } from "@/components/search/SearchTravelersFields";
import { formatTravelersCabinSummary } from "@/lib/search/searchBarFormatting";
import type { Cabin } from "@/types/flights";

interface SearchTravelersCabinFieldProps {
  cabin: Cabin;
  cabinError?: string;
  flexibleDays: string;
  flexibleDaysError?: string;
  maxStops: string;
  maxStopsError?: string;
  onChangeCabin: (value: Cabin) => void;
  onChangeFlexibleDays: (value: string) => void;
  onChangeMaxStops: (value: string) => void;
  onChangePassengers: (value: string) => void;
  passengers: string;
  passengersError?: string;
}

export function SearchTravelersCabinField({
  cabin,
  cabinError,
  flexibleDays,
  flexibleDaysError,
  maxStops,
  maxStopsError,
  onChangeCabin,
  onChangeFlexibleDays,
  onChangeMaxStops,
  onChangePassengers,
  passengers,
  passengersError,
}: SearchTravelersCabinFieldProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = "search-travelers-cabin-panel";
  const hasError = Boolean(cabinError || passengersError || maxStopsError || flexibleDaysError);

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    if (
      event.relatedTarget instanceof Node &&
      containerRef.current?.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
        Travelers &amp; cabin
      </span>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="mt-1 w-full truncate rounded-md bg-transparent py-1 text-left text-base font-semibold text-[#14211b] outline-none transition focus:bg-white/70"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {formatTravelersCabinSummary(passengers, cabin)}
      </button>
      {hasError ? (
        <p className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap text-xs font-medium text-[#8f2d2d]">
          {cabinError ?? passengersError ?? maxStopsError ?? flexibleDaysError}
        </p>
      ) : null}

      {isOpen ? (
        <div
          aria-label="Travelers and cabin"
          className="absolute right-0 z-30 mt-2 w-[min(90vw,360px)] rounded-md border border-[#b8c8b2] bg-white p-4 shadow-[0_16px_34px_rgba(31,63,45,0.14)]"
          id={panelId}
          role="dialog"
        >
          <div className="grid gap-4">
            <SearchCabinField
              error={cabinError}
              onChange={onChangeCabin}
              value={cabin}
            />
            <SearchTravelersFields
              flexibleDays={flexibleDays}
              flexibleDaysError={flexibleDaysError}
              maxStops={maxStops}
              maxStopsError={maxStopsError}
              onChangeFlexibleDays={onChangeFlexibleDays}
              onChangeMaxStops={onChangeMaxStops}
              onChangePassengers={onChangePassengers}
              passengers={passengers}
              passengersError={passengersError}
            />
          </div>
          <button
            className="mt-4 w-full rounded-md bg-[#edf3ea] px-4 py-2 text-sm font-semibold text-[#2f6b4f] transition hover:bg-[#e0ebdc]"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
