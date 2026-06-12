import { isStaleProviderData } from "@/lib/providers/status";
import type {
  FlightSearchEnvelope,
  ProviderMessage,
  ProviderResultEnvelope,
  ProviderStatus,
} from "@/lib/providers/types";

export type ProviderDisplayTone = "success" | "info" | "warning" | "error";

export type ProviderResultsMode =
  | "cash_and_awards"
  | "cash_only"
  | "awards_only"
  | "none";

export type ProviderResultKind = "cash" | "awards" | "all";

export interface ProviderStatusDisplay {
  status: ProviderStatus;
  tone: ProviderDisplayTone;
  title: string;
  description: string;
}

export interface FlightSearchDisplayState {
  banner: ProviderStatusDisplay;
  hasAwardResults: boolean;
  hasCashResults: boolean;
  isStale: boolean;
  mode: ProviderResultsMode;
  showStatusBanner: boolean;
  status: ProviderStatus;
}

const statusDisplays: Record<ProviderStatus, ProviderStatusDisplay> = {
  success: {
    status: "success",
    tone: "success",
    title: "Provider data loaded",
    description: "Cash and award providers returned usable results.",
  },
  partial: {
    status: "partial",
    tone: "warning",
    title: "Showing partial provider results",
    description:
      "At least one provider returned usable results. Any unavailable provider section is labeled below.",
  },
  no_results: {
    status: "no_results",
    tone: "info",
    title: "No provider results for this search",
    description:
      "The current providers did not return cash fares or award options for these search criteria.",
  },
  unsupported_route: {
    status: "unsupported_route",
    tone: "warning",
    title: "Route not supported by current providers",
    description:
      "The selected route, dates, cabin, or passenger count is outside the current provider coverage.",
  },
  rate_limited: {
    status: "rate_limited",
    tone: "warning",
    title: "Provider rate limit reached",
    description:
      "Provider data is temporarily unavailable because one or more providers reached a rate limit.",
  },
  error: {
    status: "error",
    tone: "error",
    title: "Provider results unavailable",
    description:
      "The providers could not return usable data. Try this search again later.",
  },
  stale: {
    status: "stale",
    tone: "warning",
    title: "Provider results may be stale",
    description:
      "Results are available, but a provider marked them as stale. Verify prices and award space directly before acting.",
  },
};

const messageSeverityRank: Record<ProviderMessage["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function getProviderResultsMode({
  hasAwardResults,
  hasCashResults,
}: {
  hasAwardResults: boolean;
  hasCashResults: boolean;
}): ProviderResultsMode {
  if (hasCashResults && hasAwardResults) {
    return "cash_and_awards";
  }

  if (hasCashResults) {
    return "cash_only";
  }

  if (hasAwardResults) {
    return "awards_only";
  }

  return "none";
}

function getMissingCashDescription(hasOtherResults: boolean): string {
  if (hasOtherResults) {
    return "Award options are still shown, but WDNNSP cannot calculate a cash-backed cents-per-point value for this search.";
  }

  return "The cash provider did not return a fare benchmark for this search.";
}

function getMissingAwardDescription(hasOtherResults: boolean): string {
  if (hasOtherResults) {
    return "Use the cash benchmark as a price check, but no award recommendation is available from the current provider data.";
  }

  return "The award provider did not return award availability for this search.";
}

export function getProviderStatusDisplay(
  status: ProviderStatus,
): ProviderStatusDisplay {
  return statusDisplays[status];
}

export function getPrimaryProviderMessages(
  messages: ProviderMessage[],
  limit = 3,
): ProviderMessage[] {
  const seenMessages = new Set<string>();

  return messages
    .filter((message) => {
      const messageKey = `${message.code}:${message.message}`;

      if (seenMessages.has(messageKey)) {
        return false;
      }

      seenMessages.add(messageKey);
      return true;
    })
    .toSorted(
      (firstMessage, secondMessage) =>
        messageSeverityRank[firstMessage.severity] -
        messageSeverityRank[secondMessage.severity],
    )
    .slice(0, limit);
}

export function getFlightSearchDisplayState(
  envelope: FlightSearchEnvelope,
): FlightSearchDisplayState {
  const hasCashResults = envelope.cash.data.length > 0;
  const hasAwardResults = envelope.awards.data.length > 0;
  const isStale =
    isStaleProviderData(envelope.cash) || isStaleProviderData(envelope.awards);

  return {
    banner: getProviderStatusDisplay(envelope.overallStatus),
    hasAwardResults,
    hasCashResults,
    isStale,
    mode: getProviderResultsMode({
      hasAwardResults,
      hasCashResults,
    }),
    showStatusBanner: envelope.overallStatus !== "success",
    status: envelope.overallStatus,
  };
}

export function getNoProviderResultsDisplay({
  hasOtherResults = false,
  kind,
  status,
}: {
  hasOtherResults?: boolean;
  kind: ProviderResultKind;
  status: ProviderStatus;
}): ProviderStatusDisplay {
  if (kind === "cash") {
    return {
      status,
      tone: statusDisplays[status].tone,
      title: "Cash benchmark unavailable",
      description: getMissingCashDescription(hasOtherResults),
    };
  }

  if (kind === "awards") {
    return {
      status,
      tone: statusDisplays[status].tone,
      title: "No award options from the provider",
      description: getMissingAwardDescription(hasOtherResults),
    };
  }

  return getProviderStatusDisplay(status);
}

export function providerEnvelopeHasResults<T>(
  envelope: ProviderResultEnvelope<T>,
): boolean {
  return envelope.data.length > 0;
}
