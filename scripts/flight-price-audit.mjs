#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROUTES = [
  ["DCA", "ATL"],
  ["DCA", "LAX"],
  ["DCA", "ORD"],
  ["DCA", "DFW"],
  ["JFK", "LAX"],
  ["BOS", "SFO"],
  ["SEA", "DEN"],
  ["ATL", "MIA"],
];

const DATE_BUCKETS = [
  { label: "near-term", date: "2026-09-03" },
  { label: "mid-term", date: "2026-10-29" },
  { label: "farther-out", date: "2027-01-28" },
];

const SCORE_WEIGHTS = {
  valueScore: 0.35,
  pointsFitScore: 0.2,
  convenienceScore: 0.2,
  availabilityConfidenceScore: 0.15,
  transferSimplicityScore: 0.1,
};

function parseArgs(argv) {
  const config = {
    baseUrl: process.env.AUDIT_BASE_URL ?? "http://localhost:3001",
    preflightOnly: process.env.AUDIT_PREFLIGHT_ONLY === "true",
    requireLive: process.env.AUDIT_REQUIRE_LIVE === "true",
    runs: Number(process.env.AUDIT_RUNS ?? 2),
  };

  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) {
      config.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--preflight-only") {
      config.preflightOnly = true;
    } else if (arg === "--require-live") {
      config.requireLive = true;
    } else if (arg.startsWith("--runs=")) {
      config.runs = Number(arg.slice("--runs=".length));
    }
  }

  if (!Number.isInteger(config.runs) || config.runs < 1) {
    throw new Error("--runs must be a positive integer.");
  }

  return config;
}

function parseEnvFile(content) {
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

async function getLocalEnvValues() {
  const envFiles = [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ];
  const values = {};
  const loadedFiles = [];

  for (const envFile of envFiles) {
    try {
      const content = await readFile(path.join(process.cwd(), envFile), "utf8");
      Object.assign(values, parseEnvFile(content));
      loadedFiles.push(envFile);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return {
    loadedFiles,
    values: {
      ...values,
      ENABLE_LIVE_CASH_PROVIDER:
        process.env.ENABLE_LIVE_CASH_PROVIDER ??
        values.ENABLE_LIVE_CASH_PROVIDER,
      TRAVELPAYOUTS_TOKEN:
        process.env.TRAVELPAYOUTS_TOKEN ?? values.TRAVELPAYOUTS_TOKEN,
      ENABLE_LIVE_AWARD_PROVIDER:
        process.env.ENABLE_LIVE_AWARD_PROVIDER ??
        values.ENABLE_LIVE_AWARD_PROVIDER,
      SEATS_AERO_API_KEY:
        process.env.SEATS_AERO_API_KEY ?? values.SEATS_AERO_API_KEY,
    },
  };
}

function getFlagState(value) {
  if (value === undefined) {
    return "missing";
  }

  if (value === "true") {
    return "present/value-valid";
  }

  return "present/value-invalid";
}

function getSecretState(value) {
  return typeof value === "string" && value.length > 0 ? "present" : "missing";
}

function getProviderModeFromReadiness(readiness) {
  const cashRequested = readiness.cash.flagEnabled;
  const awardRequested = readiness.awards.flagEnabled;
  const cashLive = readiness.cash.active;
  const awardLive = readiness.awards.active;
  const unavailableRequestedProvider =
    (cashRequested && !cashLive) || (awardRequested && !awardLive);

  if (cashLive && awardLive) {
    return "live";
  }

  if (cashLive || awardLive) {
    return "mixed";
  }

  if (unavailableRequestedProvider) {
    return "unavailable";
  }

  return "mock";
}

async function getLiveProviderReadiness() {
  const { loadedFiles, values } = await getLocalEnvValues();
  const cashFlagEnabled = values.ENABLE_LIVE_CASH_PROVIDER === "true";
  const cashTokenPresent = getSecretState(values.TRAVELPAYOUTS_TOKEN) === "present";
  const awardFlagEnabled = values.ENABLE_LIVE_AWARD_PROVIDER === "true";
  const awardKeyPresent = getSecretState(values.SEATS_AERO_API_KEY) === "present";
  const readiness = {
    loadedEnvFiles: loadedFiles,
    cash: {
      flag: getFlagState(values.ENABLE_LIVE_CASH_PROVIDER),
      credential: getSecretState(values.TRAVELPAYOUTS_TOKEN),
      flagEnabled: cashFlagEnabled,
      active: cashFlagEnabled && cashTokenPresent,
    },
    awards: {
      flag: getFlagState(values.ENABLE_LIVE_AWARD_PROVIDER),
      credential: getSecretState(values.SEATS_AERO_API_KEY),
      flagEnabled: awardFlagEnabled,
      active: awardFlagEnabled && awardKeyPresent,
    },
    warnings: [],
  };

  if (cashFlagEnabled && !cashTokenPresent) {
    readiness.warnings.push(
      "live cash requested but TRAVELPAYOUTS_TOKEN missing; cash provider will fall back to mock",
    );
  }

  if (awardFlagEnabled && !awardKeyPresent) {
    readiness.warnings.push(
      "live award requested but SEATS_AERO_API_KEY missing; award provider will fall back to mock",
    );
  }

  readiness.providerMode = getProviderModeFromReadiness(readiness);

  return readiness;
}

function renderPreflight(readiness) {
  return [
    "Live provider preflight:",
    `ENABLE_LIVE_CASH_PROVIDER=${readiness.cash.flag}`,
    `TRAVELPAYOUTS_TOKEN=${readiness.cash.credential}`,
    `ENABLE_LIVE_AWARD_PROVIDER=${readiness.awards.flag}`,
    `SEATS_AERO_API_KEY=${readiness.awards.credential}`,
    `providerMode=${readiness.providerMode}`,
    ...readiness.warnings.map((warning) => `warning=${warning}`),
  ].join("\n");
}

function getAuditDates() {
  return DATE_BUCKETS;
}

function createSearch({ date, destination, origin }) {
  return {
    id: `audit-${origin}-${destination}-${date}`,
    userId: "audit-user",
    name: `Audit ${origin} to ${destination} ${date}`,
    originCodes: [origin],
    destinationCodes: [destination],
    departDate: date,
    tripType: "one_way",
    passengers: 1,
    cabin: "economy",
    maxStops: 2,
    createdAt: "2026-08-13T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
  };
}

function calculateCentsPerPoint(cashPriceUsd, taxesAndFeesUsd, pointsRequired) {
  if (taxesAndFeesUsd === undefined || taxesAndFeesUsd === null) {
    return undefined;
  }

  if (
    !Number.isFinite(cashPriceUsd) ||
    !Number.isFinite(taxesAndFeesUsd) ||
    !Number.isFinite(pointsRequired) ||
    pointsRequired <= 0
  ) {
    return 0;
  }

  const netCashValue = cashPriceUsd - taxesAndFeesUsd;

  if (netCashValue <= 0) {
    return 0;
  }

  return Math.round((netCashValue / pointsRequired) * 1000) / 10;
}

function getValueScore(centsPerPoint) {
  if (!centsPerPoint || centsPerPoint <= 0) {
    return 0;
  }

  return Math.min(100, centsPerPoint * 25);
}

function getConvenienceScore(stops) {
  if (stops === undefined || stops === null) {
    return 0;
  }

  if (stops <= 0) {
    return 100;
  }

  if (stops === 1) {
    return 80;
  }

  if (stops === 2) {
    return 50;
  }

  return 25;
}

function getAvailabilityConfidenceScore(confidence) {
  if (confidence === "high") {
    return 100;
  }

  if (confidence === "medium") {
    return 70;
  }

  if (confidence === "low") {
    return 35;
  }

  return 0;
}

function getAuditRecommendationScore(awardOption, centsPerPoint) {
  const valueScore = getValueScore(centsPerPoint);
  const pointsFitScore = 0;
  const convenienceScore = getConvenienceScore(awardOption.stops);
  const availabilityConfidenceScore = getAvailabilityConfidenceScore(
    awardOption.confidence,
  );
  const transferSimplicityScore =
    Array.isArray(awardOption.transferSources) &&
    awardOption.transferSources.length > 0
      ? 40
      : 0;
  const totalScore = Math.round(
    valueScore * SCORE_WEIGHTS.valueScore +
      pointsFitScore * SCORE_WEIGHTS.pointsFitScore +
      convenienceScore * SCORE_WEIGHTS.convenienceScore +
      availabilityConfidenceScore *
        SCORE_WEIGHTS.availabilityConfidenceScore +
      transferSimplicityScore * SCORE_WEIGHTS.transferSimplicityScore,
  );

  return {
    valueScore,
    pointsFitScore,
    convenienceScore,
    availabilityConfidenceScore,
    transferSimplicityScore,
    totalScore,
    note:
      "Audit harness score excludes user wallet balances; the app UI computes final points-fit scores client-side from wallet state.",
  };
}

function getDerivedProviderRequest(providerId, search) {
  if (providerId === "travelpayouts") {
    return {
      method: "GET",
      url: "https://api.travelpayouts.com/v1/prices/cheap",
      query: {
        origin: search.originCodes[0],
        destination: search.destinationCodes[0],
        depart_date: search.departDate.slice(0, 7),
        currency: "usd",
      },
      headers: {
        "X-Access-Token": "[REDACTED]",
      },
      note: "Derived from current single-airport audit search; exact fallback pair order stays server-side.",
    };
  }

  if (providerId === "seats-aero") {
    return {
      method: "GET",
      url: "https://seats.aero/partnerapi/search",
      query: {
        origin_airport: search.originCodes.join(","),
        destination_airport: search.destinationCodes.join(","),
        start_date: search.departDate,
        end_date: search.departDate,
      },
      headers: {
        "Partner-Authorization": "[REDACTED]",
      },
      note: "Derived from current audit search; raw provider response is intentionally not returned by the app API.",
    };
  }

  return {
    method: "POST",
    url: "/api/search/flights",
    body: { search },
    headers: {
      "Content-Type": "application/json",
    },
    note: "Mock provider has no external request.",
  };
}

function getCashPriceStats(cashOptions) {
  const prices = cashOptions
    .map((option) => option.cashPriceUsd)
    .filter((price) => Number.isFinite(price) && price > 0)
    .toSorted((left, right) => left - right);

  return {
    resultCount: cashOptions.length,
    usablePriceCount: prices.length,
    usablePriceRate:
      cashOptions.length === 0 ? 0 : Math.round((prices.length / cashOptions.length) * 1000) / 10,
    minPrice: prices[0] ?? null,
    medianPrice:
      prices.length === 0 ? null : prices[Math.floor((prices.length - 1) / 2)],
    maxPrice: prices.at(-1) ?? null,
    selectedDisplayedPrice: cashOptions[0]?.cashPriceUsd ?? null,
    itineraryIds: cashOptions.map((option) => option.id),
  };
}

function getAwardPriceStats(awardOptions) {
  const usablePoints = awardOptions
    .map((option) => option.pointsRequired)
    .filter((points) => Number.isFinite(points) && points > 0);
  const usableFees = awardOptions
    .map((option) => option.taxesAndFeesUsd)
    .filter((fees) => Number.isFinite(fees) && fees >= 0);

  return {
    resultCount: awardOptions.length,
    usablePointsCount: usablePoints.length,
    usablePointsRate:
      awardOptions.length === 0
        ? 0
        : Math.round((usablePoints.length / awardOptions.length) * 1000) / 10,
    usableFeesCount: usableFees.length,
    usableFeesRate:
      awardOptions.length === 0
        ? 0
        : Math.round((usableFees.length / awardOptions.length) * 1000) / 10,
    itineraryIds: awardOptions.map((option) => option.id),
  };
}

function getProviderMode(envelope) {
  const providerModes = [
    envelope.cash,
    envelope.awards,
  ].map((providerEnvelope) => {
    const unavailableStatuses = new Set([
      "error",
      "rate_limited",
      "unsupported_route",
    ]);

    if (providerEnvelope.metadata.isLive === true) {
      return unavailableStatuses.has(providerEnvelope.status) &&
        providerEnvelope.data.length === 0
        ? "unavailable"
        : "live";
    }

    if (providerEnvelope.metadata.isLive === false) {
      return "mock";
    }

    return "unknown";
  });
  const uniqueModes = [...new Set(providerModes)];

  if (uniqueModes.length === 1) {
    return uniqueModes[0];
  }

  if (uniqueModes.includes("unknown")) {
    return "unknown";
  }

  return "mixed";
}

function getFallbackState(envelope) {
  const expectedCashProvider = "travelpayouts";
  const expectedAwardProvider = "seats-aero";
  const cashFallbackTriggered =
    envelope.cash.metadata.providerId !== expectedCashProvider;
  const awardFallbackTriggered =
    envelope.awards.metadata.providerId !== expectedAwardProvider;

  return {
    cashFallbackTriggered,
    awardFallbackTriggered,
    anyFallbackTriggered: cashFallbackTriggered || awardFallbackTriggered,
    note:
      "Fallback means the app route returned a provider other than the configured live provider target for that side. The route currently falls back to mocks when the corresponding live flag/key gate is not satisfied.",
  };
}

function getRawPriceFields(option) {
  if (!option) {
    return null;
  }

  return {
    cashPriceUsd: option.cashPriceUsd,
    price: option.price,
    priceBreakdown: option.priceBreakdown,
    source: option.source,
  };
}

function getCashFlightFields(option) {
  if (!option) {
    return null;
  }

  return {
    airline: option.airline,
    flightNumbers: option.flightNumbers,
    origin: option.origin,
    destination: option.destination,
    departureDateTime: option.departureDateTime,
    arrivalDateTime: option.arrivalDateTime,
    durationMinutes: option.durationMinutes,
    stops: option.stops,
    cabin: option.cabin,
    cabinConfirmed: option.cabinConfirmed,
    itinerary: option.itinerary,
    routeDetail: option.routeDetail,
    limitations: option.limitations,
  };
}

function getAwardFlightFields(option) {
  if (!option) {
    return null;
  }

  return {
    airlineProgram: option.airlineProgram,
    operatingAirline: option.operatingAirline,
    marketingAirline: option.marketingAirline,
    origin: option.origin,
    destination: option.destination,
    departureDateTime: option.departureDateTime,
    arrivalDateTime: option.arrivalDateTime,
    cabin: option.cabin,
    pointsRequired: option.pointsRequired,
    taxesAndFeesUsd: option.taxesAndFeesUsd,
    stops: option.stops,
    durationMinutes: option.durationMinutes,
    transferSources: option.transferSources,
    sourceProgramId: option.sourceProgramId,
    confidence: option.confidence,
    availabilityStatus: option.availabilityStatus,
    availableSeats: option.availableSeats,
    itinerary: option.itinerary,
    routeDetail: option.routeDetail,
    limitations: option.limitations,
  };
}

function normalizeRun({ envelope, receivedAt, runIndex, search }) {
  const cashOptions = envelope.cash.data ?? [];
  const awardOptions = envelope.awards.data ?? [];
  const selectedCashOption = cashOptions[0];
  const selectedAwardOption = awardOptions[0];
  const cashStats = getCashPriceStats(cashOptions);
  const awardStats = getAwardPriceStats(awardOptions);
  const centsPerPoint =
    selectedCashOption && selectedAwardOption
      ? calculateCentsPerPoint(
          selectedCashOption.cashPriceUsd,
          selectedAwardOption.taxesAndFeesUsd,
          selectedAwardOption.pointsRequired,
        )
      : undefined;
  const recommendationScore = selectedAwardOption
    ? getAuditRecommendationScore(selectedAwardOption, centsPerPoint)
    : null;

  return {
    runIndex,
    origin: search.originCodes.join(","),
    destination: search.destinationCodes.join(","),
    date: search.departDate,
    providerMode: getProviderMode(envelope),
    providerQueried: {
      cash: envelope.cash.metadata.providerLabel,
      awards: envelope.awards.metadata.providerLabel,
    },
    fallback: getFallbackState(envelope),
    resultCounts: {
      cashResultsReturned: cashStats.resultCount,
      awardResultsReturned: awardStats.resultCount,
      resultsWithUsableCashPrice: cashStats.usablePriceCount,
      resultsWithUsablePointsPrice: awardStats.usablePointsCount,
      resultsWithUsableAwardFees: awardStats.usableFeesCount,
    },
    request: {
      appRoute: {
        method: "POST",
        url: "/api/search/flights",
        body: { search },
        headers: { "Content-Type": "application/json" },
      },
      derivedProviderRequests: {
        cash: getDerivedProviderRequest(
          envelope.cash.metadata.providerId,
          search,
        ),
        awards: getDerivedProviderRequest(
          envelope.awards.metadata.providerId,
          search,
        ),
      },
    },
    responseTimestamp: receivedAt,
    status: {
      overall: envelope.overallStatus,
      cash: envelope.cash.status,
      awards: envelope.awards.status,
    },
    rawProviderPayloadReturnedToHarness: false,
    rawProviderPayloadNote:
      "The app API intentionally returns normalized app-owned envelopes, not raw third-party payloads.",
    providerMetadata: {
      cash: envelope.cash.metadata,
      awards: envelope.awards.metadata,
    },
    messages: envelope.messages,
    rawPriceFieldsReturnedByApi: cashOptions.map(getRawPriceFields),
    rawCashFlightFieldsReturnedByApi: cashOptions.map(getCashFlightFields),
    rawAwardFlightFieldsReturnedByApi: awardOptions.map(getAwardFlightFields),
    normalized: {
      cashPriceUsedByApp: selectedCashOption?.cashPriceUsd ?? null,
      pointsPriceUsedByApp: selectedAwardOption?.pointsRequired ?? null,
      taxesAndFeesUsedByApp:
        selectedAwardOption?.taxesAndFeesUsd === undefined
          ? null
          : selectedAwardOption.taxesAndFeesUsd,
      airlineOrCarrier:
        selectedAwardOption?.operatingAirline ??
        selectedCashOption?.airline ??
        null,
      flightNumberOrItineraryId:
        selectedAwardOption?.id ??
        selectedCashOption?.flightNumbers?.join(",") ??
        null,
      numberOfStops:
        selectedAwardOption?.stops ?? selectedCashOption?.stops ?? null,
      layoverAirports:
        selectedAwardOption?.routeDetail?.layovers?.map((layover) => layover.airport) ??
        selectedCashOption?.routeDetail?.layovers?.map((layover) => layover.airport) ??
        [],
      calculatedCentsPerPoint: centsPerPoint ?? null,
      calculatedTotalScore: recommendationScore,
      finalDisplayedValueExpectedInUi: {
        cashBenchmark:
          selectedCashOption === undefined
            ? "Cash benchmark unavailable"
            : `$${Math.round(selectedCashOption.cashPriceUsd).toLocaleString("en-US")}`,
        award:
          selectedAwardOption === undefined
            ? "Award option unavailable"
            : `${selectedAwardOption.pointsRequired.toLocaleString("en-US")} points + ${
                selectedAwardOption.taxesAndFeesUsd === undefined
                  ? "taxes/fees not reported"
                  : `$${Math.round(selectedAwardOption.taxesAndFeesUsd).toLocaleString("en-US")}`
              }, cpp ${centsPerPoint === undefined ? "N/A" : centsPerPoint.toFixed(1)}`,
      },
    },
    priceConsistency: {
      cash: cashStats,
      awards: awardStats,
      currencies: [
        ...new Set(
          cashOptions
            .map((option) => option.price?.currency)
            .filter((currency) => typeof currency === "string"),
        ),
      ],
      priceFieldSource:
        selectedCashOption?.priceBreakdown?.total !== undefined
          ? "priceBreakdown.total.amount / cashPriceUsd"
          : selectedCashOption?.cashPriceUsd !== undefined
            ? "cashPriceUsd"
            : "none",
      taxesAndFeesIncludedOrSeparate:
        selectedCashOption?.priceBreakdown?.taxesAndFees === undefined
          ? "missing_or_unclear"
          : "separate",
    },
  };
}

async function queryFlightSearch(baseUrl, search) {
  const response = await fetch(new URL("/api/search/flights", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ search }),
  });
  const receivedAt = new Date().toISOString();
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(
      `Search failed for ${search.originCodes.join(",")} -> ${search.destinationCodes.join(",")} ${search.departDate}: ${JSON.stringify(payload)}`,
    );
  }

  return { envelope: payload.envelope, receivedAt };
}

function compareRuns(runs) {
  const [firstRun, secondRun] = runs;

  if (!firstRun || !secondRun) {
    return {
      stable: null,
      notes: "Only one run was captured.",
    };
  }

  const firstStats = firstRun.priceConsistency.cash;
  const secondStats = secondRun.priceConsistency.cash;
  const minDelta =
    firstStats.minPrice === null || secondStats.minPrice === null
      ? null
      : Math.round((secondStats.minPrice - firstStats.minPrice) * 100) / 100;
  const medianDelta =
    firstStats.medianPrice === null || secondStats.medianPrice === null
      ? null
      : Math.round((secondStats.medianPrice - firstStats.medianPrice) * 100) /
        100;
  const sameItineraryIds =
    JSON.stringify(firstStats.itineraryIds) ===
    JSON.stringify(secondStats.itineraryIds);
  const materiallyDifferent =
    firstStats.resultCount !== secondStats.resultCount ||
    firstStats.usablePriceCount !== secondStats.usablePriceCount ||
    minDelta !== 0 ||
    medianDelta !== 0 ||
    !sameItineraryIds;

  return {
    run1Min: firstStats.minPrice,
    run2Min: secondStats.minPrice,
    minDelta,
    medianDelta,
    stable: !materiallyDifferent,
    notes: materiallyDifferent
      ? "Repeated calls differed in count, price, or itinerary identity."
      : "Repeated calls were stable for normalized cash prices.",
  };
}

function buildTables(records) {
  const groups = new Map();

  for (const record of records) {
    const key = `${record.origin}-${record.destination}-${record.date}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const routeCoverage = [];
  const priceConsistency = [];
  const awardConsistency = [];

  for (const group of groups.values()) {
    const first = group[0];
    const stats = first.priceConsistency.cash;
    const awardStats = first.priceConsistency.awards;
    const comparison = compareRuns(group);
    const second = group[1];

    routeCoverage.push({
      origin: first.origin,
      destination: first.destination,
      date: first.date,
      provider: first.providerQueried.cash,
      providerMode: first.providerMode,
      fallbackTriggered: first.fallback.anyFallbackTriggered,
      resultsReturned: stats.resultCount,
      resultsWithPrice: stats.usablePriceCount,
      usablePricePercent: stats.usablePriceRate,
      notes:
        stats.usablePriceRate < 80
          ? "P1: fewer than 80% of returned cash options have usable prices."
          : first.providerMetadata.cash.isLive
            ? "Live provider envelope; raw third-party payload not exposed."
            : "Mock provider envelope.",
    });
    priceConsistency.push({
      origin: first.origin,
      destination: first.destination,
      date: first.date,
      providerMode: first.providerMode,
      fallbackTriggered: first.fallback.anyFallbackTriggered,
      run1Results: stats.resultCount,
      run2Results: second?.priceConsistency.cash.resultCount ?? null,
      run1UsablePricePercent: stats.usablePriceRate,
      run2UsablePricePercent:
        second?.priceConsistency.cash.usablePriceRate ?? null,
      run1Min: comparison.run1Min ?? null,
      run2Min: comparison.run2Min ?? null,
      minDelta: comparison.minDelta ?? null,
      medianDelta: comparison.medianDelta ?? null,
      stable: comparison.stable,
      notes: comparison.notes,
    });
    awardConsistency.push({
      origin: first.origin,
      destination: first.destination,
      date: first.date,
      awardProviderActive: first.providerMetadata.awards.isLive,
      providerMode: first.providerMode,
      awardResults: awardStats.resultCount,
      resultsWithPoints: awardStats.usablePointsCount,
      resultsWithFees: awardStats.usableFeesCount,
      cppCalculable:
        first.normalized.calculatedCentsPerPoint === null ? "no" : "yes",
      transferMappingConfidence:
        first.providerMetadata.awards.providerId === "seats-aero"
          ? "Medium: source slug is provider-backed; card transfer mapping is app-derived static data."
          : "High for deterministic mock data.",
      notes:
        awardStats.usableFeesCount === 0
          ? "Award fees missing; CPP should display N/A."
          : "Award points and fees available for selected app option.",
    });
  }

  return { awardConsistency, priceConsistency, routeCoverage };
}

function getOverallUsablePriceRate(records) {
  const firstRuns = records.filter((record) => record.runIndex === 1);
  const totals = firstRuns.reduce(
    (accumulator, record) => ({
      resultCount:
        accumulator.resultCount + record.priceConsistency.cash.resultCount,
      usablePriceCount:
        accumulator.usablePriceCount +
        record.priceConsistency.cash.usablePriceCount,
    }),
    { resultCount: 0, usablePriceCount: 0 },
  );

  if (totals.resultCount === 0) {
    return 0;
  }

  return Math.round((totals.usablePriceCount / totals.resultCount) * 1000) / 10;
}

function getFindings(records) {
  const firstRuns = records.filter((record) => record.runIndex === 1);
  const cashProviderIds = new Set(
    firstRuns.map((record) => record.providerMetadata.cash.providerId),
  );
  const awardProviderIds = new Set(
    firstRuns.map((record) => record.providerMetadata.awards.providerId),
  );
  const findings = [];

  if (cashProviderIds.has("mock-cash")) {
    findings.push({
      severity: "P1",
      finding:
        "Cash price consistency was exercised against deterministic mock data, not a live fare API.",
    });
  }

  if (cashProviderIds.has("travelpayouts")) {
    findings.push({
      severity: "P1",
      finding:
        "Travelpayouts prices/cheap data is cached, month-level fare data; route/date prices are not live shop quotes and taxes are not separately confirmed.",
    });
  }

  if (awardProviderIds.has("mock-awards")) {
    findings.push({
      severity: "P1",
      finding:
        "Award data was exercised against deterministic mock data, not live award availability.",
    });
  }

  if (awardProviderIds.has("seats-aero")) {
    findings.push({
      severity: "P1",
      finding:
        "Seats.aero Cached Search does not return taxes/fees or scheduled flight times, so live award CPP can be N/A even when availability exists.",
    });
  }

  if (
    [...cashProviderIds].some((providerId) => providerId !== "mock-cash") ||
    [...awardProviderIds].some((providerId) => providerId !== "mock-awards")
  ) {
    findings.push({
      severity: "P1",
      finding:
        "Cash fares and award availability can come from different providers and different freshness models in the same UI result set.",
    });
  }

  return findings;
}

function renderMarkdownTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map(
    (row) =>
      `| ${headers
        .map((header) => String(row[header] ?? "").replaceAll("|", "\\|"))
        .join(" | ")} |`,
  );

  return [headerLine, dividerLine, ...rowLines].join("\n");
}

function renderMarkdownReport({ generatedAt, records, tables }) {
  const firstRuns = records.filter((record) => record.runIndex === 1);
  const routes = ROUTES.map(([origin, destination]) => `${origin}->${destination}`).join(", ");
  const dates = [...new Set(firstRuns.map((record) => record.date))].join(", ");
  const usablePriceRate = getOverallUsablePriceRate(records);
  const findings = getFindings(records);
  const cashProviders = [
    ...new Set(firstRuns.map((record) => record.providerQueried.cash)),
  ].join(", ");
  const awardProviders = [
    ...new Set(firstRuns.map((record) => record.providerQueried.awards)),
  ].join(", ");

  const routeCoverageRows = tables.routeCoverage.map((row) => ({
    Origin: row.origin,
    Destination: row.destination,
    Date: row.date,
    Provider: row.provider,
    "Results Returned": row.resultsReturned,
    "Results With Price": row.resultsWithPrice,
    "Usable Price %": row.usablePricePercent,
    Notes: row.notes,
  }));
  const priceConsistencyRows = tables.priceConsistency.map((row) => ({
    Origin: row.origin,
    Destination: row.destination,
    Date: row.date,
    "Run 1 Results": row.run1Results,
    "Run 2 Results": row.run2Results ?? "N/A",
    "Run 1 Usable Price %": row.run1UsablePricePercent,
    "Run 2 Usable Price %": row.run2UsablePricePercent ?? "N/A",
    "Min Price Delta": row.minDelta ?? "N/A",
    "Median Price Delta": row.medianDelta ?? "N/A",
    Stable: row.stable === null ? "N/A" : row.stable ? "yes" : "no",
    "Provider Mode": row.providerMode,
    Notes: row.notes,
  }));
  const awardConsistencyRows = tables.awardConsistency.map((row) => ({
    Origin: row.origin,
    Destination: row.destination,
    Date: row.date,
    "Award Provider Active?": row.awardProviderActive ? "yes" : "no",
    "Award Results": row.awardResults,
    "Results With Points": row.resultsWithPoints,
    "Results With Fees": row.resultsWithFees,
    "CPP Calculable?": row.cppCalculable,
    "Transfer Mapping Confidence": row.transferMappingConfidence,
    Notes: row.notes,
  }));
  const calculationRows = [
    {
      Calculation: "Cash price normalization",
      Status: "Reviewed",
      "Files Reviewed": "src/lib/providers/travelpayouts.ts, src/lib/providers/mock.ts",
      "Tests Added/Updated": "src/components/results/ResultsPageClient.test.tsx",
      Notes: "cashPriceUsd is the normalized value used by scoring; live Travelpayouts total price maps to cashPriceUsd and priceBreakdown.total.",
    },
    {
      Calculation: "Cents-per-point",
      Status: "Reviewed",
      "Files Reviewed": "src/lib/scoring/cpp.ts",
      "Tests Added/Updated": "existing cpp/scoring tests plus UI display regression",
      Notes: "Formula subtracts award taxes/fees and returns undefined when award fees are unreported.",
    },
    {
      Calculation: "Recommendation scoring",
      Status: "Reviewed",
      "Files Reviewed": "src/lib/scoring/recommendations.ts",
      "Tests Added/Updated": "existing recommendation tests",
      Notes: "Weighted score uses value, points fit, convenience, confidence, and transfer simplicity; final UI score depends on wallet state.",
    },
    {
      Calculation: "Stops/layovers",
      Status: "Reviewed",
      "Files Reviewed": "src/lib/results/routeDetails.ts, provider normalizers",
      "Tests Added/Updated": "existing route detail/filter/sorting tests",
      Notes: "Mock route detail backs stops/layovers; Travelpayouts leaves them undefined; Seats.aero only confirms nonstop when direct flag is true.",
    },
  ];
  const sourceMapRows = [
    {
      "Displayed Field": "Cash price",
      Source: "CashFlightOption.cashPriceUsd / priceBreakdown.total.amount",
      Transform: "Travelpayouts mapEntryToCashFlightOption or mock cash generator",
      Confidence: "High for normalized field; Medium for live fare semantics",
      Notes: "Travelpayouts amount is cached month-level total; taxes separate missing/unclear.",
    },
    {
      "Displayed Field": "Award points",
      Source: "AwardFlightOption.pointsRequired",
      Transform: "Seats.aero per-cabin mileage cost x passengers or mock generator",
      Confidence: "High",
      Notes: "Seats.aero returns per-cabin mileage strings; app converts to number.",
    },
    {
      "Displayed Field": "Taxes/fees",
      Source: "AwardFlightOption.taxesAndFeesUsd",
      Transform: "Mock provides explicit fees; Seats.aero leaves undefined",
      Confidence: "High when present; Low when missing",
      Notes: "Missing fees produce N/A CPP.",
    },
    {
      "Displayed Field": "Stops",
      Source: "option.stops or routeDetail.layovers.length",
      Transform: "Mock route detail normalization; Seats.aero direct flag; Travelpayouts undefined",
      Confidence: "High for mock/direct true; Low when unreported",
      Notes: "UI says Stops not confirmed when undefined.",
    },
    {
      "Displayed Field": "Layovers/duration",
      Source: "routeDetail / itinerary",
      Transform: "createFlightItineraryFromRouteDetail",
      Confidence: "High for mock route detail; Low for live cached providers",
      Notes: "Travelpayouts and Seats.aero cached endpoints do not provide enough scheduled itinerary detail.",
    },
  ];

  return `# Flight Price Audit

Generated at: ${generatedAt}

## Executive Summary

1. Price API usable price rate: ${usablePriceRate}% across first-run cash results.
2. Flight data source: cash=${cashProviders}; awards=${awardProviders}.
3. Calculations reviewed: cash normalization, CPP, scoring, stops/layovers, transfer display logic.
4. Main risk: raw third-party payloads are intentionally not returned by the app route, so this harness audits normalized app envelopes and provider metadata, not restricted provider response bodies.
5. Trust boundary before production: live cached providers need product-owner acceptance because cash and award data may be from different sources and freshness models.

## Audit Scope

- Routes tested: ${routes}
- Dates tested: ${dates}
- Provider/API path tested: POST /api/search/flights
- Live API used: ${firstRuns.some((record) => record.providerMetadata.cash.isLive || record.providerMetadata.awards.isLive) ? "yes" : "no"}
- Mock/fixture data used: ${firstRuns.some((record) => !record.providerMetadata.cash.isLive || !record.providerMetadata.awards.isLive) ? "yes" : "no"}

## Key Findings

${findings.map((finding, index) => `${index + 1}. ${finding.severity}: ${finding.finding}`).join("\n")}

## Price API Consistency

- Overall usable price rate: ${usablePriceRate}%
- Routes with missing prices: ${tables.routeCoverage.filter((row) => row.resultsWithPrice === 0).length}
- Routes with unstable prices: ${tables.priceConsistency.filter((row) => row.stable === false).length}
- Fields used for app price: CashFlightOption.cashPriceUsd, usually mirrored from priceBreakdown.total.amount when available
- Confidence level: ${cashProviders.includes("Mock") ? "Medium for harness plumbing, Low for live production price behavior" : "Medium; provider is cached/aggregated, not a live quote"}

## Required Tables

### Route Coverage

${renderMarkdownTable(
  [
    "Origin",
    "Destination",
    "Date",
    "Provider",
    "Results Returned",
    "Results With Price",
    "Usable Price %",
    "Notes",
  ],
  routeCoverageRows,
)}

### Price Consistency

${renderMarkdownTable(
  [
    "Origin",
    "Destination",
    "Date",
    "Run 1 Results",
    "Run 2 Results",
    "Run 1 Usable Price %",
    "Run 2 Usable Price %",
    "Min Price Delta",
    "Median Price Delta",
    "Stable",
    "Provider Mode",
    "Notes",
  ],
  priceConsistencyRows,
)}

### Award Data Consistency

${renderMarkdownTable(
  [
    "Origin",
    "Destination",
    "Date",
    "Award Provider Active?",
    "Award Results",
    "Results With Points",
    "Results With Fees",
    "CPP Calculable?",
    "Transfer Mapping Confidence",
    "Notes",
  ],
  awardConsistencyRows,
)}

### Calculation Validation

${renderMarkdownTable(
  ["Calculation", "Status", "Files Reviewed", "Tests Added/Updated", "Notes"],
  calculationRows,
)}

### Source Map

${renderMarkdownTable(
  ["Displayed Field", "Source", "Transform", "Confidence", "Notes"],
  sourceMapRows,
)}

## Architecture Note

1. UI search path: /search saves an active SavedSearch, /results selects the active search, calls searchFlightsViaApi(), which posts to /api/search/flights.
2. Test path: unit/provider/component tests call pure helpers, mocked provider clients, or mocked searchFlightsViaApi(); live APIs are not used in deterministic tests.
3. Flight data source: current route handler selects Travelpayouts for cash only when ENABLE_LIVE_CASH_PROVIDER and TRAVELPAYOUTS_TOKEN are set, otherwise mock cash. It selects Seats.aero for awards only when ENABLE_LIVE_AWARD_PROVIDER and SEATS_AERO_API_KEY are set, otherwise mock awards.
4. Cash price source: CashFlightOption.cashPriceUsd from Travelpayouts prices/cheap or mock data.
5. Same provider?: cash and award sources are separate; mock/mock can be paired, or Travelpayouts cash can be paired with Seats.aero/mock awards depending on env.
6. Mock/cached/hard-coded data: mock data is deterministic; Travelpayouts is cached month-level fare data; Seats.aero Cached Search is date-level cached availability; static airports and transfer partners are local data.
7. Real-vs-fallback distinction: provider envelopes include metadata.isLive and provider labels; the route silently falls back to mocks when live flags/secrets are absent.

## Raw Detail

Full normalized run details are in audit-output/flight-price-audit.json.
`;
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const providerReadiness = await getLiveProviderReadiness();
  const dates = getAuditDates();
  const records = [];

  console.log(renderPreflight(providerReadiness));

  if (config.requireLive && providerReadiness.providerMode === "unavailable") {
    throw new Error(
      "Live provider audit aborted: live provider was requested but no provider credentials are active.",
    );
  }

  if (config.requireLive && providerReadiness.providerMode === "mock") {
    throw new Error(
      "Live provider audit aborted: no live provider flags are enabled.",
    );
  }

  if (config.preflightOnly) {
    return;
  }

  for (const [origin, destination] of ROUTES) {
    for (const { date } of dates) {
      const search = createSearch({ date, destination, origin });

      for (let runIndex = 1; runIndex <= config.runs; runIndex += 1) {
        const { envelope, receivedAt } = await queryFlightSearch(
          config.baseUrl,
          search,
        );
        records.push(normalizeRun({ envelope, receivedAt, runIndex, search }));
      }
    }
  }

  const tables = buildTables(records);
  const outputDir = path.join(process.cwd(), "audit-output");
  const jsonPath = path.join(outputDir, "flight-price-audit.json");
  const markdownPath = path.join(outputDir, "flight-price-audit.md");
  const artifact = {
    generatedAt,
    baseUrl: config.baseUrl,
    providerReadiness,
    assumptions: {
      passengers: 1,
      cabin: "economy",
      tripType: "one_way",
      maxStops: 2,
      bagsOrSeatFeesModeled: false,
      rawThirdPartyPayloadsIncluded: false,
    },
    dateBuckets: dates,
    routes: ROUTES.map(([origin, destination]) => ({ origin, destination })),
    summary: {
      overallUsablePriceRate: getOverallUsablePriceRate(records),
      findings: getFindings(records),
      tables,
    },
    records,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(
    markdownPath,
    renderMarkdownReport({ generatedAt, records, tables }),
  );

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${markdownPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
