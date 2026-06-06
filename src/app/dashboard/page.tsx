import Link from "next/link";

const summaryCards = [
  {
    label: "Flexible points",
    value: "Not connected",
    note: "Manual balances come next.",
  },
  {
    label: "Airline miles",
    value: "Not connected",
    note: "Add MileagePlus, Aeroplan, Avios, and more in Wallet.",
  },
  {
    label: "Recent searches",
    value: "No searches yet",
    note: "The trip search shell is ready for the next phase.",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-lg border border-[#d9e2d6] bg-white p-6 md:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Dashboard
          </p>
          <div className="space-y-3">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Decide which points and miles option to check first.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[#526158]">
              WDNNSP is starting with a practical shell for wallets, searches,
              recommendations, and settings before adding live provider data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-[#2f6b4f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25573f]"
              href="/wallet"
            >
              Open wallet
            </Link>
            <Link
              className="rounded-md border border-[#b8c8b2] px-4 py-2 text-sm font-semibold text-[#24382d] hover:bg-[#edf3ea]"
              href="/search"
            >
              Start search
            </Link>
          </div>
        </div>
        <aside className="rounded-md bg-[#edf3ea] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2f6b4f]">
            Transfer warning
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#405147]">
            Always confirm award availability directly with the airline program
            before transferring points. Transfers are often irreversible, and
            award space can disappear.
          </p>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article
            className="rounded-lg border border-[#d9e2d6] bg-white p-5"
            key={card.label}
          >
            <p className="text-sm font-medium text-[#526158]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {card.value}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#637268]">
              {card.note}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
