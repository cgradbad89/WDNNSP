export type EstimatedTransferTime =
  | "instant"
  | "same_day"
  | "one_to_two_days"
  | "three_plus_days"
  | "unknown";

export interface TransferPartner {
  id: string;
  fromProgramId: string;
  toProgramId: string;
  fromProgram: string;
  toProgram: string;
  transferRatio: number;
  estimatedTransferTime: EstimatedTransferTime;
  isActive: boolean;
  notes?: string;
}
