import type {
  ProviderResultEnvelope,
  ProviderStatus,
} from "@/lib/providers/types";

const usableStatuses = new Set<ProviderStatus>([
  "success",
  "partial",
  "stale",
]);

function isUsableStatus(status: ProviderStatus): boolean {
  return usableStatuses.has(status);
}

export function hasUsableProviderData<T>(
  envelope: Pick<ProviderResultEnvelope<T>, "data">,
): boolean {
  return envelope.data.length > 0;
}

export function isStaleProviderData<T>(
  envelope: Pick<ProviderResultEnvelope<T>, "metadata" | "status">,
): boolean {
  return envelope.status === "stale" || envelope.metadata.isStale === true;
}

export function combineProviderStatuses(
  cashStatus: ProviderStatus,
  awardStatus: ProviderStatus,
): ProviderStatus {
  if (cashStatus === "success" && awardStatus === "success") {
    return "success";
  }

  if (cashStatus === "stale" && awardStatus === "stale") {
    return "stale";
  }

  if (isUsableStatus(cashStatus) || isUsableStatus(awardStatus)) {
    return "partial";
  }

  if (cashStatus === awardStatus) {
    return cashStatus;
  }

  if (cashStatus === "rate_limited" || awardStatus === "rate_limited") {
    return "rate_limited";
  }

  if (cashStatus === "error" || awardStatus === "error") {
    return "error";
  }

  if (
    cashStatus === "unsupported_route" ||
    awardStatus === "unsupported_route"
  ) {
    return "unsupported_route";
  }

  return "no_results";
}

export function combineProviderEnvelopes<TCash, TAward>(
  cash: ProviderResultEnvelope<TCash>,
  awards: ProviderResultEnvelope<TAward>,
): ProviderStatus {
  const hasCashData = hasUsableProviderData(cash);
  const hasAwardData = hasUsableProviderData(awards);

  if (!hasCashData && !hasAwardData) {
    return combineProviderStatuses(cash.status, awards.status);
  }

  const hasOnlyStaleUsableData =
    (!hasCashData || isStaleProviderData(cash)) &&
    (!hasAwardData || isStaleProviderData(awards));

  if (hasOnlyStaleUsableData) {
    return "stale";
  }

  if (
    hasCashData &&
    hasAwardData &&
    cash.status === "success" &&
    awards.status === "success"
  ) {
    return "success";
  }

  return "partial";
}
