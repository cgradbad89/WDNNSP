"use client";

import type { FocusEvent, JSX, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { SearchDateFields } from "@/components/search/SearchDateFields";
import { formatDateRangeSummary } from "@/lib/search/searchBarFormatting";
import type { TripType } from "@/types/search";

interface SearchDatesFieldProps {
  departDate: string;
  departDateError?: string;
  onChangeDepartDate: (value: string) => void;
  onChangeReturnDate: (value: string) => void;
  returnDate: string;
  returnDateError?: string;
  tripType: TripType;
}

export function SearchDatesField({
  departDate,
  departDateError,
  onChangeDepartDate,
  onChangeReturnDate,
  returnDate,
  returnDateError,
  tripType,
}: SearchDatesFieldProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = "search-dates-panel";
  const hasError = Boolean(departDateError || returnDateError);

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
        Dates
      </span>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="mt-1 w-full truncate rounded-md bg-transparent py-1 text-left text-base font-semibold text-[#14211b] outline-none transition focus:bg-white/70"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {formatDateRangeSummary(tripType, departDate, returnDate)}
      </button>
      {hasError ? (
        <p className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap text-xs font-medium text-[#8f2d2d]">
          {departDateError ?? returnDateError}
        </p>
      ) : null}

      {isOpen ? (
        <div
          aria-label="Trip dates"
          className="absolute z-30 mt-2 w-[min(90vw,360px)] rounded-md border border-[#b8c8b2] bg-white p-4 shadow-[0_16px_34px_rgba(31,63,45,0.14)]"
          id={panelId}
          role="dialog"
        >
          <SearchDateFields
            departDate={departDate}
            departDateError={departDateError}
            onChangeDepartDate={onChangeDepartDate}
            onChangeReturnDate={onChangeReturnDate}
            returnDate={returnDate}
            returnDateError={returnDateError}
            tripType={tripType}
          />
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
