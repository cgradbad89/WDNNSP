import type { PointsAccount } from "@/types/points";

export function getFlexibleCurrencyAccounts(
  accounts: PointsAccount[],
): PointsAccount[] {
  return accounts.filter((account) => account.programType === "credit_card");
}

export function getAirlineMileageAccounts(
  accounts: PointsAccount[],
): PointsAccount[] {
  return accounts.filter((account) => account.programType === "airline");
}

export function getTotalFlexiblePoints(accounts: PointsAccount[]): number {
  return getFlexibleCurrencyAccounts(accounts).reduce(
    (total, account) => total + account.balance,
    0,
  );
}

export function getTotalAirlineMiles(accounts: PointsAccount[]): number {
  return getAirlineMileageAccounts(accounts).reduce(
    (total, account) => total + account.balance,
    0,
  );
}
