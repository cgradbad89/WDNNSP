"use client";

import type { ChangeEvent, FormEvent, JSX } from "react";
import { useEffect, useRef } from "react";
import { AIRPORT_GROUPS } from "@/data/airportGroups";
import type { SearchValidationErrors } from "@/lib/search/validation";
import type { Cabin } from "@/types/flights";
import type { TripType } from "@/types/search";

export interface EditSearchFormState {
  name: string;
  origin: string;
  destination: string;
  tripType: TripType;
  departDate: string;
  returnDate: string;
  cabin: Cabin;
  passengers: string;
  maxStops: string;
  flexibleDays: string;
}

function FieldError({ children }: { children?: string }): JSX.Element | null {
  if (!children) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#8f2d2d]">{children}</p>;
}

interface EditSearchDrawerProps {
  errors: SearchValidationErrors;
  formState: EditSearchFormState;
  onChangeField: <Field extends keyof EditSearchFormState>(
    field: Field,
    value: EditSearchFormState[Field],
  ) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function EditSearchDrawer({
  errors,
  formState,
  onChangeField,
  onClose,
  onSubmit,
}: EditSearchDrawerProps): JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211b]/45 p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        aria-labelledby="edit-search-dialog-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(20,33,27,0.28)] md:p-6"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        onSubmit={onSubmit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Edit search
            </p>
            <h3
              className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]"
              id="edit-search-dialog-title"
            >
              Update active search
            </h3>
          </div>
          <button
            aria-label="Close edit search"
            className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-[#24382d]">
            Trip name
          </span>
          <input
            className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
            onChange={(event) => onChangeField("name", event.target.value)}
            type="text"
            value={formState.name}
          />
          <FieldError>{errors.name}</FieldError>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Origin
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              list="edit-airport-group-options"
              onChange={(event) => onChangeField("origin", event.target.value)}
              type="text"
              value={formState.origin}
            />
            <FieldError>{errors.originCodes}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Destination
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              list="edit-airport-group-options"
              onChange={(event) =>
                onChangeField("destination", event.target.value)
              }
              type="text"
              value={formState.destination}
            />
            <FieldError>{errors.destinationCodes}</FieldError>
          </label>
          <datalist id="edit-airport-group-options">
            {AIRPORT_GROUPS.map((group) => (
              <option key={group.code} value={group.code}>
                {group.name}
              </option>
            ))}
          </datalist>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Trip type
            </span>
            <select
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onChangeField("tripType", event.target.value as TripType)
              }
              value={formState.tripType}
            >
              <option value="round_trip">Round trip</option>
              <option value="one_way">One way</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Depart
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event) =>
                onChangeField("departDate", event.target.value)
              }
              type="date"
              value={formState.departDate}
            />
            <FieldError>{errors.departDate}</FieldError>
          </label>
          {formState.tripType === "round_trip" ? (
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Return
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                onChange={(event) =>
                  onChangeField("returnDate", event.target.value)
                }
                type="date"
                value={formState.returnDate}
              />
              <FieldError>{errors.returnDate}</FieldError>
            </label>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">Cabin</span>
            <select
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              onChange={(event) =>
                onChangeField("cabin", event.target.value as Cabin)
              }
              value={formState.cabin}
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
            <FieldError>{errors.cabin}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Passengers
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="1"
              onChange={(event) =>
                onChangeField("passengers", event.target.value)
              }
              type="number"
              value={formState.passengers}
            />
            <FieldError>{errors.passengers}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Max stops
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="0"
              onChange={(event) =>
                onChangeField("maxStops", event.target.value)
              }
              type="number"
              value={formState.maxStops}
            />
            <FieldError>{errors.maxStops}</FieldError>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#24382d]">
              Flexible days
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              min="0"
              onChange={(event) =>
                onChangeField("flexibleDays", event.target.value)
              }
              type="number"
              value={formState.flexibleDays}
            />
            <FieldError>{errors.flexibleDays}</FieldError>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
            type="submit"
          >
            Save edit
          </button>
          <button
            className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
