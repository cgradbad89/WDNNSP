import { LOYALTY_PROGRAM_REGISTRY } from "@/data/loyaltyPrograms";
import type {
  CanonicalLoyaltyProgram,
  LoyaltyProgramNormalizationInput,
  LoyaltyProgramNormalizationResult,
} from "@/types/loyaltyPrograms";

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function getProgramTokens(program: CanonicalLoyaltyProgram): Set<string> {
  const tokens = new Set<string>([
    program.id,
    program.displayName,
    ...program.providerAliases,
    ...program.knownExternalSlugs,
  ].map(normalizeToken));

  for (const metadata of Object.values(program.providerMetadata ?? {})) {
    for (const alias of metadata.aliases ?? []) {
      tokens.add(normalizeToken(alias));
    }

    for (const slug of metadata.externalSlugs ?? []) {
      tokens.add(normalizeToken(slug));
    }
  }

  return tokens;
}

function findProgramByInput(
  input: LoyaltyProgramNormalizationInput,
): CanonicalLoyaltyProgram | undefined {
  const candidates = [input.rawProgramId, input.rawProgramName]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeToken)
    .filter(Boolean);

  if (candidates.length === 0) {
    return undefined;
  }

  return LOYALTY_PROGRAM_REGISTRY.find((program) => {
    const tokens = getProgramTokens(program);

    return candidates.some((candidate) => tokens.has(candidate));
  });
}

export function normalizeLoyaltyProgram(
  input: LoyaltyProgramNormalizationInput,
): LoyaltyProgramNormalizationResult {
  const program = findProgramByInput(input);

  if (!program) {
    return {
      provider: input.provider,
      rawProgramId: input.rawProgramId,
      rawProgramName: input.rawProgramName,
      isResolved: false,
    };
  }

  return {
    provider: input.provider,
    rawProgramId: input.rawProgramId,
    rawProgramName: input.rawProgramName,
    programId: program.id,
    displayName: program.displayName,
    isResolved: true,
  };
}

export function normalizeLoyaltyProgramId(
  input: LoyaltyProgramNormalizationInput,
): string | undefined {
  return normalizeLoyaltyProgram(input).programId;
}
