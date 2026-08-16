"use client";

import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { validateManualCashFare } from "@/lib/verification/manualValue";
import type { ManualCashInput } from "@/types/verification";

interface ManualCashFareInputProps {
  providerLabel?: string;
  value?: ManualCashInput;
  onClear: () => void;
  onSave: (input: ManualCashInput) => void;
}

export function ManualCashFareInput({
  onClear,
  onSave,
  providerLabel = "Travelpayouts",
  value,
}: ManualCashFareInputProps): JSX.Element {
  const [amount, setAmount] = useState(value ? String(value.amountUsd) : "");
  const [note, setNote] = useState(value?.note ?? "");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const validation = validateManualCashFare(amount);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setError("");
    onSave({
      amountUsd: validation.value,
      source: "manual",
      ...(note.trim() ? { note: note.trim() } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleClear(): void {
    setAmount("");
    setNote("");
    setError("");
    onClear();
  }

  return (
    <section
      aria-labelledby="manual-cash-fare-title"
      className="rounded-lg border border-[#b8c8b2] bg-[#f7faf6] p-5"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
        Manual comparison input
      </p>
      <h3
        className="mt-2 text-xl font-semibold tracking-tight text-[#14211b]"
        id="manual-cash-fare-title"
      >
        Add a cash fare to estimate value
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526158]">
        {providerLabel} did not return a comparable cash fare. Enter a fare
        you found on Google Flights or another booking site to estimate cents
        per point.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] sm:items-end" onSubmit={handleSubmit}>
        <div>
          <label
            className="text-sm font-semibold text-[#24382d]"
            htmlFor="manual-cash-fare"
          >
            Cash fare in USD
          </label>
          <input
            aria-describedby={error ? "manual-cash-fare-error" : undefined}
            className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2.5 text-sm text-[#14211b] outline-none focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#a8d5bd]"
            id="manual-cash-fare"
            inputMode="decimal"
            placeholder="4500"
            type="text"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div>
          <label
            className="text-sm font-semibold text-[#24382d]"
            htmlFor="manual-cash-fare-note"
          >
            Source or note (optional)
          </label>
          <input
            className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2.5 text-sm text-[#14211b] outline-none focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#a8d5bd]"
            id="manual-cash-fare-note"
            placeholder="Google Flights"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[#2f6b4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24563f]"
            type="submit"
          >
            Use this fare
          </button>
          <button
            className="rounded-md border border-[#b8c8b2] bg-white px-4 py-2.5 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={handleClear}
            type="button"
          >
            Clear manual fare
          </button>
        </div>
      </form>
      {error ? (
        <p
          className="mt-2 text-sm font-medium text-[#8f3b24]"
          id="manual-cash-fare-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {value ? (
        <p className="mt-3 text-xs font-semibold text-[#526158]">
          Manual cash fare: ${value.amountUsd.toLocaleString("en-US")} user-entered estimate
          {value.note ? ` (${value.note})` : ""}.
        </p>
      ) : null}
    </section>
  );
}
