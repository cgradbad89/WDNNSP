export type PointsProgramType = "credit_card" | "airline" | "hotel";

export interface PointsProgram {
  id: string;
  name: string;
  type: PointsProgramType;
  currencyName: string;
}

export interface PointsAccount {
  id: string;
  userId: string;
  programId: string;
  programName: string;
  programType: PointsProgramType;
  balance: number;
  lastUpdatedAt: string;
  notes?: string;
}
