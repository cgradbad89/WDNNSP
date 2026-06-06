import Link from "next/link";
import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import {
  getTotalAirlineMiles,
  getTotalFlexiblePoints,
} from "@/lib/points/totals";
import { getTransferOptionsFromWallet } from "@/lib/transferPartners/lookup";

const numberFormatter = new Intl.NumberFormat("en-US");
const totalFlexiblePoints = getTotalFlexiblePoints(MOCK_POINTS_ACCOUNTS);
const totalAirlineMiles = getTotalAirlineMiles(MOCK_POINTS_ACCOUNTS);
const transferOptions = getTransferOptionsFromWallet(
  MOCK_POINTS_ACCOUNTS,
  TRANSFER_PARTNERS,
);

function formatTransferRatio(transferRatio: number): string {
  if (transferRatio === 1) {
    return "1:1";
  }

  if (transferRatio === 0.8) {
    return "5:4";
  }

  if (transferRatio === 0.75) {
    return "2:1.5";
  }

  return `${transferRatio}:1`;
}

const summaryCards = [
  {
    label: "Flexible points",
    value: numberFormatter.format(totalFlexiblePoints),
    note: "Mock manual balances across credit card currencies.",
  },
  {
    label: "Airline miles",
    value: numberFormatter.format(totalAirlineMiles),
    note: "Mock airline balances ready for future wallet CRUD.",
  },
  {
    label: "Transfer options",
    value: numberFormatter.format(transferOptions.length),
    note: "Active direct partners available from the mock wallet.",
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
              WDNNSP now has typed mock wallet data, static transfer partners,
              and helper-driven totals before adding persistence.
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
            Confirm award availability directly with the airline before
            transferring points. Transfers are often irreversible, and award
            space can disappear.
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

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Transfer opportunities
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Direct partners available from the mock wallet
            </h2>
          </div>
          <p className="text-sm text-[#637268]">
            Showing {Math.min(transferOptions.length, 8)} of{" "}
            {transferOptions.length} active options
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {transferOptions.slice(0, 8).map((partner) => (
            <article
              className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4"
              key={partner.id}
            >
              <p className="text-sm font-semibold text-[#24382d]">
                {partner.fromProgram}
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {partner.toProgram}
              </p>
              <p className="mt-2 text-sm text-[#637268]">
                Ratio: {formatTransferRatio(partner.transferRatio)} - Estimated time:{" "}
                {partner.estimatedTransferTime.replaceAll("_", " ")}
              </p>
            </article>
          ))}
        </div>

        {transferOptions.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] p-5 text-sm text-[#526158]">
            Add a flexible points account to see transfer opportunities here.
          </div>
        ) : null}
      </section>
    </div>
  );
}
