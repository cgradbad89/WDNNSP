import type { JSX } from "react";

export function AwardLeadsGuidance(): JSX.Element {
  return (
    <section
      aria-labelledby="award-leads-guidance-title"
      className="rounded-lg border border-[#ead99d] bg-[#fffdf6] p-5"
      role="status"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d4c1d]">
        Award leads found
      </p>
      <h3
        className="mt-2 text-xl font-semibold tracking-tight text-[#14211b]"
        id="award-leads-guidance-title"
      >
        Verify the award before estimating value
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526158]">
        Seats.aero found award options, but WDNNSP does not have comparable
        cash pricing or verified taxes for this search. Add a cash fare and
        verify taxes to estimate value.
      </p>
      <ol className="mt-4 grid gap-2 text-sm leading-6 text-[#526158] sm:grid-cols-2">
        <li>1. Check the award on the airline or loyalty-program site.</li>
        <li>2. Enter taxes/fees if shown.</li>
        <li>3. Enter a comparable cash fare to estimate CPP.</li>
        <li>4. Only transfer points after confirming availability.</li>
      </ol>
    </section>
  );
}
