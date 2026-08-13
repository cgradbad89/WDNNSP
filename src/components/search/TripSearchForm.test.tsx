// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TripSearchForm } from "@/components/search/TripSearchForm";
import type { SavedSearch } from "@/types/search";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

vi.mock("@/lib/wallet/useWalletAccounts", () => ({
  useWalletAccounts: () => ({
    accounts: [],
    error: null,
    hasStoredValue: false,
    isLoading: false,
    reload: vi.fn(),
    saveAccounts: vi.fn(),
    source: "local",
  }),
}));

const saveActiveSearchMock = vi.fn().mockResolvedValue(undefined);
const deleteSavedSearchMock = vi.fn().mockResolvedValue(undefined);
const saveSavedSearchesMock = vi.fn().mockResolvedValue(undefined);

let mockSavedSearches: SavedSearch[] = [];

vi.mock("@/lib/search/useSearchData", () => ({
  useSearchData: () => ({
    activeSearch: null,
    activeSearchHasStoredValue: false,
    clearActiveSearch: vi.fn(),
    deleteSavedSearch: deleteSavedSearchMock,
    error: null,
    isLoading: false,
    reload: vi.fn(),
    saveActiveSearch: saveActiveSearchMock,
    savedSearches: mockSavedSearches,
    savedSearchesHaveStoredValue: false,
    saveSavedSearches: saveSavedSearchesMock,
    source: "local",
  }),
}));

function buildSavedSearch(overrides: Partial<SavedSearch> = {}): SavedSearch {
  return {
    cabin: "economy",
    createdAt: "2027-01-01T00:00:00.000Z",
    departDate: "2027-06-01",
    destinationCodes: ["LHR"],
    id: "saved-1",
    name: "London Getaway",
    originCodes: ["IAD"],
    passengers: 1,
    returnDate: "2027-06-10",
    tripType: "round_trip",
    updatedAt: "2027-01-01T00:00:00.000Z",
    userId: "local-user",
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockClear();
  saveActiveSearchMock.mockClear();
  deleteSavedSearchMock.mockClear();
  saveSavedSearchesMock.mockClear();
  mockSavedSearches = [];
});

describe("TripSearchForm trip-type toggle", () => {
  it("only offers Round trip and One way (no Multi-city, matching Phase 1 findings)", () => {
    render(<TripSearchForm />);

    const toggle = screen.getByRole("radiogroup", { name: "Trip type" });
    const options = within(toggle).getAllByRole("radio");

    expect(options.map((option) => option.textContent)).toEqual([
      "Round trip",
      "One way",
    ]);
  });

  it("collapses the dates field to a single date when switched to one way", () => {
    render(<TripSearchForm />);

    fireEvent.click(screen.getByRole("radio", { name: "One way" }));
    fireEvent.click(screen.getByRole("button", { name: /May 1/ }));

    expect(screen.getByLabelText("Depart")).toBeInTheDocument();
    expect(screen.queryByLabelText("Return")).not.toBeInTheDocument();
  });
});

describe("TripSearchForm submission", () => {
  it("submits with airport-group codes expanded for both origin and destination", async () => {
    render(<TripSearchForm />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/results"));
    expect(saveActiveSearchMock).toHaveBeenCalledTimes(1);
    const submitted = saveActiveSearchMock.mock.calls[0][0] as SavedSearch;
    expect(submitted.originCodes).toEqual(["DCA", "IAD", "BWI"]);
    expect(submitted.destinationCodes).toEqual(["HND", "NRT"]);
  });

  it("does not submit when a required field is invalid", () => {
    render(<TripSearchForm />);

    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(saveActiveSearchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("reset defaults restores the initial trip name", () => {
    render(<TripSearchForm />);

    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "Something else" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset defaults" }));

    expect(screen.getByLabelText("Trip name")).toHaveValue("Tokyo Spring Trip");
  });
});

describe("TripSearchForm swap control", () => {
  it("swaps origin and destination so the swapped route is what gets submitted", async () => {
    render(<TripSearchForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Swap origin and destination" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(saveActiveSearchMock).toHaveBeenCalledTimes(1));
    const submitted = saveActiveSearchMock.mock.calls[0][0] as SavedSearch;
    expect(submitted.originCodes).toEqual(["HND", "NRT"]);
    expect(submitted.destinationCodes).toEqual(["DCA", "IAD", "BWI"]);
  });
});

describe("TripSearchForm combined dates and travelers/cabin fields", () => {
  it("opens the dates popover with depart and return date inputs", () => {
    render(<TripSearchForm />);

    fireEvent.click(screen.getByRole("button", { name: /May 1 - May 10/ }));

    expect(screen.getByLabelText("Depart")).toHaveValue("2027-05-01");
    expect(screen.getByLabelText("Return")).toHaveValue("2027-05-10");
  });

  it("opens the travelers and cabin popover with cabin and passenger inputs", () => {
    render(<TripSearchForm />);

    fireEvent.click(
      screen.getByRole("button", { name: /2 travelers - Business/ }),
    );

    expect(screen.getByLabelText("Cabin")).toHaveValue("business");
    expect(screen.getByLabelText("Passengers")).toHaveValue(2);
  });
});

describe("TripSearchForm saved-search chips", () => {
  it("running a supported chip reuses the existing save-active-search + navigate flow", async () => {
    mockSavedSearches = [buildSavedSearch()];
    render(<TripSearchForm />);

    fireEvent.click(screen.getByRole("button", { name: /^London Getaway/ }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/results"));
    expect(saveActiveSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "saved-1", name: "London Getaway" }),
    );
  });

  it("shows an unsupported saved search as needing update and does not run it", () => {
    mockSavedSearches = [
      buildSavedSearch({
        id: "saved-2",
        name: "Legacy Search",
        originCodes: ["ZZZ"],
      }),
    ];
    render(<TripSearchForm />);

    expect(screen.getByText("Needs update")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Legacy Search/ }));

    expect(saveActiveSearchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("deleting a chip calls deleteSavedSearch with that search's id", () => {
    mockSavedSearches = [buildSavedSearch()];
    render(<TripSearchForm />);

    fireEvent.click(
      screen.getByRole("button", {
        name: 'Delete saved search "London Getaway"',
      }),
    );

    expect(deleteSavedSearchMock).toHaveBeenCalledWith("saved-1");
  });
});
