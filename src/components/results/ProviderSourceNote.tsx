"use client";

import type { JSX } from "react";
import { isStaleProviderData } from "@/lib/providers/status";
import { getProviderLiveStatusLabel } from "@/lib/providers/sourceLabel";
import type { ProviderResultEnvelope } from "@/lib/providers/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

function formatProviderDateTime(value: string | undefined): string {
  if (!value) {
    return "not reported";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

interface ProviderSourceNoteProps<T> {
  envelope: ProviderResultEnvelope<T>;
  label: string;
}

export function ProviderSourceNote<T>({
  envelope,
  label,
}: ProviderSourceNoteProps<T>): JSX.Element {
  const isStale = isStaleProviderData(envelope);
  const isCashSource = label.toLowerCase().includes("cash");

  return (
    <aside
      aria-label={`${label} source details`}
      className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 text-xs leading-5 text-[#526158]"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span>
          <span className="font-semibold text-[#24382d]">{label} source:</span>{" "}
          {envelope.metadata.providerLabel}
        </span>
        <span>{getProviderLiveStatusLabel(envelope.metadata.isLive)}</span>
        <span>Checked {formatProviderDateTime(envelope.metadata.searchedAt)}</span>
        {envelope.metadata.expiresAt ? (
          <span>
            Expires {formatProviderDateTime(envelope.metadata.expiresAt)}
          </span>
        ) : null}
      </div>
      {isStale ? (
        <p className="mt-2 font-medium text-[#5d4c1d]">
          {isCashSource
            ? "This provider marked the data as stale. Cash fare estimates may come from cached provider data and may not include separately confirmed taxes or fees."
            : "This provider marked the data as stale."}{" "}
          Verify prices and award space directly before booking or transferring
          points.
        </p>
      ) : null}
    </aside>
  );
}
