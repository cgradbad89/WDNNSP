"use client";

import type { JSX } from "react";
import type { TransferPathDisplay } from "@/lib/results/transferPaths";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatTransferRatio(ratio: number): string {
  return ratio === 1 ? "1:1" : `1:${ratio}`;
}

interface TransferPathDetailsProps {
  isTransferRequired: boolean;
  paths: TransferPathDisplay[];
}

export function TransferPathDetails({
  isTransferRequired,
  paths,
}: TransferPathDetailsProps): JSX.Element | null {
  const visiblePaths = paths.slice(0, 2);

  if (!isTransferRequired || visiblePaths.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
      <span className="rounded-md bg-[#fff9df] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d4c1d]">
        Transfer required
      </span>
      <div className="mt-3 space-y-2">
        {visiblePaths.map((path) => (
          <div
            className="text-sm leading-6 text-[#405147]"
            key={path.fromProgram}
          >
            <p className="font-semibold text-[#24382d]">
              {path.fromProgram}
              {" -> "}
              {path.toProgram} - {formatTransferRatio(path.transferRatio)}
            </p>
            <p>
              Available: {formatNumber(path.availableBalance)} - Needed:{" "}
              {formatNumber(path.pointsNeeded)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium leading-5 text-[#5d4c1d]">
        Verify award space with the airline before moving points.
      </p>
    </div>
  );
}
