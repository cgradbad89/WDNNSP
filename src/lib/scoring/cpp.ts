export function calculateCentsPerPoint(
  cashPriceUsd: number,
  taxesAndFeesUsd: number,
  pointsRequired: number,
): number {
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
