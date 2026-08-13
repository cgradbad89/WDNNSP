// Single source of truth for turning a provider's live/mock state into
// display copy. Every UI location that needs to say "Live" vs "Mock" -
// ProviderSourceNote, the cash result card, the empty-cash-results copy,
// and the route details drawer - derives its wording from these helpers
// instead of re-deriving (and risking disagreeing with) the same boolean.
export interface ProviderSourceState {
  isLive: boolean;
  providerLabel: string;
}

export function getProviderLiveStatusLabel(
  isLive: boolean,
): "Live provider" | "Demo data" {
  return isLive ? "Live provider" : "Demo data";
}

export function getProviderShortStatusLabel(isLive: boolean): "Live" | "Mock" {
  return isLive ? "Live" : "Mock";
}

// Compact "<provider> · <status>" summary for tiles/labels that have room
// to show the real provider name once it is confirmed live. Genuinely mock
// data keeps the plain "Mock" wording rather than surfacing the internal
// mock provider label.
export function getProviderSourceSummary({
  isLive,
  providerLabel,
}: ProviderSourceState): string {
  return isLive ? `${providerLabel} · Live` : "Mock";
}
