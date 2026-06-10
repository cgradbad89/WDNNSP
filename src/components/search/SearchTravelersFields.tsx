"use client";

import type { JSX } from "react";

interface SearchTravelersFieldsProps {
  flexibleDays: string;
  flexibleDaysError?: string;
  maxStops: string;
  maxStopsError?: string;
  onChangeFlexibleDays: (value: string) => void;
  onChangeMaxStops: (value: string) => void;
  onChangePassengers: (value: string) => void;
  passengers: string;
  passengersError?: string;
}

function FieldError({ children }: { children?: string }): JSX.Element | null {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

export function SearchTravelersFields({
  flexibleDays,
  flexibleDaysError,
  maxStops,
  maxStopsError,
  onChangeFlexibleDays,
  onChangeMaxStops,
  onChangePassengers,
  passengers,
  passengersError,
}: SearchTravelersFieldsProps): JSX.Element {
  return (
    <>
      <label className="block">
        <span className="text-sm font-semibold text-[#24382d]">
          Passengers
        </span>
        <input
          className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
          min="1"
          onChange={(event) => onChangePassengers(event.target.value)}
          type="number"
          value={passengers}
        />
        <FieldError>{passengersError}</FieldError>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#24382d]">Max stops</span>
        <input
          className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
          min="0"
          onChange={(event) => onChangeMaxStops(event.target.value)}
          type="number"
          value={maxStops}
        />
        <FieldError>{maxStopsError}</FieldError>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#24382d]">
          Flexibility
        </span>
        <div className="mt-2 flex items-center gap-2 rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-3 py-2 focus-within:border-[#2f6b4f] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2f6b4f]/10">
          <span className="text-sm font-semibold text-[#526158]">+/-</span>
          <input
            className="w-full bg-transparent py-1 text-sm font-semibold text-[#14211b] outline-none"
            min="0"
            onChange={(event) => onChangeFlexibleDays(event.target.value)}
            type="number"
            value={flexibleDays}
          />
          <span className="text-sm font-semibold text-[#526158]">days</span>
        </div>
        <FieldError>{flexibleDaysError}</FieldError>
      </label>
    </>
  );
}
