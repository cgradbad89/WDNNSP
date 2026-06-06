const settingsAreas = [
  "Profile and sign-in settings",
  "Default cabin and passenger preferences",
  "Future saved-search notification preferences",
];

export default function SettingsPage() {
  return (
    <section className="rounded-lg border border-[#d9e2d6] bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
        Settings
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        Settings placeholder
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#526158]">
        Settings will stay focused on personal app preferences for John and his
        dad. Role-based permissions, payment settings, and account syncing are
        out of scope for the MVP.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {settingsAreas.map((area) => (
          <div
            className="rounded-md border border-[#d9e2d6] bg-[#f7faf6] p-4 text-sm font-medium text-[#405147]"
            key={area}
          >
            {area}
          </div>
        ))}
      </div>
    </section>
  );
}
