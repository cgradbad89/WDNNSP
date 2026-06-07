import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Search Design Prototype | WDNNSP",
};

type AirportSuggestion = {
  code: string;
  name: string;
  detail: string;
  kind: "airport" | "group";
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

const airportSuggestions: AirportSuggestion[] = [
  {
    code: "WAS",
    name: "Washington, DC Area",
    detail: "DCA · IAD · BWI",
    kind: "group",
  },
  {
    code: "IAD",
    name: "Washington Dulles International",
    detail: "Washington, DC Area",
    kind: "airport",
  },
  {
    code: "DCA",
    name: "Reagan National",
    detail: "Washington, DC Area",
    kind: "airport",
  },
  {
    code: "TYO",
    name: "Tokyo Area",
    detail: "HND · NRT",
    kind: "group",
  },
  {
    code: "HND",
    name: "Tokyo Haneda",
    detail: "Tokyo, Japan",
    kind: "airport",
  },
  {
    code: "NRT",
    name: "Tokyo Narita",
    detail: "Tokyo, Japan",
    kind: "airport",
  },
];

const validationExamples = [
  {
    label: "Valid selected airport group",
    route: "WAS",
    message: "WAS expands to DCA, IAD, and BWI.",
    tone: "success",
  },
  {
    label: "Valid selected airport",
    route: "HND",
    message: "Tokyo Haneda searches only HND.",
    tone: "success",
  },
  {
    label: "Unsupported airport/code",
    route: "ZZZ",
    message: "Choose a supported airport or metro area.",
    tone: "error",
  },
  {
    label: "Same origin and destination",
    route: "WAS to WAS",
    message: "Origin and destination cannot be the same.",
    tone: "error",
  },
];

const savedSearchExamples = [
  {
    name: "Tokyo Spring Trip",
    route: "WAS to TYO",
    details: "Business · 2 passengers · +/- 3 days",
  },
  {
    name: "London Summer",
    route: "IAD to LON",
    details: "Economy · 2 passengers · Nonstop preferred",
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

function FieldStatus({ children }: { children: string }) {
  return (
    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6b4f]">
      {children}
    </p>
  );
}

function SuggestionBadge({ kind }: { kind: AirportSuggestion["kind"] }) {
  const badgeClassName =
    kind === "group"
      ? "border-[#b8d2c1] bg-[#edf7ef] text-[#2f6b4f]"
      : "border-[#d8dfd4] bg-white text-[#526158]";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${badgeClassName}`}
    >
      {kind === "group" ? "Airport group" : "Airport"}
    </span>
  );
}

function AirportSuggestionRow({
  suggestion,
}: {
  suggestion: AirportSuggestion;
}) {
  const rowClassName =
    suggestion.kind === "group"
      ? "border-[#b8d2c1] bg-[#f3faf4]"
      : "border-[#edf3ea] bg-white";

  return (
    <li
      aria-selected={suggestion.code === "WAS"}
      className={`rounded-md border p-3 ${rowClassName}`}
      role="option"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-semibold tracking-tight text-[#14211b]">
              {suggestion.code}
            </span>
            <span className="text-sm font-semibold text-[#24382d]">
              {suggestion.name}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#637268]">
            {suggestion.detail}
          </p>
        </div>
        <SuggestionBadge kind={suggestion.kind} />
      </div>
    </li>
  );
}

function AirportSuggestionDropdown({ id }: { id: string }) {
  return (
    <div
      id={id}
      className="mt-2 rounded-md border border-[#b8c8b2] bg-white p-2 shadow-[0_16px_34px_rgba(31,63,45,0.14)]"
      role="listbox"
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#637268]">
          Supported matches
        </p>
        <p className="text-xs font-semibold text-[#2f6b4f]">6 shown</p>
      </div>
      <ul className="grid gap-2">
        {airportSuggestions.map((suggestion) => (
          <AirportSuggestionRow
            key={`${suggestion.kind}-${suggestion.code}`}
            suggestion={suggestion}
          />
        ))}
      </ul>
    </div>
  );
}

function AirportAutocompleteField({
  defaultValue,
  helper,
  id,
  isActive = false,
  label,
  status,
}: {
  defaultValue: string;
  helper: string;
  id: string;
  isActive?: boolean;
  label: string;
  status: string;
}) {
  const suggestionListId = `${id}-suggestions`;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#24382d]">{label}</span>
      <input
        aria-autocomplete="list"
        aria-controls={isActive ? suggestionListId : undefined}
        aria-expanded={isActive}
        aria-haspopup="listbox"
        className="mt-2 w-full rounded-md border border-[#b8c8b2] bg-[#f9fbf8] px-4 py-3 text-base font-semibold uppercase text-[#14211b] outline-none transition focus:border-[#2f6b4f] focus:bg-white focus:ring-4 focus:ring-[#2f6b4f]/10"
        defaultValue={defaultValue}
        id={id}
        role="combobox"
        type="text"
      />
      <FieldStatus>{status}</FieldStatus>
      <p className="mt-1 text-sm leading-6 text-[#637268]">{helper}</p>
      {isActive ? <AirportSuggestionDropdown id={suggestionListId} /> : null}
    </label>
  );
}

function ValidationExample({
  example,
}: {
  example: (typeof validationExamples)[number];
}) {
  const isError = example.tone === "error";

  return (
    <article
      className={`rounded-md border p-4 ${
        isError
          ? "border-[#e2b6ac] bg-[#fff8f6]"
          : "border-[#b8d2c1] bg-[#f3faf4]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.12em] ${
          isError ? "text-[#9b3c2f]" : "text-[#2f6b4f]"
        }`}
      >
        {example.label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-[#14211b]">
        {example.route}
      </p>
      <p
        className={`mt-2 text-sm font-semibold leading-6 ${
          isError ? "text-[#8f2d2d]" : "text-[#2f6b4f]"
        }`}
      >
        {example.message}
      </p>
    </article>
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
            <AirportAutocompleteField
              defaultValue="WAS"
              helper="Airport groups search every listed airport. Choose an individual airport when the trip should stay airport-specific."
              id="design-origin-airport"
              isActive
              label="From"
              status="Selected group"
            />
            <AirportAutocompleteField
              defaultValue="HND"
              helper="Individual airports search only that airport and still show the related metro area for context."
              id="design-destination-airport"
              label="To"
              status="Selected airport"
            />
          </div>

          <section
            aria-label="Airport validation examples"
            className="mt-5 rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2f6b4f]">
                  Validation states
                </p>
                <p className="mt-1 text-sm leading-6 text-[#637268]">
                  The real form should accept supported airport groups and
                  individual airports, then block unsupported or duplicate
                  routes.
                </p>
              </div>
              <span className="w-fit rounded-md bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#526158]">
                Design only
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {validationExamples.map((example) => (
                <ValidationExample example={example} key={example.label} />
              ))}
            </div>
          </section>

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
              Airport selection rules
            </p>
            <div className="mt-4 space-y-3">
              <article className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
                <SuggestionBadge kind="group" />
                <p className="mt-3 text-sm font-semibold text-[#24382d]">
                  Use groups for flexible metro searches.
                </p>
                <p className="mt-1 text-sm leading-6 text-[#637268]">
                  WAS expands to DCA, IAD, and BWI.
                </p>
              </article>
              <article className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4">
                <SuggestionBadge kind="airport" />
                <p className="mt-3 text-sm font-semibold text-[#24382d]">
                  Use airports for specific terminals.
                </p>
                <p className="mt-1 text-sm leading-6 text-[#637268]">
                  HND searches Tokyo Haneda only.
                </p>
              </article>
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

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Saved searches
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#14211b]">
              Run a previous trip search
            </h3>
          </div>
          <p className="text-sm text-[#637268]">
            Saved searches stay below the new search form.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {savedSearchExamples.map((search) => (
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
