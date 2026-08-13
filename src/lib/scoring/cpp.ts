export function calculateCentsPerPoint(
  cashPriceUsd: number,
  taxesAndFeesUsd: number | undefined,
  pointsRequired: number,
): number | undefined {
  // Unreported fees are unknown, not zero. Computing cpp as if fees were $0
  // would inflate the redemption's apparent value (subtracting less from
  // cashPriceUsd) - the exact fabricated-best-case bug this guards against.
  // Callers must treat an undefined result as unknown/worst-case, not skip
  // straight to a default number.
  if (taxesAndFeesUsd === undefined) {
    return undefined;
  }

  if (
    !Number.isFinite(cashPriceUsd) ||
    !Number.isFinite(taxesAndFeesUsd) ||
    !Number.isFinite(pointsRequired) ||
    pointsRequired <= 0
  ) {
    return 0;
  }

  const netCashValue = cashPriceUsd - taxesAndFeesUsd;

  if (netCashValue <= 0) {
    return 0;
  }

  return Math.round((netCashValue / pointsRequired) * 1000) / 10;
}
