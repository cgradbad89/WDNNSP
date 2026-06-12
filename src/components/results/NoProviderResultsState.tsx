"use client";

import type { JSX } from "react";
import {
  getNoProviderResultsDisplay,
  type ProviderResultKind,
} from "@/lib/providers/display";
import type { ProviderStatus } from "@/lib/providers/types";

const toneClasses = {
  success: "border-[#b8c8b2] bg-[#f7faf6] text-[#2f6b4f]",
  info: "border-[#d9e2d6] bg-white text-[#526158]",
  warning: "border-[#ead99d] bg-[#fff9df] text-[#5d4c1d]",
  error: "border-[#f1b8a8] bg-[#fff3ef] text-[#8f3b24]",
};

interface NoProviderResultsStateProps {
  hasOtherResults?: boolean;
  kind: ProviderResultKind;
  status: ProviderStatus;
}

export function NoProviderResultsState({
  hasOtherResults,
  kind,
  status,
}: NoProviderResultsStateProps): JSX.Element {
  const display = getNoProviderResultsDisplay({
    hasOtherResults,
    kind,
    status,
  });

  return (
    <article
      className={`rounded-lg border border-dashed p-5 text-sm leading-6 ${toneClasses[display.tone]}`}
      role={display.tone === "error" ? "alert" : "status"}
    >
      <p className="font-semibold text-[#14211b]">{display.title}</p>
      <p className="mt-1">{display.description}</p>
    </article>
  );
}
