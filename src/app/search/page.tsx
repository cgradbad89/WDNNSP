const searchFields = [
  "Origin and destination",
  "Departure and optional return dates",
  "Passengers, cabin, and max stops",
];

export default function SearchPage() {
  return (
    <section className="grid gap-6 rounded-lg border border-[#d9e2d6] bg-white p-6 md:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
          Search
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Trip search placeholder
        </h2>
        <p className="mt-3 text-base leading-7 text-[#526158]">
          WDNNSP will use this route for desired trip inputs before comparing
          mock cash and award options. Live flight APIs are deliberately out of
          scope for this scaffold.
        </p>
      </div>
      <div className="rounded-md bg-[#f7faf6] p-5">
        <h3 className="text-sm font-semibold text-[#24382d]">
          Planned search inputs
        </h3>
        <ul className="mt-4 space-y-3">
          {searchFields.map((field) => (
            <li
              className="rounded-md border border-[#d9e2d6] bg-white px-4 py-3 text-sm font-medium text-[#405147]"
              key={field}
            >
              {field}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
