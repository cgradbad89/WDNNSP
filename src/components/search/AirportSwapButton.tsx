"use client";

import type { JSX } from "react";

interface AirportSwapButtonProps {
  onSwap: () => void;
}

function SwapIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M6.5 4.5v9.6M6.5 4.5 3.5 7.5M6.5 4.5l3 3M13.5 15.5V5.9M13.5 15.5l-3-3M13.5 15.5l3-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function AirportSwapButton({
  onSwap,
}: AirportSwapButtonProps): JSX.Element {
  return (
    <button
      aria-label="Swap origin and destination"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#b8c8b2] bg-white text-[#2f6b4f] transition hover:bg-[#edf3ea]"
      onClick={onSwap}
      title="Swap origin and destination"
      type="button"
    >
      <SwapIcon className="h-4 w-4" />
    </button>
  );
}
