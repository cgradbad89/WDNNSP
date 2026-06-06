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

    const normalizedProgram = normalizeProgram(account.programName);
    flexibleBalances.set(
      normalizedProgram,
      (flexibleBalances.get(normalizedProgram) ?? 0) + account.balance,
    );
  }

  return transferPartners
    .filter(
      (partner) =>
        partner.isActive &&
        normalizeProgram(partner.toProgram) === normalizeProgram(airlineProgram),
    )
    .flatMap((partner) => {
      const availableBalance =
        flexibleBalances.get(normalizeProgram(partner.fromProgram)) ?? 0;

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
