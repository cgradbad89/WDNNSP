"use client";

import type { JSX } from "react";
import type { ProviderStatusDisplay } from "@/lib/providers/display";

const toneClasses: Record<ProviderStatusDisplay["tone"], string> = {
  success: "border-[#b8c8b2] bg-[#f7faf6] text-[#2f6b4f]",
  info: "border-[#d9e2d6] bg-white text-[#526158]",
  warning: "border-[#ead99d] bg-[#fff9df] text-[#5d4c1d]",
  error: "border-[#f1b8a8] bg-[#fff3ef] text-[#8f3b24]",
};

interface ProviderStatusBannerProps {
  display: ProviderStatusDisplay;
}

export function ProviderStatusBanner({
  display,
}: ProviderStatusBannerProps): JSX.Element {
  const role = display.tone === "error" ? "alert" : "status";

  return (
    <section
      className={`rounded-lg border p-5 text-sm leading-6 ${toneClasses[display.tone]}`}
      role={role}
    >
      <p className="font-semibold text-[#14211b]">{display.title}</p>
      <p className="mt-1">{display.description}</p>
    </section>
  );
}
