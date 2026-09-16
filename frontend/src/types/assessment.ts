export interface AssessmentSubmission {
  citizen_id: string;
  fullname: string;
  gender: string;
  age: number;
  address: string;
  occupation: string;
  plant_type: string;
  eval_date: string;
  interviewer_name: string;
  health_center: string;
  answers_a: Record<string, number>; // q9 - q17
  answers_b: Record<string, number>; // q18 - q23
  symptoms: string[];
  cholinesterase_result: string;
  chemical_names: string[];
}

export interface AssessmentRecord {
  id: string;
  citizen_id: string;
  fullname: string;
  gender: string;
  age: number;
  address: string;
  occupation: string;
  plant_type: string;
  eval_date: string;
  interviewer_name: string;
  health_center: string;
  score_a: number;
  score_b: number;
  total_score: number;
  highest_symptom_group: number;
  symptoms: string[];
  risk_level: string;
  require_blood_test: boolean;
  cholinesterase_result: string;
  chemical_names: string[];
  answers_a?: Record<string, number>;
  answers_b?: Record<string, number>;
  created_at: string;
}

export interface Question {
  id: string;
  text: string;
}
