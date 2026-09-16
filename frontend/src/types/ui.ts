import type { AssessmentRecord } from './assessment';

export interface DashboardStats {
  total_farmers: number;
  high_risk_farmers: number;
  tested_blood: number;
  unsafe_blood: number;
  risk_distribution: Record<string, number>;
  blood_distribution: Record<string, number>;
  recent_priority_cases: AssessmentRecord[];
}

export interface ToastInfo {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type TabType = 'dashboard' | 'wizard' | 'registry' | 'occ';
