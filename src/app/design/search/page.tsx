import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Search Design Prototype | WDNNSP",
};

const walletReadiness = [
  {
    label: "Flexible points",
    value: "242,600",
    note: "Chase and Amex can cover likely transfer paths.",
  },
  {
    label: "Airline miles",
    value: "90,000",
    note: "Useful for direct United or Aeroplan checks.",
  },
];

const searchDetails = [
  { label: "Trip name", value: "Tokyo Spring Trip" },
  { label: "From", value: "WAS" },
  { label: "To", value: "TYO" },
  { label: "Dates", value: "May 1-10" },
  { label: "Cabin", value: "Business" },
  { label: "Passengers", value: "2" },
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
              Search design prototype
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#14211b] md:text-4xl">
              Run a trip search first
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#526158]">
              Enter the trip criteria, run the comparison, and review results
              before deciding whether the search is worth saving.
            </p>
          </div>

          <div className="grid min-w-full gap-3 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-3 sm:min-w-[360px] sm:grid-cols-2">
            {walletReadiness.map((item) => (
              <article key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#14211b]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#637268]">
                  {item.note}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form className="rounded-lg border border-[#d9e2d6] bg-white p-5 shadow-[0_18px_50px_rgba(31,63,45,0.07)] md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#14211b]">
                Trip search
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#637268]">
                Run the search first. You can save it from the results page if
                it looks useful.
              </p>
            </div>
            <span className="w-fit rounded-md bg-[#edf3ea] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
              Round trip
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-[#24382d]">
              Trip name optional
            </span>
            <input
              className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
              defaultValue="Tokyo Spring Trip"
              type="text"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                From
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="WAS"
                type="text"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">To</span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="TYO"
                type="text"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Trip type
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="Round trip"
              >
                <option>Round trip</option>
                <option>One way</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Depart
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2027-05-01"
                type="date"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Return
              </span>
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2027-05-10"
                type="date"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
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
              <input
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="2"
                min="1"
                type="number"
              />
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
            <label className="block">
              <span className="text-sm font-semibold text-[#24382d]">
                Flexibility
              </span>
              <select
                className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-sm font-semibold text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
                defaultValue="+/- 3 days"
              >
                <option>Exact dates</option>
                <option>+/- 1 day</option>
                <option>+/- 3 days</option>
                <option>+/- 5 days</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(47,107,79,0.18)] transition hover:bg-[#25573f]"
              data-testid="design-search-submit"
              href="/design/results"
            >
              <SearchIcon className="h-4 w-4" />
              Search
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <p className="text-sm leading-6 text-[#637268]">
              Prototype action: opens the Results design with mock comparison
              data.
            </p>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Current search
            </p>
            <div className="mt-4 grid gap-3">
              {searchDetails.map((detail) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-[#edf3ea] pb-3 last:border-b-0 last:pb-0"
                  key={detail.label}
                >
                  <span className="text-sm text-[#637268]">{detail.label}</span>
                  <span className="text-sm font-semibold text-[#14211b]">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#d9e2d6] bg-[#f7faf6] p-5">
            <p className="text-sm font-semibold text-[#24382d]">
              Save happens after results.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#637268]">
              The Results page should prove there is a useful booking path
              before adding this trip to saved searches.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
