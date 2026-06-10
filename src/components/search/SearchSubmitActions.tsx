"use client";

import type { JSX } from "react";

interface SearchSubmitActionsProps {
  isResetDisabled?: boolean;
  isSearchDisabled?: boolean;
  onReset: () => void;
  statusMessage: string;
}

function SearchIcon({ className }: { className?: string }): JSX.Element {
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

function ArrowIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SearchSubmitActions({
  isResetDisabled = false,
  isSearchDisabled = false,
  onReset,
  statusMessage,
}: SearchSubmitActionsProps): JSX.Element {
  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f]"
          disabled={isSearchDisabled}
          type="submit"
        >
          <SearchIcon className="h-4 w-4" />
          Search
          <ArrowIcon className="h-4 w-4" />
        </button>
        <button
          className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
          disabled={isResetDisabled}
          onClick={onReset}
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
    </>
  );
}
