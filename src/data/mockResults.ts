import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption, RouteDetail } from "@/types/flights";
import type {
  FreshnessMetadata,
  PriceMoney,
  ProviderLimitation,
  ProviderResultReference,
} from "@/types/providerResults";
import type { SavedSearch } from "@/types/search";
import { createFlightItineraryFromRouteDetail } from "@/lib/results/routeDetails";

export const MOCK_RESULT_SEARCHED_AT = "2026-06-12T00:00:00.000Z";

const MOCK_CASH_PROVIDER: Omit<ProviderResultReference, "resultId"> = {
  providerId: "mock-cash",
  providerLabel: "Mock Cash Provider",
};

const MOCK_AWARD_PROVIDER: Omit<ProviderResultReference, "resultId"> = {
  providerId: "mock-awards",
  providerLabel: "Mock Award Provider",
};

const MOCK_FRESHNESS: FreshnessMetadata = {
  searchedAt: MOCK_RESULT_SEARCHED_AT,
  lastCheckedAt: MOCK_RESULT_SEARCHED_AT,
  isLive: false,
  isStale: false,
};

const MOCK_DATA_LIMITATION: ProviderLimitation = {
  code: "mock_data",
  severity: "info",
  message: "Using deterministic mock data until live providers are added.",
};

const MOCK_AWARD_VERIFY_LIMITATION: ProviderLimitation = {
  code: "verify_award_availability",
  severity: "warning",
  message: "Verify award availability directly before transferring points.",
};

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

const awardProgramIds: Record<string, string> = {
  "air canada aeroplan": "air-canada-aeroplan",
  "air france-klm flying blue": "air-france-klm-flying-blue",
  "united mileageplus": "united-mileageplus",
  "virgin atlantic flying club": "virgin-atlantic-flying-club",
};

function createUsdMoney(amount: number): PriceMoney {
  return {
    amount,
    currency: "USD",
  };
}

function addMockCashMetadata(option: CashFlightOption): CashFlightOption {
  const price = createUsdMoney(option.cashPriceUsd);

  return {
    ...option,
    provider: {
      ...MOCK_CASH_PROVIDER,
      resultId: option.id,
    },
    freshness: { ...MOCK_FRESHNESS },
    price,
    priceBreakdown: {
      total: price,
    },
    ...(option.routeDetail
      ? { itinerary: createFlightItineraryFromRouteDetail(option.routeDetail) }
      : {}),
    limitations: [MOCK_DATA_LIMITATION],
  };
}

function getAwardProgramId(airlineProgram: string): string | undefined {
  return awardProgramIds[airlineProgram.trim().toLowerCase()];
}

function addMockAwardMetadata(
  option: AwardFlightOption,
  passengers: number,
): AwardFlightOption {
  const fees = createUsdMoney(option.taxesAndFeesUsd);
  const sourceProgramId = getAwardProgramId(option.airlineProgram);

  return {
    ...option,
    provider: {
      ...MOCK_AWARD_PROVIDER,
      resultId: option.id,
    },
    freshness: { ...MOCK_FRESHNESS },
    availabilityStatus: "available",
    availableSeats: passengers,
    fees,
    taxesAndFees: fees,
    ...(sourceProgramId ? { sourceProgramId } : {}),
    sourceProgramLabel: option.airlineProgram,
    marketingAirline: option.operatingAirline ?? option.airlineProgram,
    ...(option.routeDetail
      ? { itinerary: createFlightItineraryFromRouteDetail(option.routeDetail) }
      : {}),
    limitations: [MOCK_DATA_LIMITATION, MOCK_AWARD_VERIFY_LIMITATION],
  };
}

function addMockAwardMetadataToOptions(
  options: AwardFlightOption[],
  passengers: number,
): AwardFlightOption[] {
  return options.map((option) => addMockAwardMetadata(option, passengers));
}

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

function createTwoSegmentRouteDetail({
  firstDurationMinutes,
  firstFlightNumber,
  layoverAirport,
  layoverDurationMinutes,
  origin,
  secondDurationMinutes,
  secondFlightNumber,
  destination,
}: {
  firstDurationMinutes: number;
  firstFlightNumber: string;
  layoverAirport: string;
  layoverDurationMinutes: number;
  origin: string;
  secondDurationMinutes: number;
  secondFlightNumber: string;
  destination: string;
}): RouteDetail {
  return {
    segments: [
      {
        id: `${firstFlightNumber}-${origin}-${layoverAirport}`,
        flightNumber: firstFlightNumber,
        origin,
        destination: layoverAirport,
        departureTime: "09:15",
        arrivalTime: "11:00",
        durationMinutes: firstDurationMinutes,
      },
      {
        id: `${secondFlightNumber}-${layoverAirport}-${destination}`,
        flightNumber: secondFlightNumber,
        origin: layoverAirport,
        destination,
        departureTime: "13:15",
        arrivalTime: "17:05",
        durationMinutes: secondDurationMinutes,
      },
    ],
    layovers: [
      {
        airport: layoverAirport,
        durationMinutes: layoverDurationMinutes,
      },
    ],
    totalDurationMinutes:
      firstDurationMinutes + layoverDurationMinutes + secondDurationMinutes,
  };
}

function createNonstopRouteDetail({
  destination,
  durationMinutes,
  flightNumber,
  origin,
}: {
  destination: string;
  durationMinutes: number;
  flightNumber: string;
  origin: string;
}): RouteDetail {
  return {
    segments: [
      {
        id: `${flightNumber}-${origin}-${destination}`,
        flightNumber,
        origin,
        destination,
        departureTime: "09:00",
        arrivalTime: "17:00",
        durationMinutes,
      },
    ],
    layovers: [],
    totalDurationMinutes: durationMinutes,
  };
}

function createThreeSegmentRouteDetail({
  destination,
  firstLayoverAirport,
  firstLayoverDurationMinutes,
  origin,
  secondLayoverAirport,
  secondLayoverDurationMinutes,
}: {
  destination: string;
  firstLayoverAirport: string;
  firstLayoverDurationMinutes: number;
  origin: string;
  secondLayoverAirport: string;
  secondLayoverDurationMinutes: number;
}): RouteDetail {
  return {
    segments: [
      {
        id: `VS100-${origin}-${firstLayoverAirport}`,
        flightNumber: "VS100",
        origin,
        destination: firstLayoverAirport,
        departureTime: "07:30",
        arrivalTime: "08:52",
        durationMinutes: 82,
      },
      {
        id: `VS200-${firstLayoverAirport}-${secondLayoverAirport}`,
        flightNumber: "VS200",
        origin: firstLayoverAirport,
        destination: secondLayoverAirport,
        departureTime: "11:57",
        arrivalTime: "14:57",
        durationMinutes: 360,
      },
      {
        id: `NH109-${secondLayoverAirport}-${destination}`,
        flightNumber: "NH109",
        origin: secondLayoverAirport,
        destination,
        departureTime: "16:57",
        arrivalTime: "18:10",
        durationMinutes: 283,
      },
    ],
    layovers: [
      {
        airport: firstLayoverAirport,
        durationMinutes: firstLayoverDurationMinutes,
      },
      {
        airport: secondLayoverAirport,
        durationMinutes: secondLayoverDurationMinutes,
      },
    ],
    totalDurationMinutes:
      82 +
      firstLayoverDurationMinutes +
      360 +
      secondLayoverDurationMinutes +
      283,
  };
}

function getRouteStopCount(routeDetail: RouteDetail | undefined): number {
  return routeDetail?.layovers.length ?? 0;
}

function normalizeCashRoute(option: CashFlightOption): CashFlightOption {
  return {
    ...option,
    durationMinutes: option.routeDetail?.totalDurationMinutes ?? option.durationMinutes,
    stops: getRouteStopCount(option.routeDetail),
  };
}

function normalizeAwardRoute(option: AwardFlightOption): AwardFlightOption {
  return {
    ...option,
    durationMinutes: option.routeDetail?.totalDurationMinutes ?? option.durationMinutes,
    stops: getRouteStopCount(option.routeDetail),
  };
}

function makeCashOptionNonstop(
  option: CashFlightOption,
): CashFlightOption {
  return normalizeCashRoute({
    ...option,
    flightNumbers: [option.flightNumbers[0] ?? "MOCK100"],
    routeDetail: createNonstopRouteDetail({
      destination: option.destination,
      durationMinutes: option.durationMinutes,
      flightNumber: option.flightNumbers[0] ?? "MOCK100",
      origin: option.origin,
    }),
  });
}

function makeAwardOptionNonstop(
  option: AwardFlightOption,
): AwardFlightOption {
  return normalizeAwardRoute({
    ...option,
    routeDetail: createNonstopRouteDetail({
      destination: option.destination,
      durationMinutes:
        option.durationMinutes ?? option.routeDetail?.totalDurationMinutes ?? 0,
      flightNumber: `${option.id}-flight`,
      origin: option.origin,
    }),
  });
}

function normalizeAwardOptionsForSearch(
  search: SavedSearch,
  options: AwardFlightOption[],
): AwardFlightOption[] {
  if (search.maxStops === 0) {
    return options.map(makeAwardOptionNonstop);
  }

  return options.map(normalizeAwardRoute);
}

export function getMockCashOptionForSearch(
  search: SavedSearch,
): CashFlightOption {
  const passengers = getPassengerCount(search);
  const isTokyoRoute = routeResemblesWashingtonToTokyo(search);
  const cashPriceByPassenger = isTokyoRoute
    ? cabinCashPriceByPassenger[search.cabin]
    : genericCashPriceByPassenger[search.cabin];

  const cashOption: CashFlightOption = {
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
    routeDetail: isTokyoRoute
      ? createTwoSegmentRouteDetail({
          firstDurationMinutes: 120,
          firstFlightNumber: "UA803",
          layoverAirport: "ORD",
          layoverDurationMinutes: 95,
          origin: getPrimaryOrigin(search),
          secondDurationMinutes: 660,
          secondFlightNumber: "NH101",
          destination: getPrimaryDestination(search),
        })
      : createTwoSegmentRouteDetail({
          firstDurationMinutes: 105,
          firstFlightNumber: "MOCK100",
          layoverAirport: "YYZ",
          layoverDurationMinutes: 90,
          origin: getPrimaryOrigin(search),
          secondDurationMinutes: 345,
          secondFlightNumber: "MOCK200",
          destination: getPrimaryDestination(search),
        }),
  };

  const normalizedCashOption = search.maxStops === 0
    ? makeCashOptionNonstop(cashOption)
    : normalizeCashRoute(cashOption);

  return addMockCashMetadata(normalizedCashOption);
}

export function getMockAwardOptionsForSearch(
  search: SavedSearch,
): AwardFlightOption[] {
  const passengers = getPassengerCount(search);
  const origin = getPrimaryOrigin(search);
  const destination = getPrimaryDestination(search);

  if (routeResemblesWashingtonToTokyo(search)) {
    const points = tokyoAwardPointsByPassenger[search.cabin];

    return addMockAwardMetadataToOptions(
      normalizeAwardOptionsForSearch(search, [
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
          routeDetail: createTwoSegmentRouteDetail({
            firstDurationMinutes: 345,
            firstFlightNumber: "AC103",
            layoverAirport: "YVR",
            layoverDurationMinutes: 135,
            origin,
            secondDurationMinutes: 430,
            secondFlightNumber: "NH115",
            destination,
          }),
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
          routeDetail: createThreeSegmentRouteDetail({
            destination,
            firstLayoverAirport: "JFK",
            firstLayoverDurationMinutes: 185,
            origin,
            secondLayoverAirport: "LAX",
            secondLayoverDurationMinutes: 120,
          }),
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
          routeDetail: createTwoSegmentRouteDetail({
            firstDurationMinutes: 355,
            firstFlightNumber: "UA1738",
            layoverAirport: "SFO",
            layoverDurationMinutes: 105,
            origin,
            secondDurationMinutes: 440,
            secondFlightNumber: "UA837",
            destination,
          }),
          confidence: "high",
          lastCheckedAt: "Mock data",
        },
      ]),
      passengers,
    );
  }

  const points = genericAwardPointsByPassenger[search.cabin];

  return addMockAwardMetadataToOptions(
    normalizeAwardOptionsForSearch(search, [
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
        routeDetail: createTwoSegmentRouteDetail({
          firstDurationMinutes: 105,
          firstFlightNumber: "AC501",
          layoverAirport: "YYZ",
          layoverDurationMinutes: 85,
          origin,
          secondDurationMinutes: 540,
          secondFlightNumber: "AC860",
          destination,
        }),
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
        routeDetail: createTwoSegmentRouteDetail({
          firstDurationMinutes: 425,
          firstFlightNumber: "AF27",
          layoverAirport: "CDG",
          layoverDurationMinutes: 95,
          origin,
          secondDurationMinutes: 270,
          secondFlightNumber: "AF1680",
          destination,
        }),
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
        routeDetail: createTwoSegmentRouteDetail({
          firstDurationMinutes: 220,
          firstFlightNumber: "UA909",
          layoverAirport: "EWR",
          layoverDurationMinutes: 80,
          origin,
          secondDurationMinutes: 405,
          secondFlightNumber: "UA940",
          destination,
        }),
        confidence: "high",
        lastCheckedAt: "Mock data",
      },
    ]),
    passengers,
  );
}
