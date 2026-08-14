// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsPageClient } from "@/components/results/ResultsPageClient";
import { createSearchFingerprint } from "@/lib/comparison/searchFingerprint";
import type { AwardFlightOption } from "@/types/awards";
import type { CashFlightOption } from "@/types/flights";
import type { PointsAccount } from "@/types/points";
import type { SavedSearch } from "@/types/search";
import type { FlightSearchEnvelope } from "@/lib/providers/types";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    createAccountWithEmail: vi.fn(),
    error: null,
    isLoading: false,
    signInWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
    user: null,
  }),
}));

const walletAccounts: PointsAccount[] = [
  {
    id: "w1",
    userId: "local-user",
    programId: "chase-ultimate-rewards",
    programName: "Chase Ultimate Rewards",
    programType: "credit_card",
    balance: 400000,
    lastUpdatedAt: "2027-01-01T00:00:00.000Z",
  },
  {
    id: "w2",
    userId: "local-user",
    programId: "united-mileageplus",
    programName: "United MileagePlus",
    programType: "airline",
    balance: 200000,
    lastUpdatedAt: "2027-01-01T00:00:00.000Z",
  },
];

vi.mock("@/lib/wallet/useWalletAccounts", () => ({
  useWalletAccounts: () => ({
    accounts: walletAccounts,
    error: null,
    hasStoredValue: true,
    isLoading: false,
    reload: vi.fn(),
    saveAccounts: vi.fn(),
    source: "local",
  }),
}));

const activeSearch: SavedSearch = {
  id: "search-1",
  userId: "local-user",
  name: "Test Trip",
  originCodes: ["IAD"],
  destinationCodes: ["NRT"],
  departDate: "2027-05-01",
  returnDate: "2027-05-10",
  tripType: "round_trip",
  passengers: 2,
  cabin: "business",
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
};

const saveActiveSearchMock = vi.fn().mockResolvedValue(undefined);
const activeSearchFingerprint = createSearchFingerprint(activeSearch);

vi.mock("@/lib/search/useSearchData", () => ({
  useSearchData: () => ({
    activeSearch,
    activeSearchHasStoredValue: true,
    clearActiveSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    error: null,
    isLoading: false,
    reload: vi.fn(),
    saveActiveSearch: saveActiveSearchMock,
    savedSearches: [],
    savedSearchesHaveStoredValue: false,
    saveSavedSearches: vi.fn(),
    source: "local",
  }),
}));

function createAwardOption(
  overrides: Partial<AwardFlightOption> & Pick<AwardFlightOption, "id">,
): AwardFlightOption {
  const airlineProgram = overrides.airlineProgram ?? "Air Canada Aeroplan";
  const sourceProgramIds: Record<string, string> = {
    "Air Canada Aeroplan": "air-canada-aeroplan",
    "Air France-KLM Flying Blue": "air-france-klm-flying-blue",
    "United MileagePlus": "united-mileageplus",
  };
  const comparison = {
    searchFingerprint: activeSearchFingerprint,
    tripType: activeSearch.tripType,
    passengerCount: activeSearch.passengers,
    cabin: activeSearch.cabin,
    cabinConfirmed: true,
    isExactDateComparable: true,
    isBenchmarkOnly: false,
    availabilityStatus: "available" as const,
    ...overrides.comparison,
  };

  return {
    source: "mock",
    airlineProgram,
    sourceProgramId: sourceProgramIds[airlineProgram],
    origin: "IAD",
    destination: "NRT",
    departureDateTime: "2027-05-01T09:00:00-04:00",
    arrivalDateTime: "2027-05-02T14:00:00+09:00",
    cabin: "business",
    pointsRequired: 90000,
    taxesAndFeesUsd: 190,
    transferSources: ["Chase Ultimate Rewards"],
    stops: 1,
    durationMinutes: 730,
    confidence: "medium",
    availabilityStatus: "available",
    ...overrides,
    comparison,
  };
}

const cashOption: CashFlightOption = {
  id: "cash-1",
  source: "mock",
  airline: "Mock Air",
  flightNumbers: ["MK100"],
  origin: "IAD",
  destination: "NRT",
  departureDateTime: "2027-05-01T09:00:00-04:00",
  arrivalDateTime: "2027-05-01T09:00:00-04:00",
  durationMinutes: 0,
  stops: 0,
  cabin: "business",
  cabinConfirmed: true,
  cashPriceUsd: 4800,
  comparison: {
    searchFingerprint: activeSearchFingerprint,
    tripType: activeSearch.tripType,
    passengerCount: activeSearch.passengers,
    cabin: activeSearch.cabin,
    cabinConfirmed: true,
    isExactDateComparable: true,
    isBenchmarkOnly: false,
  },
};

const heroOption = createAwardOption({
  id: "opt-united",
  airlineProgram: "United MileagePlus",
  source: "seats_aero",
  pointsRequired: 120000,
  taxesAndFeesUsd: 48,
  stops: 0,
  confidence: "high",
  durationMinutes: 705,
});
const aeroplanOption = createAwardOption({
  id: "opt-aeroplan",
  airlineProgram: "Air Canada Aeroplan",
  source: "mock",
  pointsRequired: 90000,
  taxesAndFeesUsd: 360,
  durationMinutes: 730,
});
const klmOption = createAwardOption({
  id: "opt-klm",
  airlineProgram: "Air France-KLM Flying Blue",
  source: "seats_aero",
  pointsRequired: 150000,
  taxesAndFeesUsd: 190,
  durationMinutes: 700,
});
const obscureOption = createAwardOption({
  id: "opt-obscure",
  airlineProgram: "Obscure Airways Program",
  source: "mock",
  pointsRequired: 300000,
  taxesAndFeesUsd: 900,
  stops: 2,
  cabin: "economy",
  confidence: "low",
  durationMinutes: 1500,
});

function buildEnvelope(
  awardOptions: AwardFlightOption[],
  cashOverrides: {
    data?: CashFlightOption[];
    messages?: FlightSearchEnvelope["cash"]["messages"];
    isLive?: boolean;
    overallStatus?: FlightSearchEnvelope["overallStatus"];
    awardStatus?: FlightSearchEnvelope["awards"]["status"];
    providerLabel?: string;
    status?: FlightSearchEnvelope["cash"]["status"];
  } = {},
): FlightSearchEnvelope {
  return {
    cash: {
      status: cashOverrides.status ?? "success",
      data: cashOverrides.data ?? [cashOption],
      metadata: {
        providerId: "mock-cash",
        providerLabel: cashOverrides.providerLabel ?? "Mock Cash Provider",
        searchedAt: "2027-01-01T00:00:00.000Z",
        isLive: cashOverrides.isLive ?? false,
      },
      messages: cashOverrides.messages ?? [],
    },
    awards: {
      status: cashOverrides.awardStatus ?? "success",
      data: awardOptions,
      metadata: {
        providerId: "mock-award",
        providerLabel: "Mock Award Provider",
        searchedAt: "2027-01-01T00:00:00.000Z",
        isLive: false,
      },
      messages: [],
    },
    overallStatus: cashOverrides.overallStatus ?? "success",
    messages: [...(cashOverrides.messages ?? [])],
  };
}

const searchFlightsViaApiMock = vi.fn();

vi.mock("@/lib/providers/client", () => ({
  searchFlightsViaApi: (...args: unknown[]) => searchFlightsViaApiMock(...args),
}));

async function renderResultsWithOptions(
  awardOptions: AwardFlightOption[],
  cashOverrides?: Parameters<typeof buildEnvelope>[1],
): Promise<void> {
  searchFlightsViaApiMock.mockResolvedValue(
    buildEnvelope(awardOptions, cashOverrides),
  );
  render(<ResultsPageClient />);
  await screen.findByText("Results");
}

const unreportedFieldsAwardOption = createAwardOption({
  id: "opt-unreported",
  airlineProgram: "Turkish Miles&Smiles",
  source: "seats_aero",
  pointsRequired: 50000,
  taxesAndFeesUsd: undefined,
  stops: undefined,
  confidence: undefined,
  durationMinutes: undefined,
});

const unreportedFieldsCashOption: CashFlightOption = {
  id: "cash-unreported",
  source: "travelpayouts",
  airline: "Live Cached Fare",
  flightNumbers: ["NH6"],
  origin: "IAD",
  destination: "NRT",
  departureDateTime: "2027-05-01T09:00:00-04:00",
  cabin: "business",
  cabinConfirmed: false,
  cashPriceUsd: 5200,
};

function getRowProgramNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 4 })
    .map((node) => node.textContent)
    .filter((text): text is string => Boolean(text));
}

beforeEach(() => {
  searchFlightsViaApiMock.mockReset();
  saveActiveSearchMock.mockClear();
});

describe("ResultsPageClient sticky top bar", () => {
  it("shows the active search as a single editable pill and opens the existing edit-search drawer on click", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption]);

    expect(screen.getByLabelText("Active search")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /IAD -> NRT/ }));

    expect(
      screen.getByRole("dialog", { name: "Update active search" }),
    ).toBeInTheDocument();
  });
});

describe("ResultsPageClient hero card and compact rows", () => {
  it("shows the best-scoring option as the hero and excludes it from the compact rows below", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      klmOption,
      obscureOption,
    ]);

    // Hero card (BestRecommendationCard) shows the top pick.
    expect(screen.getByText("Transfer points to United MileagePlus")).toBeInTheDocument();
    expect(
      screen.getByText(/Compared using a default 1\.4 cpp valuation for United MileagePlus\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your personal value for these points may differ\./)).toBeInTheDocument();
    expect(screen.queryByText("Options need verification")).not.toBeInTheDocument();

    // The same option is not duplicated as a compact row below.
    expect(getRowProgramNames()).toEqual([
      "Air Canada Aeroplan",
      "Air France-KLM Flying Blue",
      "Obscure Airways Program",
    ]);
  });

  it("can recommend cash over awards when the cash fare is the better decision", async () => {
    const cheapCashOption: CashFlightOption = {
      ...cashOption,
      id: "cash-cheap",
      cashPriceUsd: 900,
    };
    const poorAwardOption = createAwardOption({
      id: "opt-poor-value",
      pointsRequired: 220000,
      taxesAndFeesUsd: 300,
      confidence: "high",
    });

    await renderResultsWithOptions([poorAwardOption], {
      data: [cheapCashOption],
    });

    expect(screen.getByText("Pay cash")).toBeInTheDocument();
    expect(screen.getAllByText("Best Overall")).toHaveLength(1);
    expect(
      screen.getByText(
        "Cash appears to be the better option for this search under the current point-valuation assumptions.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cash is evaluated as a direct out-of-pocket option."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Transfer points to Air Canada Aeroplan"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Pay Cash Check").length).toBeGreaterThan(0);
    expect(getRowProgramNames()).toEqual(["Air Canada Aeroplan"]);
  });

  it("shows a neutral verification state instead of promoting a non-comparable first award to the hero", async () => {
    await renderResultsWithOptions([obscureOption], {
      data: [],
      status: "no_results",
    });

    expect(screen.getByText("Options need verification")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We found award options, but none are comparable enough to recommend yet. Review the details below before transferring points or booking.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Best Overall")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Transfer points to Obscure Airways Program"),
    ).not.toBeInTheDocument();
  });

  it("keeps unsafe award options in the regular ranked list when no safe hero recommendation exists", async () => {
    await renderResultsWithOptions([obscureOption], {
      data: [],
      status: "no_results",
    });

    const obscureRow = screen
      .getByText("Obscure Airways Program")
      .closest("article");

    expect(obscureRow).not.toBeNull();
    expect(
      within(obscureRow as HTMLElement).getByText("Not Enough Points"),
    ).toBeInTheDocument();
    expect(getRowProgramNames()).toEqual(["Obscure Airways Program"]);
  });

  it("preserves the normal no-provider-results state when providers return no award or cash options", async () => {
    await renderResultsWithOptions([], {
      data: [],
      awardStatus: "no_results",
      overallStatus: "no_results",
      status: "no_results",
    });

    expect(
      screen.getByText("No provider results for Test Trip"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("No provider results for this search").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Options need verification")).not.toBeInTheDocument();
    expect(screen.queryByText("Best Overall")).not.toBeInTheDocument();
  });

  it("uses partial-results header language when award rows are visible but cash is unavailable", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [],
      status: "no_results",
      overallStatus: "partial",
    });

    expect(screen.getByText("Partial results for Test Trip")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Award options are available, but cash pricing is unavailable or not comparable for this search.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No provider results for Test Trip"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("United MileagePlus")).toBeInTheDocument();
  });

  it("shows explicit unavailable-cash provider errors without promoting fake CPP or cash best labels", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [],
      isLive: true,
      messages: [
        {
          code: "travelpayouts_not_configured",
          severity: "error",
          message:
            "Travelpayouts cash provider is enabled but unavailable because required credentials are missing.",
          internalReasons: ["missing_travelpayouts_token"],
        },
      ],
      overallStatus: "partial",
      providerLabel: "Travelpayouts",
      status: "error",
    });

    expect(screen.getByText("Partial results for Test Trip")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Travelpayouts cash provider is enabled but unavailable because required credentials are missing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("United MileagePlus")).toBeInTheDocument();
    expect(screen.getByText("Cash fare estimate unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Pay cash")).not.toBeInTheDocument();
    expect(screen.queryByText("Best Overall")).not.toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  it("uses cash-results header language when cash is visible but award rows are unavailable", async () => {
    const benchmarkCashOption: CashFlightOption = {
      ...cashOption,
      source: "travelpayouts",
      cabinConfirmed: false,
      comparison: {
        ...cashOption.comparison,
        cabinConfirmed: false,
        isExactDateComparable: false,
        isBenchmarkOnly: true,
      },
      limitations: [
        {
          code: "provider_benchmark_only",
          severity: "warning",
          message: "Benchmark only.",
        },
      ],
    };

    await renderResultsWithOptions([], {
      data: [benchmarkCashOption],
      awardStatus: "no_results",
      overallStatus: "partial",
      providerLabel: "Travelpayouts",
    });

    expect(screen.getByText("Cash results for Test Trip")).toBeInTheDocument();
    expect(
      screen.getByText("No comparable award options were found for this search."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No provider results for Test Trip"),
    ).not.toBeInTheDocument();
  });

  it("shows transfer-required and not-enough-points badges for the right rows", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      obscureOption,
    ]);

    const aeroplanRow = screen
      .getByText("Air Canada Aeroplan")
      .closest("article");
    const obscureRow = screen
      .getByText("Obscure Airways Program")
      .closest("article");

    expect(aeroplanRow).not.toBeNull();
    expect(obscureRow).not.toBeNull();
    expect(within(aeroplanRow as HTMLElement).getByText("Transfer required")).toBeInTheDocument();
    expect(
      within(obscureRow as HTMLElement).getByText("Needs Verification"),
    ).toBeInTheDocument();
    expect(
      within(obscureRow as HTMLElement).queryByText("Transfer required"),
    ).not.toBeInTheDocument();
  });

  it("expands a row to reveal transfer path details without losing the View route details action", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption]);

    const row = screen.getByText("Air Canada Aeroplan").closest("article") as HTMLElement;
    expect(
      within(row).queryByText(/Chase Ultimate Rewards/),
    ).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: /show details/i }));

    expect(within(row).getByText(/Chase Ultimate Rewards/)).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "View route details" }),
    ).toBeInTheDocument();
  });
});

describe("ResultsPageClient filter rail", () => {
  it("Business cabin only hides the economy row", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      obscureOption,
    ]);

    expect(screen.getByText("Obscure Airways Program")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Business cabin only" }),
    );

    expect(screen.queryByText("Obscure Airways Program")).not.toBeInTheDocument();
    expect(screen.getByText("Air Canada Aeroplan")).toBeInTheDocument();
  });

  it("Max one stop hides options with two or more stops", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      obscureOption,
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Max one stop" }));

    expect(screen.queryByText("Obscure Airways Program")).not.toBeInTheDocument();
  });

  it("Show only options bookable with my points hides not-enough-points rows", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      obscureOption,
    ]);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Show only options bookable with my points",
      }),
    );

    expect(screen.queryByText("Obscure Airways Program")).not.toBeInTheDocument();
    expect(screen.getByText("Air Canada Aeroplan")).toBeInTheDocument();
  });

  describe("Live only (hide mock)", () => {
    it("is off by default", async () => {
      await renderResultsWithOptions([heroOption, aeroplanOption]);

      expect(
        screen.getByRole("checkbox", { name: "Live only (hide mock)" }),
      ).not.toBeChecked();
    });

    it("hides mock-sourced rows but keeps live-sourced rows", async () => {
      await renderResultsWithOptions([
        heroOption,
        aeroplanOption,
        klmOption,
      ]);

      fireEvent.click(
        screen.getByRole("checkbox", { name: "Live only (hide mock)" }),
      );

      expect(screen.queryByText("Air Canada Aeroplan")).not.toBeInTheDocument();
      expect(screen.getByText("Air France-KLM Flying Blue")).toBeInTheDocument();
    });

    it("results in an empty list, not an error, when every remaining row is mock-sourced", async () => {
      await renderResultsWithOptions([heroOption, aeroplanOption, obscureOption]);

      fireEvent.click(
        screen.getByRole("checkbox", { name: "Live only (hide mock)" }),
      );

      expect(
        screen.getByText(
          "No award options match the current filters. Clear one or more filters to compare the mock options again.",
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("ResultsPageClient sort control", () => {
  it("sorts rows by fewest points required", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      klmOption,
      obscureOption,
    ]);

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "fewest_points" },
    });

    await waitFor(() =>
      expect(getRowProgramNames()).toEqual([
        "Air Canada Aeroplan",
        "Air France-KLM Flying Blue",
        "Obscure Airways Program",
      ]),
    );
  });

  it("sorts rows by lowest taxes/fees", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      klmOption,
      obscureOption,
    ]);

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "lowest_fees" },
    });

    await waitFor(() =>
      expect(getRowProgramNames()).toEqual([
        "Air France-KLM Flying Blue",
        "Air Canada Aeroplan",
        "Obscure Airways Program",
      ]),
    );
  });

  it("sorts rows by fastest total duration", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      klmOption,
      obscureOption,
    ]);

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "fastest" },
    });

    await waitFor(() =>
      expect(getRowProgramNames()).toEqual([
        "Air France-KLM Flying Blue",
        "Air Canada Aeroplan",
        "Obscure Airways Program",
      ]),
    );
  });

  it("best match does not change which option is the hero", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      klmOption,
      obscureOption,
    ]);

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "fewest_points" },
    });
    await waitFor(() =>
      expect(getRowProgramNames()[0]).toBe("Air Canada Aeroplan"),
    );

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "best_match" },
    });

    expect(
      screen.getByText("Transfer points to United MileagePlus"),
    ).toBeInTheDocument();
  });
});

describe("ResultsPageClient live-vs-mock provider labels", () => {
  it("labels a live cash result with the real provider name and never says Mock anywhere on the page", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [unreportedFieldsCashOption],
      isLive: true,
      providerLabel: "Travelpayouts",
    });

    expect(screen.getByText("Cached cash fare estimate")).toBeInTheDocument();
    expect(screen.queryByText("Mock fare estimate")).not.toBeInTheDocument();
    expect(screen.queryByText("Live cash price")).not.toBeInTheDocument();
    expect(screen.getByText("Travelpayouts · Live")).toBeInTheDocument();

    const cashSourceNote = screen.getByLabelText("Cash fare estimate source details");

    expect(within(cashSourceNote).getByText("Travelpayouts")).toBeInTheDocument();
    expect(within(cashSourceNote).getByText("Live provider")).toBeInTheDocument();
    expect(within(cashSourceNote).queryByText("Demo data")).not.toBeInTheDocument();
  });

  it("keeps the mock estimate label and Mock source tile for genuinely mock cash data", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption]);

    expect(screen.getByText("Mock fare estimate")).toBeInTheDocument();
    expect(
      screen.getByText("Mock", { selector: "p.text-lg" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Live cash price")).not.toBeInTheDocument();
  });

  it("names the provider that actually ran in the empty-cash-results copy, not a provider that was never called", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [],
      isLive: false,
      providerLabel: "Mock Cash Provider",
      status: "no_results",
    });

    expect(
      screen.getByText(/Mock Cash Provider did not have a cached cash fare estimate/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Travelpayouts/)).not.toBeInTheDocument();
  });

  it("names the live provider in the empty-cash-results copy when the live provider ran and returned nothing", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [],
      isLive: true,
      providerLabel: "Travelpayouts",
      status: "no_results",
    });

    expect(
      screen.getByText(/Travelpayouts did not have a cached cash fare estimate/),
    ).toBeInTheDocument();
  });

  it("does not render missing cash as $0 or a numeric CPP", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [],
      isLive: true,
      providerLabel: "Travelpayouts",
      status: "no_results",
    });

    expect(screen.getByText("Cash fare estimate unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("shows the real provider name instead of 'mock' in the route details drawer for a live-sourced row missing route detail", async () => {
    const liveRowOption = createAwardOption({
      id: "opt-live-row",
      airlineProgram: "Lufthansa Miles & More",
      source: "seats_aero",
      pointsRequired: 200000,
      taxesAndFeesUsd: 250,
      confidence: "low",
      durationMinutes: 1200,
      provider: { providerId: "seats-aero", providerLabel: "Seats.aero" },
      freshness: { isLive: true },
    });

    await renderResultsWithOptions([heroOption, aeroplanOption, liveRowOption]);

    const liveRow = screen
      .getByText("Lufthansa Miles & More")
      .closest("article") as HTMLElement;
    fireEvent.click(
      within(liveRow).getByRole("button", { name: "View route details" }),
    );

    expect(
      screen.getByText("Route details are not available for this Seats.aero option."),
    ).toBeInTheDocument();
  });

  it("keeps the 'mock option' route details message for a genuinely mock row missing route detail", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption]);

    const mockRow = screen
      .getByText("Air Canada Aeroplan")
      .closest("article") as HTMLElement;
    fireEvent.click(
      within(mockRow).getByRole("button", { name: "View route details" }),
    );

    expect(
      screen.getByText("Route details are not available for this mock option."),
    ).toBeInTheDocument();
  });

  it("shows source and freshness disclosure for a cached Travelpayouts cash estimate in the details drawer", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [unreportedFieldsCashOption],
      isLive: true,
      providerLabel: "Travelpayouts",
    });

    const cashCard = screen
      .getByText("Cash fare estimate", { selector: "h3" })
      .closest("article") as HTMLElement;
    fireEvent.click(
      within(cashCard).getByRole("button", { name: "View route details" }),
    );

    const disclosure = screen.getByLabelText("Provider source disclosure");

    expect(within(disclosure).getByText("Travelpayouts")).toBeInTheDocument();
    expect(within(disclosure).getByText("Cached fare estimate")).toBeInTheDocument();
    expect(within(disclosure).getByText("Not separately confirmed")).toBeInTheDocument();
    expect(within(disclosure).getByText("No")).toBeInTheDocument();
  });

  it("shows mock award source and limited CPP confidence in the details drawer", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption]);

    const mockRow = screen
      .getByText("Air Canada Aeroplan")
      .closest("article") as HTMLElement;
    fireEvent.click(
      within(mockRow).getByRole("button", { name: "View route details" }),
    );

    const disclosure = screen.getByLabelText("Provider source disclosure");

    expect(within(disclosure).getByText("Mock Award Provider")).toBeInTheDocument();
    expect(within(disclosure).getByText("Live award availability")).toBeInTheDocument();
    expect(
      within(disclosure).getByText(
        "Limited by mock data, missing taxes/fees, or comparability",
      ),
    ).toBeInTheDocument();
  });
});

describe("ResultsPageClient unreported-field disclosure", () => {
  it("shows honest 'not reported'/'not confirmed' copy for an award row with unreported fees, stops, confidence, and duration - never a fabricated real-looking value", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      unreportedFieldsAwardOption,
    ]);

    const row = screen
      .getByText("Turkish Miles&Smiles")
      .closest("article") as HTMLElement;

    expect(within(row).getByText(/Stops not confirmed/)).toBeInTheDocument();
    expect(within(row).getByText(/unreported confidence/)).toBeInTheDocument();
    expect(within(row).getByText(/Not reported/)).toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: /show details/i }));

    expect(within(row).getByText("Duration not reported")).toBeInTheDocument();
    expect(within(row).getByText("N/A")).toBeInTheDocument();
    expect(within(row).queryByText("0.0")).not.toBeInTheDocument();
  });

  it("never shows a hardcoded 'Nonstop' claim for an award option whose stops were never confirmed", async () => {
    await renderResultsWithOptions([
      heroOption,
      aeroplanOption,
      unreportedFieldsAwardOption,
    ]);

    const row = screen
      .getByText("Turkish Miles&Smiles")
      .closest("article") as HTMLElement;

    expect(within(row).queryByText(/Nonstop/)).not.toBeInTheDocument();
  });

  it("shows honest 'not reported'/'not confirmed' copy on the cash benchmark card, and removes the old blanket 'Fees: Included' claim", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [unreportedFieldsCashOption],
      isLive: true,
      providerLabel: "Travelpayouts",
    });

    expect(screen.getAllByText(/Stops not confirmed/).length).toBeGreaterThan(0);
    expect(screen.getByText("Duration not reported")).toBeInTheDocument();
    expect(screen.getByText("Taxes/fees")).toBeInTheDocument();
    expect(screen.queryByText("Included")).not.toBeInTheDocument();
  });

  it("labels an unconfirmed cash cabin as the searched cabin rather than implying it was confirmed", async () => {
    await renderResultsWithOptions([heroOption, aeroplanOption], {
      data: [unreportedFieldsCashOption],
      isLive: true,
      providerLabel: "Travelpayouts",
    });

    expect(screen.getByText(/Searched: Business/)).toBeInTheDocument();
  });
});
