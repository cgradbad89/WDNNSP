import type { PointsAccount, PointsProgramType } from "@/types/points";

const programTypes: PointsProgramType[] = ["credit_card", "airline", "hotel"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isProgramType(value: unknown): value is PointsProgramType {
  return isString(value) && programTypes.includes(value as PointsProgramType);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isPointsAccount(value: unknown): value is PointsAccount {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.programId) &&
    isString(value.programName) &&
    isProgramType(value.programType) &&
    isNonNegativeFiniteNumber(value.balance) &&
    isString(value.lastUpdatedAt) &&
    (value.notes === undefined || isString(value.notes))
  );
}

export function isPointsAccountArray(
  value: unknown,
): value is PointsAccount[] {
  return Array.isArray(value) && value.every(isPointsAccount);
}
