import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { SavedSearch } from "@/types/search";

const cabinCashPriceByPassenger = {
  business: 3550,
  economy: 1250,
  first: 6200,
  premium_economy: 2100,
} as const;

const genericCashPriceByPassenger = {
  business: 2400,
  economy: 650,
  first: 3900,
  premium_economy: 1250,
} as const;

const tokyoAwardPointsByPassenger = {
  business: {
    aeroplan: 60000,
    united: 85000,
    virgin: 55000,
  },
  economy: {
    aeroplan: 35000,
    united: 44000,
    virgin: 32500,
  },
  first: {
    aeroplan: 105000,
    united: 130000,
    virgin: 90000,
  },
  premium_economy: {
    aeroplan: 50000,
    united: 65000,
    virgin: 45000,
  },
} as const;

const genericAwardPointsByPassenger = {
  business: {
    aeroplan: 45000,
    flyingBlue: 50000,
    united: 60000,
  },
  economy: {
    aeroplan: 18000,
    flyingBlue: 22000,
    united: 30000,
  },
  first: {
    aeroplan: 82000,
    flyingBlue: 95000,
    united: 110000,
  },
  premium_economy: {
    aeroplan: 32000,
    flyingBlue: 36000,
    united: 45000,
  },
} as const;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function includesAnyCode(codes: string[], expectedCodes: string[]): boolean {
  const normalizedCodes = new Set(codes.map(normalizeCode));

  return expectedCodes.some((code) => normalizedCodes.has(code));
}

function routeResemblesWashingtonToTokyo(search: SavedSearch): boolean {
  const hasWashingtonOrigin = includesAnyCode(search.originCodes, [
    "WAS",
    "DCA",
    "IAD",
    "BWI",
  ]);
  const hasTokyoDestination = includesAnyCode(search.destinationCodes, [
    "TYO",
    "HND",
    "NRT",
  ]);

  return hasWashingtonOrigin && hasTokyoDestination;
}

function getPassengerCount(search: SavedSearch): number {
  return Math.max(1, search.passengers);
}

function getPrimaryOrigin(search: SavedSearch): string {
  if (routeResemblesWashingtonToTokyo(search)) {
    return "IAD";
  }

  return normalizeCode(search.originCodes[0] ?? "IAD");
}

function getPrimaryDestination(search: SavedSearch): string {
  if (routeResemblesWashingtonToTokyo(search)) {
    return "HND";
  }

  return normalizeCode(search.destinationCodes[0] ?? "LHR");
}

function getMockDepartureDateTime(search: SavedSearch, time: string): string {
  return `${search.departDate}T${time}:00-04:00`;
}

function getMockArrivalDateTime(search: SavedSearch, time: string): string {
  return `${search.departDate}T${time}:00+09:00`;
}

export function getMockCashOptionForSearch(
  search: SavedSearch,
): CashFlightOption {
  const passengers = getPassengerCount(search);
  const isTokyoRoute = routeResemblesWashingtonToTokyo(search);
  const cashPriceByPassenger = isTokyoRoute
    ? cabinCashPriceByPassenger[search.cabin]
    : genericCashPriceByPassenger[search.cabin];

  return {
    id: `mock-cash-${getPrimaryOrigin(search)}-${getPrimaryDestination(search)}`,
    source: "mock",
    airline: isTokyoRoute ? "ANA / United benchmark" : "Mock cash benchmark",
    flightNumbers: isTokyoRoute ? ["UA803", "NH101"] : ["MOCK100"],
    origin: getPrimaryOrigin(search),
    destination: getPrimaryDestination(search),
    departureDateTime: getMockDepartureDateTime(search, "10:35"),
    arrivalDateTime: getMockArrivalDateTime(search, "15:20"),
    durationMinutes: isTokyoRoute ? 875 : 540,
    stops: isTokyoRoute ? 1 : Math.min(search.maxStops ?? 1, 1),
    cabin: search.cabin,
    cashPriceUsd: cashPriceByPassenger * passengers,
  };
}

export function getMockAwardOptionsForSearch(
  search: SavedSearch,
): AwardFlightOption[] {
  const passengers = getPassengerCount(search);
  const origin = getPrimaryOrigin(search);
  const destination = getPrimaryDestination(search);

  if (routeResemblesWashingtonToTokyo(search)) {
    const points = tokyoAwardPointsByPassenger[search.cabin];

    return [
      {
        id: `mock-aeroplan-${origin}-${destination}`,
        source: "mock",
        airlineProgram: "Air Canada Aeroplan",
        operatingAirline: "Air Canada / ANA",
        origin,
        destination,
        departureDateTime: getMockDepartureDateTime(search, "09:15"),
        arrivalDateTime: getMockArrivalDateTime(search, "14:50"),
        cabin: search.cabin,
        pointsRequired: points.aeroplan * passengers,
        taxesAndFeesUsd: 93 * passengers,
        transferSources: ["Chase", "Amex", "Capital One"],
        stops: 1,
        durationMinutes: 910,
        confidence: "high",
        lastCheckedAt: "Mock data",
      },
      {
        id: `mock-virgin-${origin}-${destination}`,
        source: "mock",
        airlineProgram: "Virgin Atlantic Flying Club",
        operatingAirline: "ANA partner award",
        origin,
        destination,
        departureDateTime: getMockDepartureDateTime(search, "07:30"),
        arrivalDateTime: getMockArrivalDateTime(search, "18:10"),
        cabin: search.cabin,
        pointsRequired: points.virgin * passengers,
        taxesAndFeesUsd: 206 * passengers,
        transferSources: ["Chase", "Amex", "Citi"],
        stops: 2,
        durationMinutes: 1030,
        confidence: "medium",
        lastCheckedAt: "Mock data",
      },
      {
        id: `mock-united-${origin}-${destination}`,
        source: "mock",
        airlineProgram: "United MileagePlus",
        operatingAirline: "United / ANA",
        origin,
        destination,
        departureDateTime: getMockDepartureDateTime(search, "11:10"),
        arrivalDateTime: getMockArrivalDateTime(search, "16:45"),
        cabin: search.cabin,
        pointsRequired: points.united * passengers,
        taxesAndFeesUsd: 24 * passengers,
        transferSources: ["Chase", "Bilt"],
        stops: 1,
        durationMinutes: 900,
        confidence: "high",
        lastCheckedAt: "Mock data",
      },
    ];
  }

  const points = genericAwardPointsByPassenger[search.cabin];

  return [
    {
      id: `mock-aeroplan-${origin}-${destination}`,
      source: "mock",
      airlineProgram: "Air Canada Aeroplan",
      operatingAirline: "Star Alliance mock",
      origin,
      destination,
      departureDateTime: getMockDepartureDateTime(search, "09:00"),
      arrivalDateTime: getMockArrivalDateTime(search, "21:10"),
      cabin: search.cabin,
      pointsRequired: points.aeroplan * passengers,
      taxesAndFeesUsd: 95 * passengers,
      transferSources: ["Chase", "Amex", "Capital One"],
      stops: 1,
      durationMinutes: 730,
      confidence: "medium",
      lastCheckedAt: "Mock data",
    },
    {
      id: `mock-flying-blue-${origin}-${destination}`,
      source: "mock",
      airlineProgram: "Air France-KLM Flying Blue",
      operatingAirline: "SkyTeam mock",
      origin,
      destination,
      departureDateTime: getMockDepartureDateTime(search, "13:20"),
      arrivalDateTime: getMockArrivalDateTime(search, "08:30"),
      cabin: search.cabin,
      pointsRequired: points.flyingBlue * passengers,
      taxesAndFeesUsd: 180 * passengers,
      transferSources: ["Chase", "Amex", "Capital One", "Citi"],
      stops: 1,
      durationMinutes: 790,
      confidence: "medium",
      lastCheckedAt: "Mock data",
    },
    {
      id: `mock-united-${origin}-${destination}`,
      source: "mock",
      airlineProgram: "United MileagePlus",
      operatingAirline: "United mock",
      origin,
      destination,
      departureDateTime: getMockDepartureDateTime(search, "16:45"),
      arrivalDateTime: getMockArrivalDateTime(search, "06:55"),
      cabin: search.cabin,
      pointsRequired: points.united * passengers,
      taxesAndFeesUsd: 24 * passengers,
      transferSources: ["Chase", "Bilt"],
      stops: Math.min(search.maxStops ?? 1, 1),
      durationMinutes: 705,
      confidence: "high",
      lastCheckedAt: "Mock data",
    },
  ];
}
