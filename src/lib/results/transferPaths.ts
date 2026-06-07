import type { PointsAccount } from "@/types/points";
import type { TransferPartner } from "@/types/transferPartners";

export interface TransferPathDisplay {
  fromProgram: string;
  toProgram: string;
  availableBalance: number;
  pointsNeeded: number;
  transferRatio: number;
  isSufficient: boolean;
}

function normalizeProgram(program: string): string {
  return program.trim().toLowerCase();
}

function addBalance(
  balances: Map<string, number>,
  key: string,
  balance: number,
): void {
  balances.set(key, (balances.get(key) ?? 0) + balance);
}

function getBalance(
  balances: Map<string, number>,
  programId: string,
  programName: string,
): number {
  return (
    balances.get(programId) ?? balances.get(normalizeProgram(programName)) ?? 0
  );
}

function matchesDestinationProgram(
  partner: TransferPartner,
  airlineProgram: string,
): boolean {
  return (
    partner.toProgramId === airlineProgram ||
    normalizeProgram(partner.toProgram) === normalizeProgram(airlineProgram)
  );
}

export function getTransferPathDisplays(
  airlineProgram: string,
  pointsNeeded: number,
  accounts: PointsAccount[],
  transferPartners: TransferPartner[],
): TransferPathDisplay[] {
  const flexibleBalances = new Map<string, number>();

  for (const account of accounts) {
    if (account.programType !== "credit_card") {
      continue;
    }

    addBalance(flexibleBalances, account.programId, account.balance);
    addBalance(
      flexibleBalances,
      normalizeProgram(account.programName),
      account.balance,
    );
  }

  return transferPartners
    .filter(
      (partner) =>
        partner.isActive && matchesDestinationProgram(partner, airlineProgram),
    )
    .flatMap((partner) => {
      const availableBalance =
        getBalance(
          flexibleBalances,
          partner.fromProgramId,
          partner.fromProgram,
        );

      if (availableBalance <= 0) {
        return [];
      }

      return [
        {
          fromProgram: partner.fromProgram,
          toProgram: partner.toProgram,
          availableBalance,
          pointsNeeded,
          transferRatio: partner.transferRatio,
          isSufficient: availableBalance * partner.transferRatio >= pointsNeeded,
        },
      ];
    })
    .toSorted((firstPath, secondPath) => {
      if (firstPath.isSufficient !== secondPath.isSufficient) {
        return firstPath.isSufficient ? -1 : 1;
      }

      return secondPath.availableBalance - firstPath.availableBalance;
    });
}
