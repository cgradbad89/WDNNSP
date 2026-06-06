const resultLabels = [
  "Best Overall",
  "Best Value",
  "Lowest Fees",
  "Not Recommended",
];

export default function ResultsPage() {
  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
        Results
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        Recommendation results placeholder
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
        This page will show ranked cash and award options with practical
        explanations, points sufficiency, confidence labels, and visible
        transfer warnings.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {resultLabels.map((label) => (
          <span
            className="rounded-md bg-[#edf3ea] px-3 py-2 text-sm font-semibold text-[#2f6b4f]"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mt-6 rounded-md border border-[#d9e2d6] bg-[#fffdf6] p-4 text-sm leading-6 text-[#5d4c1d]">
        Confirm award availability directly with the airline before transferring
        points. Transfers are often irreversible, and award availability can
        disappear quickly.
      </div>
    </section>
  );
}
