import type { PointValuation } from "@/types/decisions";

export const DEFAULT_POINT_VALUATIONS: PointValuation[] = [
  { programId: "chase-ultimate-rewards", centsPerPoint: 1.5, source: "default" },
  {
    programId: "american-express-membership-rewards",
    centsPerPoint: 1.5,
    source: "default",
  },
  { programId: "capital-one-miles", centsPerPoint: 1.3, source: "default" },
  { programId: "citi-thankyou-points", centsPerPoint: 1.3, source: "default" },
  { programId: "bilt-rewards", centsPerPoint: 1.4, source: "default" },
  { programId: "united-mileageplus", centsPerPoint: 1.4, source: "default" },
  { programId: "air-canada-aeroplan", centsPerPoint: 1.5, source: "default" },
  {
    programId: "virgin-atlantic-flying-club",
    centsPerPoint: 1.4,
    source: "default",
  },
  {
    programId: "air-france-klm-flying-blue",
    centsPerPoint: 1.4,
    source: "default",
  },
  { programId: "british-airways-avios", centsPerPoint: 1.3, source: "default" },
  { programId: "iberia-avios", centsPerPoint: 1.3, source: "default" },
  { programId: "qatar-avios", centsPerPoint: 1.3, source: "default" },
  {
    programId: "american-airlines-aadvantage",
    centsPerPoint: 1.4,
    source: "default",
  },
  { programId: "alaska-mileage-plan", centsPerPoint: 1.4, source: "default" },
  { programId: "emirates-skywards", centsPerPoint: 1.1, source: "default" },
  { programId: "singapore-krisflyer", centsPerPoint: 1.3, source: "default" },
  {
    programId: "turkish-miles-and-smiles",
    centsPerPoint: 1.3,
    source: "default",
  },
  { programId: "avianca-lifemiles", centsPerPoint: 1.3, source: "default" },
  { programId: "ana-mileage-club", centsPerPoint: 1.4, source: "default" },
];

export const FALLBACK_POINT_VALUATION_CENTS = 1.3;
