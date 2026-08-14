import type { ProviderMessage } from "@/lib/providers/types";

export interface ProviderValidationSummary {
  skippedRows: number;
  internalReasons: string[];
}

export interface ProviderValidationWarningInput {
  code: string;
  providerLabel: string;
  skippedRows: number;
  internalReasons: string[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getTrimmedString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

export function getBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function getFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function getPositiveNumber(value: unknown): number | undefined {
  const valueAsNumber =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : NaN;

  return Number.isFinite(valueAsNumber) && valueAsNumber > 0
    ? valueAsNumber
    : undefined;
}

export function isUsableDateString(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

export function addValidationReason(
  summary: ProviderValidationSummary,
  rowPath: string,
  reason: string,
): void {
  summary.skippedRows += 1;
  summary.internalReasons.push(`${rowPath}:${reason}`);
}

export function createValidationWarningMessage({
  code,
  providerLabel,
  skippedRows,
  internalReasons,
}: ProviderValidationWarningInput): ProviderMessage | undefined {
  if (skippedRows === 0) {
    return undefined;
  }

  return {
    code,
    severity: "warning",
    message: `${providerLabel} skipped ${skippedRows} malformed provider ${
      skippedRows === 1 ? "row" : "rows"
    }. Incomplete provider rows are not used for recommendations.`,
    internalReasons,
  };
}
