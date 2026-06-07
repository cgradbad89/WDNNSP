import type { PointsAccount } from "@/types/points";
import type { TransferPartner } from "@/types/transferPartners";

function normalizeProgramName(programName: string): string {
  return programName.trim().toLowerCase();
}

export function getTransferPartnersForProgram(
  fromProgram: string,
  partners: TransferPartner[],
): TransferPartner[] {
  const normalizedFromProgram = normalizeProgramName(fromProgram);

  return partners.filter(
    (partner) =>
      partner.isActive &&
      (partner.fromProgramId === fromProgram ||
        normalizeProgramName(partner.fromProgram) === normalizedFromProgram),
  );
}

export function getTransferOptionsFromWallet(
  accounts: PointsAccount[],
  partners: TransferPartner[],
): TransferPartner[] {
  const flexibleProgramNames = new Set(
    accounts
      .filter((account) => account.programType === "credit_card")
      .map((account) => normalizeProgramName(account.programName)),
  );
  const flexibleProgramIds = new Set(
    accounts
      .filter((account) => account.programType === "credit_card")
      .map((account) => account.programId),
  );
  const seenOptions = new Set<string>();

  return partners.filter((partner) => {
    if (
      !partner.isActive ||
      (!flexibleProgramIds.has(partner.fromProgramId) &&
        !flexibleProgramNames.has(normalizeProgramName(partner.fromProgram)))
    ) {
      return false;
    }

    const optionKey = `${partner.fromProgramId}:${partner.toProgramId}`;

    if (seenOptions.has(optionKey)) {
      return false;
    }

    seenOptions.add(optionKey);
    return true;
  });
}
