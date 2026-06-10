"use client";

import type { ChangeEvent, FocusEvent, JSX, KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import { AIRPORTS } from "@/data/airports";
import {
  getAirportSuggestions,
  type AirportSuggestion,
} from "@/lib/airports/autocomplete";

interface AirportAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AirportSuggestion) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
}

function getSuggestionBadgeClassName(type: AirportSuggestion["type"]): string {
  return type === "group"
    ? "border-[#b8d2c1] bg-[#edf7ef] text-[#2f6b4f]"
    : "border-[#d8dfd4] bg-white text-[#526158]";
}

export function AirportAutocomplete({
  error,
  hint,
  id,
  label,
  onChange,
  onSelect,
  placeholder,
  value,
}: AirportAutocompleteProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(
    () => getAirportSuggestions(value, AIRPORTS, AIRPORT_GROUPS),
    [value],
  );
  const hasSuggestions = suggestions.length > 0;
  const selectedIndex = hasSuggestions
    ? Math.min(Math.max(highlightedIndex, 0), suggestions.length - 1)
    : -1;
  const shouldShowSuggestions = isOpen && hasSuggestions;
  const listboxId = `${id}-suggestions`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const activeOptionId =
    shouldShowSuggestions && selectedIndex >= 0
      ? `${id}-suggestion-${suggestions[selectedIndex]?.code}`
      : undefined;
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined]
    .filter(Boolean)
    .join(" ");

  function selectSuggestion(suggestion: AirportSuggestion): void {
    onChange(suggestion.code);
    onSelect(suggestion);
    setIsOpen(false);
    setHighlightedIndex(0);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.target.value);
    setHighlightedIndex(0);
    setIsOpen(event.target.value.trim().length > 0);
  }

  function handleFocus(): void {
    if (value.trim()) {
      setIsOpen(true);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    if (
      event.relatedTarget instanceof Node &&
      containerRef.current?.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!hasSuggestions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) =>
        currentIndex < 0 ? 0 : (currentIndex + 1) % suggestions.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) =>
        currentIndex <= 0 ? suggestions.length - 1 : currentIndex - 1,
      );
    } else if (event.key === "Enter" && shouldShowSuggestions) {
      event.preventDefault();
      const highlightedSuggestion = suggestions[selectedIndex];

      if (highlightedSuggestion) {
        selectSuggestion(highlightedSuggestion);
      }
    }
  }

  return (
    <div className="relative" onBlur={handleBlur} ref={containerRef}>
      <label className="block" htmlFor={id}>
        <span className="text-sm font-semibold text-[#24382d]">{label}</span>
      </label>
      <input
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-controls={shouldShowSuggestions ? listboxId : undefined}
        aria-describedby={describedBy || undefined}
        aria-expanded={shouldShowSuggestions}
        aria-haspopup="listbox"
        aria-invalid={error ? true : undefined}
        className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
        id={id}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        type="text"
        value={value}
      />
      {error ? (
        <p className="mt-2 text-sm font-medium text-[#8f2d2d]" id={errorId}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-sm leading-6 text-[#637268]" id={hintId}>
          {hint}
        </p>
      ) : null}

      {shouldShowSuggestions ? (
        <div
          className="absolute z-20 mt-2 w-full rounded-md border border-[#b8c8b2] bg-white p-2 shadow-[0_16px_34px_rgba(31,63,45,0.14)]"
          id={listboxId}
          role="listbox"
        >
          <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              Supported matches
            </p>
            <p className="text-xs font-semibold text-[#2f6b4f]">
              {suggestions.length} shown
            </p>
          </div>
          <ul className="grid gap-2">
            {suggestions.map((suggestion, index) => {
              const isHighlighted = index === selectedIndex;

              return (
                <li
                  aria-selected={isHighlighted}
                  className={`rounded-md border ${
                    isHighlighted
                      ? "border-[#2f6b4f] bg-[#f3faf4]"
                      : "border-[#edf3ea] bg-white"
                  }`}
                  id={`${id}-suggestion-${suggestion.code}`}
                  key={`${suggestion.type}-${suggestion.code}`}
                  role="option"
                >
                  <button
                    className="flex w-full flex-col gap-3 p-3 text-left sm:flex-row sm:items-start sm:justify-between"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#24382d]">
                        {suggestion.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#637268]">
                        {suggestion.sublabel}
                      </span>
                    </span>
                    <span
                      className={`w-fit rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${getSuggestionBadgeClassName(
                        suggestion.type,
                      )}`}
                    >
                      {suggestion.type === "group"
                        ? "Airport group"
                        : "Airport"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
