const walletPlaceholders = [
  "Add manual credit card points balances.",
  "Add airline mileage balances.",
  "Track last updated dates for every account.",
];

export default function WalletPage() {
  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
        Wallet
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        Points wallet placeholder
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
        This page will hold the manual balances for We Dont Need No Sticken
        Points. Firebase, account syncing, and live loyalty connections are
        intentionally not implemented in this scaffold.
      </p>
      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {walletPlaceholders.map((item) => (
          <li
            className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 text-sm font-medium text-[#405147]"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
