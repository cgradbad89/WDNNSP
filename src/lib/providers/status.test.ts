import { describe, expect, it } from "vitest";
import {
  combineProviderEnvelopes,
  combineProviderStatuses,
  hasUsableProviderData,
} from "@/lib/providers/status";
import type {
  ProviderResultEnvelope,
  ProviderStatus,
} from "@/lib/providers/types";

function createEnvelope<T>({
  data,
  isStale,
  providerId,
  status,
}: {
  data: T[];
  isStale?: boolean;
  providerId: string;
  status: ProviderStatus;
}): ProviderResultEnvelope<T> {
  return {
    status,
    data,
    metadata: {
      providerId,
      providerLabel: providerId,
      searchedAt: "2026-06-12T00:00:00.000Z",
      isLive: false,
      isStale,
    },
    messages: [],
  };
}

describe("provider status helpers", () => {
  it("detects usable provider data from envelope data", () => {
    expect(
      hasUsableProviderData(
        createEnvelope({
          data: ["cash-1"],
          providerId: "cash",
          status: "success",
        }),
      ),
    ).toBe(true);
    expect(
      hasUsableProviderData(
        createEnvelope({
          data: [],
          providerId: "cash",
          status: "no_results",
        }),
      ),
    ).toBe(false);
  });

  it("combines two successful statuses as success", () => {
    expect(combineProviderStatuses("success", "success")).toBe("success");
  });

  it("combines one usable status and one empty status as partial", () => {
    expect(combineProviderStatuses("success", "no_results")).toBe("partial");
  });

  it("combines two no-result statuses as no_results", () => {
    expect(combineProviderStatuses("no_results", "no_results")).toBe(
      "no_results",
    );
  });

  it("prioritizes rate limiting when no provider has usable status", () => {
    expect(combineProviderStatuses("rate_limited", "no_results")).toBe(
      "rate_limited",
    );
  });

  it("combines two unsupported-route statuses as unsupported_route", () => {
    expect(
      combineProviderStatuses("unsupported_route", "unsupported_route"),
    ).toBe("unsupported_route");
  });

  it("combines two error statuses as error", () => {
    expect(combineProviderStatuses("error", "error")).toBe("error");
  });

  it("returns stale when all usable envelope data is stale", () => {
    expect(
      combineProviderEnvelopes(
        createEnvelope({
          data: ["cash-1"],
          providerId: "cash",
          status: "stale",
        }),
        createEnvelope({
          data: ["award-1"],
          isStale: true,
          providerId: "award",
          status: "success",
        }),
      ),
    ).toBe("stale");
  });
});
