export interface ReportOCC01 {
  health_center: string;
  fiscal_year: string;
  total_evaluated: number;
  high_risk_evaluated: number;
  total_blood_tested: number;
  unsafe_blood_count: number;
  total_advised: number;
}

export interface ReportOCC02 {
  province: string;
  fiscal_year: string;
  total_high_risk_cumulative: number;
  total_screened_target: number;
  blood_testing_coverage: number;
}

export interface OCC01DetailedStats {
  total: number;
  lowRisk: number;
  lowRiskPct: string;
  medRisk: number;
  medRiskPct: string;
  highRisk: number;
  highRiskPct: string;
  veryHighRisk: number;
  veryHighRiskPct: string;
  totalHighGroup: number;
  totalHighGroupPct: string;

  bloodTested: number;
  bloodTestedPct: string;
  normal: number;
  normalPct: string;
  safe: number;
  safePct: string;
  atRisk: number;
  atRiskPct: string;
  unsafe: number;
  unsafePct: string;
  abnormalBlood: number;
  abnormalBloodPct: string;

  referred: number;
  retestNeeded: number;
  advised: number;

  // Official OCC Extended Indicators
  totalWorkforce?: number;
  otherWorkforce?: number;
  organicExisting?: number;
  organicNew?: number;
  poisonSymptomCount?: number;
  hospitalDiagnosed?: number;
  ergoEvaluated?: number;
  ergoSymptoms?: number;
  ergoRiskEnv?: number;
  ergoWorkRelated?: number;
  ergoDiagnosed?: number;
  outbreakInvestigation?: number;
  dmScreened?: number;
  dmAtRisk?: number;
  dmCases?: number;
  dmNewCases?: number;
  htScreened?: number;
  htAtRisk?: number;
  htCases?: number;
  htNewCases?: number;
  networksCount?: number;
  trainingNetworksCount?: number;
  trainedVhvCount?: number;
  communicationCount?: number;
  otherErgoEvaluated?: number;
  otherErgoSymptoms?: number;
  otherErgoRiskEnv?: number;
  otherErgoWorkRelated?: number;
  otherAdvised?: number;
}

export interface CenterBreakdownItem {
  center: string;
  evaluated: number;
  highRisk: number;
  bloodTested: number;
  unsafe: number;
  coverage: number;
}
