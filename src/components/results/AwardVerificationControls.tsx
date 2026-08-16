"use client";

import type { FormEvent, JSX } from "react";
import { useState } from "react";
import {
  validateManualPoints,
  validateManualTaxesAndFees,
} from "@/lib/verification/manualValue";
import type {
  AwardVerificationStatus,
  ManualAwardVerificationInput,
} from "@/types/verification";

const statusOptions: Array<{
  label: string;
  value: AwardVerificationStatus;
}> = [
  { label: "Not verified", value: "not_verified" },
  { label: "Verified on airline site", value: "manually_verified" },
  { label: "Price changed", value: "price_changed" },
  { label: "No longer available", value: "no_longer_available" },
  { label: "Could not verify", value: "verification_failed" },
];

interface AwardVerificationControlsProps {
  awardOptionId: string;
  value?: ManualAwardVerificationInput;
  onClear: () => void;
  onSave: (input: ManualAwardVerificationInput) => void;
}

export function AwardVerificationControls({
  awardOptionId,
  onClear,
  onSave,
  value,
}: AwardVerificationControlsProps): JSX.Element {
  const [status, setStatus] = useState<AwardVerificationStatus>(
    value?.status ?? "not_verified",
  );
  const [points, setPoints] = useState(
    value?.verifiedPointsRequired === undefined
      ? ""
      : String(value.verifiedPointsRequired),
  );
  const [fees, setFees] = useState(
    value?.verifiedTaxesAndFeesUsd === undefined
      ? ""
      : String(value.verifiedTaxesAndFeesUsd),
  );
  const [note, setNote] = useState(value?.note ?? "");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const pointsValidation =
      points.trim() === ""
        ? undefined
        : validateManualPoints(points);
    const feesValidation =
      fees.trim() === ""
        ? undefined
        : validateManualTaxesAndFees(fees);

    if (pointsValidation && !pointsValidation.ok) {
      setError(`Verified points: ${pointsValidation.message}`);
      return;
    }

    if (feesValidation && !feesValidation.ok) {
      setError(`Taxes and fees: ${feesValidation.message}`);
      return;
    }

    setError("");
    onSave({
      awardOptionId,
      status,
      ...(pointsValidation?.ok
        ? { verifiedPointsRequired: pointsValidation.value }
        : {}),
      ...(feesValidation?.ok
        ? { verifiedTaxesAndFeesUsd: feesValidation.value }
        : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleClear(): void {
    setStatus("not_verified");
    setPoints("");
    setFees("");
    setNote("");
    setError("");
    onClear();
  }

  return (
    <section
      aria-labelledby={`award-verification-${awardOptionId}`}
      className="rounded-md border border-[#b8c8b2] bg-[#f7faf6] p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2f6b4f]">
        Award verification
      </p>
      <h5
        className="mt-2 text-sm font-semibold text-[#14211b]"
        id={`award-verification-${awardOptionId}`}
      >
        Record what you found
      </h5>
      <p className="mt-1 text-xs leading-5 text-[#526158]">
        Use this after checking the airline or loyalty-program site. WDNNSP
        does not confirm booking availability.
      </p>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div>
          <label
            className="text-xs font-semibold text-[#24382d]"
            htmlFor={`award-status-${awardOptionId}`}
          >
            Verification status
          </label>
          <select
            className="mt-1 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
            id={`award-status-${awardOptionId}`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AwardVerificationStatus)
            }
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="text-xs font-semibold text-[#24382d]"
            htmlFor={`award-points-${awardOptionId}`}
          >
            Verified points (optional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
            id={`award-points-${awardOptionId}`}
            inputMode="numeric"
            type="number"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
        </div>
        <div>
          <label
            className="text-xs font-semibold text-[#24382d]"
            htmlFor={`award-fees-${awardOptionId}`}
          >
            Verified taxes/fees in USD (optional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
            id={`award-fees-${awardOptionId}`}
            inputMode="decimal"
            type="number"
            value={fees}
            onChange={(event) => setFees(event.target.value)}
          />
        </div>
        <div>
          <label
            className="text-xs font-semibold text-[#24382d]"
            htmlFor={`award-note-${awardOptionId}`}
          >
            Source or note (optional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-sm text-[#14211b]"
            id={`award-note-${awardOptionId}`}
            placeholder="United.com"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            className="rounded-md bg-[#2f6b4f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#24563f]"
            type="submit"
          >
            Save verification
          </button>
          <button
            className="rounded-md border border-[#b8c8b2] bg-white px-3 py-2 text-xs font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={handleClear}
            type="button"
          >
            Clear verification
          </button>
        </div>
      </form>
      {error ? (
        <p className="mt-2 text-xs font-medium text-[#8f3b24]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
