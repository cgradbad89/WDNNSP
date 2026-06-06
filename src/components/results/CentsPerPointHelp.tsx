import type { JSX } from "react";

const cppHelpText =
  "cpp means cents per point. It estimates redemption value by subtracting taxes and fees from the comparable cash price, then dividing by the points required. Higher is usually better, but route quality, fees, and transfer risk still matter.";

export function CentsPerPointHelp(): JSX.Element {
  return (
    <span className="group relative inline-flex items-center gap-1 align-middle normal-case tracking-normal">
      <span>cpp</span>
      <button
        aria-label="What does cpp mean?"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#b8c8b2] bg-white text-[11px] font-bold leading-none text-[#2f6b4f] outline-none transition hover:bg-[#edf3ea] focus:bg-[#edf3ea] focus:ring-2 focus:ring-[#2f6b4f]/20"
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-0 top-7 z-20 hidden w-72 rounded-md border border-[#b8c8b2] bg-white p-3 text-left text-xs font-medium leading-5 tracking-normal text-[#405147] shadow-[0_14px_34px_rgba(31,63,45,0.16)] group-focus-within:block group-hover:block"
        role="tooltip"
      >
        {cppHelpText}
      </span>
    </span>
  );
}
