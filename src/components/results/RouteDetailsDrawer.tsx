"use client";

import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { formatDuration } from "@/lib/results/routeDetails";
import type { RouteDetail } from "@/types/flights";

export interface RouteDetailsDrawerState {
  title: string;
  routeDetail?: RouteDetail;
}

interface RouteDetailsDrawerProps {
  modal: RouteDetailsDrawerState | undefined;
  onClose: () => void;
}

export function RouteDetailsDrawer({
  modal,
  onClose,
}: RouteDetailsDrawerProps): JSX.Element | null {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modal) {
      closeButtonRef.current?.focus();
    }
  }, [modal]);

  if (!modal) {
    return null;
  }

  const routeDetail = modal.routeDetail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211b]/45 p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="route-details-dialog-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(20,33,27,0.28)] md:p-6"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Route details
            </p>
            <h3
              className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]"
              id="route-details-dialog-title"
            >
              {modal.title}
            </h3>
          </div>
          <button
            aria-label="Close route details"
            className="rounded-md border border-[#b8c8b2] px-3 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        {routeDetail ? (
          <div className="mt-5 space-y-3">
            {routeDetail.segments.map((segment, index) => (
              <div key={segment.id}>
                <article className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                    Segment {index + 1}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-[#14211b]">
                    {segment.origin}
                    {" -> "}
                    {segment.destination}
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-[#526158]">
                    {segment.flightNumber ?? "Mock flight"} -{" "}
                    {segment.departureTime} to {segment.arrivalTime} -{" "}
                    {formatDuration(segment.durationMinutes)}
                  </p>
                </article>
                {routeDetail.layovers[index] ? (
                  <div className="mx-4 border-x border-[#d9e2d6] px-4 py-3 text-sm font-semibold text-[#405147]">
                    Layover at {routeDetail.layovers[index].airport} for{" "}
                    {formatDuration(
                      routeDetail.layovers[index].durationMinutes,
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="rounded-md border border-[#ead99d] bg-[#fff9df] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5d4c1d]">
                Total duration
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                {formatDuration(routeDetail.totalDurationMinutes)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 text-sm leading-6 text-[#526158]">
            Route details are not available for this mock option.
          </p>
        )}
      </section>
    </div>
  );
}
