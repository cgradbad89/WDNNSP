"use client";

import type { ChangeEvent, JSX } from "react";
import type { TripType } from "@/types/search";

interface SearchDateFieldsProps {
  departDate: string;
  departDateError?: string;
  onChangeDepartDate: (value: string) => void;
  onChangeReturnDate: (value: string) => void;
  onChangeTripType: (value: TripType) => void;
  returnDate: string;
  returnDateError?: string;
  tripType: TripType;
}

function FieldError({ children }: { children?: string }): JSX.Element | null {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

export function SearchDateFields({
  departDate,
  departDateError,
  onChangeDepartDate,
  onChangeReturnDate,
  onChangeTripType,
  returnDate,
  returnDateError,
  tripType,
}: SearchDateFieldsProps): JSX.Element {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <label className="block">
        <span className="text-sm font-semibold text-[#24382d]">
          Trip type
        </span>
        <select
          className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChangeTripType(event.target.value as TripType)
          }
          value={tripType}
        >
          <option value="round_trip">Round trip</option>
          <option value="one_way">One way</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#24382d]">Depart</span>
        <input
          className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
          onChange={(event) => onChangeDepartDate(event.target.value)}
          type="date"
          value={departDate}
        />
        <FieldError>{departDateError}</FieldError>
      </label>
      {tripType === "round_trip" ? (
        <label className="block">
          <span className="text-sm font-semibold text-[#24382d]">Return</span>
          <input
            className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:ring-4 focus:ring-[#2f6b4f]/10"
            onChange={(event) => onChangeReturnDate(event.target.value)}
            type="date"
            value={returnDate}
          />
          <FieldError>{returnDateError}</FieldError>
        </label>
      ) : null}
    </div>
  );
}
