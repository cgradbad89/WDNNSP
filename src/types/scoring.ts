export interface RecommendationScore {
  optionId: string;
  valueScore: number;
  pointsFitScore: number;
  convenienceScore: number;
  availabilityConfidenceScore: number;
  transferSimplicityScore: number;
  totalScore: number;
  explanation: string[];
  warnings: string[];
}
