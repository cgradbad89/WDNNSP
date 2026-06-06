import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Design Prototype | WDNNSP",
};

const walletSources = [
  {
    label: "Chase Ultimate Rewards",
    balance: "154,200",
    status: "Ready",
    detail: "Transfers to Aeroplan, United, Flying Blue",
  },
  {
    label: "United MileagePlus",
    balance: "71,500",
    status: "Short",
    detail: "Enough for saver economy, not business",
  },
  {
    label: "American Express MR",
    balance: "88,400",
    status: "Available",
    detail: "Useful backup through ANA or Flying Blue",
  },
];

const matchSignals = [
  "Transferable balance covers the strongest award lead",
  "Flexible dates keep the search inside likely saver windows",
  "Cash benchmark is high enough to justify points research",
];

const sourceRows = [
  {
    source: "Aeroplan",
    route: "WAS -> TYO",
    points: "115k",
    fees: "$82",
    confidence: "Medium",
    value: "3.1 cpp",
  },
  {
    source: "United",
    route: "IAD -> HND",
    points: "176k",
    fees: "$46",
    confidence: "High",
    value: "2.0 cpp",
  },
  {
    source: "Cash benchmark",
    route: "DCA -> HND",
    points: "$3,594",
    fees: "2 stops",
    confidence: "Mock",
    value: "Baseline",
  },
];

const savedSearches = [
  {
    name: "Tokyo fall business",
    route: "WAS to TYO",
    details: "Oct 18-29, 2 passengers, business",
  },
  {
    name: "London school break",
    route: "WAS to LON",
    details: "Mar 21-29, 4 passengers, economy",
  },
  {
    name: "Paris flexible week",
    route: "NYC to PAR",
    details: "May, +/- 5 days, premium economy",
  },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
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

export default function SearchDesignPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.08)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Design prototype
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Search smarter before moving points
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Build the trip once, then compare cash, award, and transfer paths
              before committing flexible points to an airline program.
            </p>
          </div>
          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[360px] sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Wallet readiness
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                3 sources
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Best lead
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                3.1 cpp
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                Confidence
              </p>
              <p className="mt-2 text-xl font-semibold text-[#14211b]">
                Medium
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <form className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.07)] md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#14211b]">
                Trip search
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#637268]">
                Design-only fields showing the intended search shape.
              </p>
            </div>
            <span className="rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
              Round trip
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Origin
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="WAS"
                type="text"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Destination
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="TYO"
                type="text"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Depart
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2026-10-18"
                type="date"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Return
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2026-10-29"
                type="date"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Cabin
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="Business"
              >
                <option>Economy</option>
                <option>Premium economy</option>
                <option>Business</option>
                <option>First</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Passengers
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2 passengers"
              >
                <option>1 passenger</option>
                <option>2 passengers</option>
                <option>3 passengers</option>
                <option>4 passengers</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Max stops
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="1 stop"
              >
                <option>Nonstop</option>
                <option>1 stop</option>
                <option>2 stops</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-[#24382d]">
              <input
                className="h-4 w-4 accent-[#2f6b4f]"
                defaultChecked
                type="checkbox"
              />
              Flexible +/- 3 days
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#24382d]">
              <input
                className="h-4 w-4 accent-[#2f6b4f]"
                defaultChecked
                type="checkbox"
              />
              Include airport groups
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f]"
              type="button"
            >
              <SearchIcon className="h-4 w-4" />
              Compare options
            </button>
            <button
              className="rounded-md border border-[#b8c8b2] px-5 py-3 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
              type="button"
            >
              Save this search
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#d9e2d6] bg-[#0f2f22] p-5 text-white shadow-[0_18px_50px_rgba(15,47,34,0.18)] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a8d5bd]">
                  Recommendation preview
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  Start with Aeroplan through Chase
                </h3>
              </div>
              <PlaneIcon className="h-9 w-9 shrink-0 text-[#a8d5bd]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Points
                </p>
                <p className="mt-2 text-xl font-semibold">115k</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Fees
                </p>
                <p className="mt-2 text-xl font-semibold">$82</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d5bd]">
                  Value
                </p>
                <p className="mt-2 text-xl font-semibold">3.1 cpp</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {matchSignals.map((signal) => (
                <div className="flex gap-3 text-sm leading-6" key={signal}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a8d5bd] text-[#0f2f22]">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[#e7f2eb]">{signal}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#ead99d] bg-[#fff9df] p-5">
            <p className="text-sm font-semibold text-[#5d4c1d]">
              Verify award space before transferring points.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f6028]">
              Transfers are often irreversible. Treat this prototype as a
              decision list, then confirm availability directly with the airline.
            </p>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Source comparison
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
                Options to investigate first
              </h3>
            </div>
            <p className="text-sm text-[#637268]">
              Static rows for layout review
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-[#d9e2d6]">
            <div className="hidden grid-cols-[1.1fr_0.9fr_0.7fr_0.6fr_0.7fr_0.7fr] bg-[#edf3ea] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#526158] md:grid">
              <span>Source</span>
              <span>Route</span>
              <span>Cost</span>
              <span>Fees</span>
              <span>Confidence</span>
              <span>Value</span>
            </div>
            {sourceRows.map((row) => (
              <div
                className="grid gap-3 border-t border-[#d9e2d6] px-4 py-4 text-sm first:border-t-0 md:grid-cols-[1.1fr_0.9fr_0.7fr_0.6fr_0.7fr_0.7fr] md:items-center"
                key={`${row.source}-${row.route}`}
              >
                <div>
                  <p className="font-semibold text-[#24382d]">{row.source}</p>
                </div>
                <p className="font-medium text-[#526158]">{row.route}</p>
                <p className="font-semibold text-[#14211b]">{row.points}</p>
                <p className="font-medium text-[#526158]">{row.fees}</p>
                <p>
                  <span className="rounded-md bg-[#edf3ea] px-2.5 py-1 text-xs font-semibold text-[#2f6b4f]">
                    {row.confidence}
                  </span>
                </p>
                <p className="font-semibold text-[#14211b]">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Wallet readiness
          </p>
          <div className="mt-4 space-y-3">
            {walletSources.map((source) => (
              <article
                className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
                key={source.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#24382d]">
                      {source.label}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-[#637268]">
                      {source.detail}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#2f6b4f]">
                    {source.status}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[#14211b]">
                  {source.balance}
                </p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Saved search rhythm
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Recent prototypes for this flow
            </h3>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-[#b8c8b2] px-4 py-2 text-sm font-semibold text-[#24382d] transition hover:bg-[#edf3ea]"
            type="button"
          >
            View all
            <ArrowIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {savedSearches.map((search) => (
            <article
              className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
              key={search.name}
            >
              <p className="text-sm font-semibold text-[#24382d]">
                {search.name}
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
                {search.route}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#637268]">
                {search.details}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
