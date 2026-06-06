import { MOCK_POINTS_ACCOUNTS } from "@/data/mockPointsAccounts";

const numberFormatter = new Intl.NumberFormat("en-US");

const programTypeLabels = {
  airline: "Airline miles",
  credit_card: "Flexible points",
  hotel: "Hotel points",
} as const;

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Wallet
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Manual points wallet
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
          This page shows local mock balances for We Dont Need No Sticken
          Points. Manual add, edit, and delete actions come next; Firebase,
          account syncing, and live loyalty connections are intentionally not
          implemented here.
        </p>
      </section>

      <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
              Points accounts
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Mock balances
            </h3>
          </div>
          <p className="text-sm text-[#637268]">
            {MOCK_POINTS_ACCOUNTS.length} accounts
          </p>
        </div>

        {MOCK_POINTS_ACCOUNTS.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-md border border-[#d9e2d6]">
            <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-4 bg-[#edf3ea] px-4 py-3 text-sm font-semibold text-[#24382d] md:grid">
              <span>Program</span>
              <span>Type</span>
              <span>Balance</span>
              <span>Last updated</span>
            </div>
            <div className="divide-y divide-[#d9e2d6]">
              {MOCK_POINTS_ACCOUNTS.map((account) => (
                <article
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:items-center"
                  key={account.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#14211b]">
                      {account.programName}
                    </p>
                    <p className="mt-1 text-xs text-[#637268]">
                      {account.notes ?? "Manual mock balance"}
                    </p>
                  </div>
                  <p className="text-sm text-[#405147]">
                    <span className="font-semibold md:hidden">Type: </span>
                    {programTypeLabels[account.programType]}
                  </p>
                  <p className="text-sm font-semibold text-[#14211b]">
                    <span className="font-semibold md:hidden">Balance: </span>
                    {numberFormatter.format(account.balance)}
                  </p>
                  <p className="text-sm text-[#405147]">
                    <span className="font-semibold md:hidden">
                      Last updated:{" "}
                    </span>
                    {formatDate(account.lastUpdatedAt)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-[#b8c8b2] p-5 text-sm text-[#526158]">
            No points accounts yet. Manual add, edit, and delete actions will
            populate this wallet in the next phase.
          </div>
        )}
      </section>
    </div>
  );
}
