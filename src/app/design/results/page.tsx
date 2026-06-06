import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Results Design Prototype | WDNNSP",
};

const cppHelpText =
  "cpp means cents per point. It estimates redemption value by subtracting taxes and fees from the comparable cash price, then dividing by the points required. Higher is usually better, but route quality, fees, and transfer risk still matter.";

const summaryItems = [
  { label: "Saved search", value: "Tokyo Spring Trip" },
  { label: "Route", value: "WAS → TYO" },
  { label: "Dates", value: "May 1-10" },
  { label: "Cabin", value: "Business" },
  { label: "Passengers", value: "2" },
];

const recommendationBullets = [
  "Strong redemption value against a high business-class cash benchmark.",
  "Chase and Amex both provide direct transfer paths to Aeroplan.",
  "Taxes and fees are moderate for the route and cabin.",
  "One-stop routing keeps convenience acceptable for the value.",
];

const rankedOptions = [
  {
    program: "Air Canada Aeroplan",
    label: "Best Overall",
    route: "WAS → TYO",
    cabin: "Business",
    cost: "150,000 pts",
    fees: "$186",
    stops: "1 stop",
    transferSources: "Chase, Amex, Capital One",
    cpp: "4.6",
    tone: "bg-[#edf3ea] text-[#2f6b4f]",
  },
  {
    program: "Virgin Atlantic Flying Club",
    label: "Best Value",
    route: "IAD -> HND",
    cabin: "Business",
    cost: "120,000 pts",
    fees: "$412",
    stops: "1 stop",
    transferSources: "Chase, Amex, Citi",
    cpp: "5.6",
    tone: "bg-[#eef6f0] text-[#2f6b4f]",
  },
  {
    program: "United MileagePlus",
    label: "Lowest Fees",
    route: "IAD -> NRT",
    cabin: "Business",
    cost: "176,000 pts",
    fees: "$48",
    stops: "1 stop",
    transferSources: "Chase, Bilt",
    cpp: "4.0",
    tone: "bg-[#edf3ea] text-[#2f6b4f]",
  },
  {
    program: "Cash Fare Benchmark",
    label: "Pay Cash Check",
    route: "WAS → TYO",
    cabin: "Business",
    cost: "$7,100",
    fees: "Included",
    stops: "1 stop",
    transferSources: "No transfer needed",
    cpp: undefined,
    tone: "bg-[#fff9df] text-[#5d4c1d]",
  },
];

const scoringWeights = [
  { label: "Value", value: "35%" },
  { label: "Points fit", value: "20%" },
  { label: "Convenience", value: "20%" },
  { label: "Availability confidence", value: "15%" },
  { label: "Transfer simplicity", value: "10%" },
];

function CppHelp() {
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

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.5 12.5h16.2c.8 0 1.1 1 .4 1.4l-4.2 2.7-1 3.4h-2.1l.4-4.9-4.9 2.4H6.1l2.8-4.3-5.4-.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m9 12.4-2.8-4h2.2l5.2 3.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m4.2 10.4 3.4 3.2 8.2-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function ResultsDesignPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Results design prototype
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Best option for Tokyo Spring Trip
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Mock cash and award data are compared here to show how WDNNSP
              will rank useful redemption paths before any live providers are
              connected.
            </p>
          </div>
          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[420px] sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Recommendation score
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">88</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Cents-per-point value <CppHelp />
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                4.6
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Cash benchmark
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                $7,100
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {summaryItems.map((item) => (
          <article
            className="rounded-lg border border-[#d9e2d6] bg-white p-4"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
            <article className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Lowest reasonable cash fare
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-[#14211b]">
                $7,100
              </p>
              <p className="mt-3 text-sm leading-6 text-[#637268]">
                Lowest reasonable mock business fare for two travelers. This
                benchmark is used to calculate redemption value after taxes and
                fees.
              </p>
            </article>

            <article className="rounded-lg border border-[#d9e2d6] bg-[#0f2f22] p-5 text-white shadow-[0_18px_50px_rgba(15,47,34,0.18)] md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a8d5bd]">
                    Best Overall
                  </p>
                  <h3 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight">
                    Transfer Chase or Amex points to Air Canada Aeroplan
                  </h3>
                </div>
                <PlaneIcon className="h-10 w-10 shrink-0 text-[#a8d5bd]" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                <div className="rounded-md border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                    Score
                  </p>
                  <p className="mt-2 text-xl font-semibold">88</p>
                </div>
                <div className="rounded-md border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                    Miles needed
                  </p>
                  <p className="mt-2 text-xl font-semibold">150k</p>
                </div>
                <div className="rounded-md border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                    Taxes and fees
                  </p>
                  <p className="mt-2 text-xl font-semibold">$186</p>
                </div>
                <div className="rounded-md border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                    Cash
                  </p>
                  <p className="mt-2 text-xl font-semibold">$7,100</p>
                </div>
                <div className="rounded-md border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                    Cents-per-point value <CppHelp />
                  </p>
                  <p className="mt-2 text-xl font-semibold">4.6</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {recommendationBullets.map((bullet) => (
                  <div className="flex gap-3 text-sm leading-6" key={bullet}>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a8d5bd] text-[#0f2f22]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[#e7f2eb]">{bullet}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5 md:p-6">
            <p className="text-sm font-semibold text-[#5d4c1d]">
              Confirm award availability directly with the airline before
              transferring points. Transfers are often irreversible, and award
              space can disappear.
            </p>
          </section>

          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                  Ranked options
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
                  Booking paths to investigate first
                </h3>
              </div>
              <p className="text-sm text-[#637268]">
                Mock data for design review
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {rankedOptions.map((option) => (
                <article
                  className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                  key={option.program}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold tracking-tight text-[#14211b]">
                          {option.program}
                        </h4>
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${option.tone}`}
                        >
                          {option.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#637268]">
                        {option.route} - {option.cabin} - {option.stops}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-[#14211b]">
                      {option.cost}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
                        Taxes / fees
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#14211b]">
                        {option.fees}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
                        Transfer sources
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#14211b]">
                        {option.transferSources}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
                        Stops
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#14211b]">
                        {option.stops}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#637268]">
                        Cents-per-point value <CppHelp />
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#14211b]">
                        {option.cpp ? option.cpp : "Cash baseline"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Filters
            </p>
            <div className="mt-4 space-y-3">
              {["Business cabin", "1 stop or less", "Transferable points"].map(
                (filter) => (
                  <label
                    className="flex items-center gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] px-3 py-3 text-sm font-semibold text-[#24382d]"
                    key={filter}
                  >
                    <input
                      className="h-4 w-4 accent-[#2f6b4f]"
                      defaultChecked
                      type="checkbox"
                    />
                    {filter}
                  </label>
                ),
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Scoring weights
            </p>
            <div className="mt-4 space-y-3">
              {scoringWeights.map((weight) => (
                <div
                  className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3"
                  key={weight.label}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[#24382d]">
                      {weight.label}
                    </span>
                    <span className="font-semibold text-[#2f6b4f]">
                      {weight.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Next actions
            </p>
            <div className="mt-4 space-y-3">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#25573f]"
                type="button"
              >
                Check Aeroplan
                <ArrowIcon className="h-4 w-4" />
              </button>
              <button
                className="w-full rounded-md border border-[#b8c8b2] px-4 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
                type="button"
              >
                Compare cash dates
              </button>
              <button
                className="w-full rounded-md border border-[#b8c8b2] px-4 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
                type="button"
              >
                Save recommendation
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
