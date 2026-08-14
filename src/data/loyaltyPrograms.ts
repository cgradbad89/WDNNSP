import type { CanonicalLoyaltyProgram } from "@/types/loyaltyPrograms";

export const LOYALTY_PROGRAM_REGISTRY: CanonicalLoyaltyProgram[] = [
  {
    id: "united-mileageplus",
    displayName: "United MileagePlus",
    providerAliases: ["United", "MileagePlus", "United Airlines"],
    knownExternalSlugs: ["united", "united-mileageplus", "mileageplus"],
    providerMetadata: {
      "seats-aero": {
        externalSlugs: ["united"],
      },
    },
  },
  {
    id: "air-canada-aeroplan",
    displayName: "Air Canada Aeroplan",
    providerAliases: ["Aeroplan", "Air Canada"],
    knownExternalSlugs: ["aeroplan", "air-canada-aeroplan", "aircanada"],
    providerMetadata: {
      "seats-aero": {
        externalSlugs: ["aeroplan"],
      },
    },
  },
  {
    id: "virgin-atlantic-flying-club",
    displayName: "Virgin Atlantic Flying Club",
    providerAliases: ["Virgin Atlantic", "Virgin", "Flying Club"],
    knownExternalSlugs: [
      "virgin",
      "virgin-atlantic",
      "virgin-atlantic-flying-club",
    ],
    providerMetadata: {
      "seats-aero": {
        externalSlugs: ["virgin"],
      },
    },
  },
  {
    id: "air-france-klm-flying-blue",
    displayName: "Air France-KLM Flying Blue",
    providerAliases: ["Flying Blue", "Air France", "KLM"],
    knownExternalSlugs: [
      "flyingblue",
      "flying-blue",
      "air-france-klm-flying-blue",
    ],
    providerMetadata: {
      "seats-aero": {
        externalSlugs: ["flyingblue", "flying-blue"],
      },
    },
  },
  {
    id: "british-airways-avios",
    displayName: "British Airways Avios",
    providerAliases: ["British Airways", "BA Avios", "Avios"],
    knownExternalSlugs: ["ba", "british-airways", "british-airways-avios"],
  },
  {
    id: "iberia-avios",
    displayName: "Iberia Avios",
    providerAliases: ["Iberia"],
    knownExternalSlugs: ["iberia", "iberia-avios"],
  },
  {
    id: "qatar-avios",
    displayName: "Qatar Avios",
    providerAliases: ["Qatar Airways", "Qatar"],
    knownExternalSlugs: ["qatar", "qatar-airways", "qatar-avios"],
  },
  {
    id: "american-airlines-aadvantage",
    displayName: "American Airlines AAdvantage",
    providerAliases: ["American Airlines", "AAdvantage"],
    knownExternalSlugs: ["american", "aa", "aadvantage"],
  },
  {
    id: "alaska-mileage-plan",
    displayName: "Alaska Mileage Plan",
    providerAliases: ["Alaska Airlines", "Alaska"],
    knownExternalSlugs: ["alaska", "alaska-mileage-plan"],
  },
  {
    id: "emirates-skywards",
    displayName: "Emirates Skywards",
    providerAliases: ["Emirates"],
    knownExternalSlugs: ["emirates", "emirates-skywards"],
  },
  {
    id: "singapore-krisflyer",
    displayName: "Singapore KrisFlyer",
    providerAliases: ["Singapore Airlines", "KrisFlyer"],
    knownExternalSlugs: ["singapore", "krisflyer", "singapore-krisflyer"],
  },
  {
    id: "turkish-miles-and-smiles",
    displayName: "Turkish Miles&Smiles",
    providerAliases: ["Turkish Airlines", "Miles&Smiles"],
    knownExternalSlugs: ["turkish", "miles-and-smiles"],
  },
  {
    id: "avianca-lifemiles",
    displayName: "Avianca LifeMiles",
    providerAliases: ["Avianca", "LifeMiles"],
    knownExternalSlugs: ["avianca", "lifemiles", "avianca-lifemiles"],
  },
  {
    id: "ana-mileage-club",
    displayName: "ANA Mileage Club",
    providerAliases: ["ANA", "All Nippon Airways"],
    knownExternalSlugs: ["ana", "ana-mileage-club"],
  },
];
