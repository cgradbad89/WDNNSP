"use client";

import type { ChangeEvent, JSX } from "react";
import type { Cabin } from "@/types/flights";

interface SearchCabinFieldProps {
  error?: string;
  onChange: (value: Cabin) => void;
  value: Cabin;
}

function FieldError({ children }: { children?: string }): JSX.Element | null {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

export function SearchCabinField({
  error,
  onChange,
  value,
}: SearchCabinFieldProps): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#24382d]">Cabin</span>
      <select
        className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value as Cabin)
        }
        value={value}
      >
        <option value="economy">Economy</option>
        <option value="premium_economy">Premium economy</option>
        <option value="business">Business</option>
        <option value="first">First</option>
      </select>
      <FieldError>{error}</FieldError>
    </label>
  );
}
