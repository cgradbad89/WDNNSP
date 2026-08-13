// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsPageClient } from "@/components/results/ResultsPageClient";
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
  return {
    source: "mock",
    airlineProgram: "Air Canada Aeroplan",
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
    ...overrides,
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
  cashPriceUsd: 4800,
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
): FlightSearchEnvelope {
  return {
    cash: {
      status: "success",
      data: [cashOption],
      metadata: {
        providerId: "mock-cash",
        providerLabel: "Mock Cash Provider",
        searchedAt: "2027-01-01T00:00:00.000Z",
        isLive: false,
      },
      messages: [],
    },
    awards: {
      status: "success",
      data: awardOptions,
      metadata: {
        providerId: "mock-award",
        providerLabel: "Mock Award Provider",
        searchedAt: "2027-01-01T00:00:00.000Z",
        isLive: false,
      },
      messages: [],
    },
    overallStatus: "success",
    messages: [],
  };
}

const searchFlightsViaApiMock = vi.fn();

vi.mock("@/lib/providers/client", () => ({
  searchFlightsViaApi: (...args: unknown[]) => searchFlightsViaApiMock(...args),
}));

async function renderResultsWithOptions(
  awardOptions: AwardFlightOption[],
): Promise<void> {
  searchFlightsViaApiMock.mockResolvedValue(buildEnvelope(awardOptions));
  render(<ResultsPageClient />);
  await screen.findByText("Transfer points to United MileagePlus");
}

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

    // The same option is not duplicated as a compact row below.
    expect(getRowProgramNames()).toEqual([
      "Air Canada Aeroplan",
      "Air France-KLM Flying Blue",
      "Obscure Airways Program",
    ]);
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
      within(obscureRow as HTMLElement).getByText("Not Enough Points"),
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
