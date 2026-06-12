export interface ProviderResultReference {
  providerId: string;
  providerLabel: string;
  resultId?: string;
  sourceUrl?: string;
}

export interface FreshnessMetadata {
  searchedAt?: string;
  lastCheckedAt?: string;
  expiresAt?: string;
  isLive?: boolean;
  isStale?: boolean;
  staleReason?: string;
}

export interface PriceMoney {
  amount: number;
  currency: string;
}

export interface ProviderLimitation {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}
