export interface ProviderProgramMetadata {
  aliases?: string[];
  externalSlugs?: string[];
}

export interface CanonicalLoyaltyProgram {
  id: string;
  displayName: string;
  providerAliases: string[];
  knownExternalSlugs: string[];
  providerMetadata?: Record<string, ProviderProgramMetadata>;
}

export interface LoyaltyProgramNormalizationInput {
  provider: string;
  rawProgramId?: string;
  rawProgramName?: string;
}

export interface LoyaltyProgramNormalizationResult {
  provider: string;
  rawProgramId?: string;
  rawProgramName?: string;
  programId?: string;
  displayName?: string;
  isResolved: boolean;
}
