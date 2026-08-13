import { describe, expect, it } from "vitest";
import {
  getProviderLiveStatusLabel,
  getProviderShortStatusLabel,
  getProviderSourceSummary,
} from "@/lib/providers/sourceLabel";

describe("provider source label helpers", () => {
  it("labels live data as 'Live provider'", () => {
    expect(getProviderLiveStatusLabel(true)).toBe("Live provider");
  });

  it("labels non-live data as 'Demo data'", () => {
    expect(getProviderLiveStatusLabel(false)).toBe("Demo data");
  });

  it("gives the short 'Live' label for live data", () => {
    expect(getProviderShortStatusLabel(true)).toBe("Live");
  });

  it("gives the short 'Mock' label for non-live data", () => {
    expect(getProviderShortStatusLabel(false)).toBe("Mock");
  });

  it("summarizes live data with the real provider name", () => {
    expect(
      getProviderSourceSummary({ isLive: true, providerLabel: "Travelpayouts" }),
    ).toBe("Travelpayouts · Live");
  });

  it("summarizes non-live data as plain 'Mock', not the internal mock provider name", () => {
    expect(
      getProviderSourceSummary({
        isLive: false,
        providerLabel: "Mock Cash Provider",
      }),
    ).toBe("Mock");
  });
});
