// Maps a Seats.aero Partner API `Source` slug (as returned on
// `SeatsAeroAvailabilityResult.Source` / `Route.Source`) to the airline
// mileage-program identifier used as `TransferPartner.toProgram` in
// data/transferPartners.ts.
//
// The slug list and program names below were confirmed against the live
// Seats.aero developer docs (https://developers.seats.aero, Concepts page)
// during this session (2026-08-12) rather than assumed from the task's
// reference table, which used several slugs/names that do not match the
// documented API:
//   - Copa's slug is `connectmiles`, not `copa`.
//   - GOL's slug is `smiles`, not `gol`.
//   - SAS's slug is `eurobonus`, not `sas`.
//   - Virgin Australia's slug is `velocity`, not `virginaustralia`.
//   - Alaska's program is documented as "Alaska Mileage Plan" — the docs do
//     not show an "Atmos Rewards" rename. data/transferPartners.ts also has
//     no Alaska entry either way, so this resolves to zero card partners
//     regardless of naming and needs no reconciliation right now.
//   - The docs also list `frontier` and `spirit` sources, which are
//     included below for completeness even though neither is a
//     card-transferable mileage currency.
//
// Where a Seats.aero program has known transferable card partners in
// data/transferPartners.ts, the value below is set to the exact
// `toProgram` string used there (so the reverse lookup matches). Where it
// does not, the value is a descriptive program name from the Seats.aero
// docs — the reverse lookup will correctly resolve those to an empty
// array rather than erroring.
export type SeatsAeroSourceMap = Record<string, string>; // Seats.aero source slug -> program identifier matching data/transferPartners.ts

export const SEATS_AERO_SOURCE_MAP: SeatsAeroSourceMap = {
  aeroplan: "Air Canada Aeroplan", // matches data/transferPartners.ts
  aeromexico: "Aeromexico Club Premier",
  alaska: "Alaska Mileage Plan",
  american: "American Airlines AAdvantage", // matches data/transferPartners.ts
  azul: "Azul TudoAzul",
  connectmiles: "Copa Airlines ConnectMiles",
  delta: "Delta SkyMiles",
  emirates: "Emirates Skywards", // matches data/transferPartners.ts
  ethiopian: "Ethiopian Airlines ShebaMiles",
  etihad: "Etihad Guest",
  eurobonus: "SAS EuroBonus",
  finnair: "Finnair Plus",
  flyingblue: "Air France-KLM Flying Blue", // matches data/transferPartners.ts
  frontier: "Frontier Airlines Miles",
  jetblue: "JetBlue TrueBlue",
  lufthansa: "Lufthansa Miles&More",
  qantas: "Qantas Frequent Flyer",
  qatar: "Qatar Avios", // matches data/transferPartners.ts (Qatar Privilege Club's currency is Avios)
  saudia: "Saudia AlFursan",
  singapore: "Singapore KrisFlyer", // matches data/transferPartners.ts
  smiles: "GOL Smiles",
  spirit: "Spirit Airlines Free Spirit",
  turkish: "Turkish Miles&Smiles", // matches data/transferPartners.ts
  united: "United MileagePlus", // matches data/transferPartners.ts
  velocity: "Virgin Australia Velocity",
  virginatlantic: "Virgin Atlantic Flying Club", // matches data/transferPartners.ts
};
