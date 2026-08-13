"use client";

import type { JSX } from "react";

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

interface SearchSubmitButtonProps {
  isDisabled?: boolean;
}

/**
 * The primary submit action, meant to sit at the end of the horizontal
 * search bar. Kept as its own component (rather than inline in the bar) so
 * it stays a single visual/behavioral unit with SearchFormStatus below.
 */
export function SearchSubmitButton({
  isDisabled = false,
}: SearchSubmitButtonProps): JSX.Element {
  return (
    <button
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isDisabled}
      type="submit"
    >
      <SearchIcon className="h-4 w-4" />
      Search
    </button>
  );
}

interface SearchFormStatusProps {
  isResetDisabled?: boolean;
  onReset: () => void;
  statusMessage: string;
}

/** Reset + status row rendered below the search bar. */
export function SearchFormStatus({
  isResetDisabled = false,
  onReset,
  statusMessage,
}: SearchFormStatusProps): JSX.Element {
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          className="rounded-md border border-[#b8c8b2] px-4 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
          disabled={isResetDisabled}
          onClick={onReset}
          type="button"
        >
          Reset defaults
        </button>
      </div>

      {statusMessage ? (
        <p className="mt-3 rounded-md bg-[#edf3ea] px-4 py-3 text-sm font-semibold text-[#2f6b4f]">
          {statusMessage}
        </p>
      ) : null}
    </>
  );
}
