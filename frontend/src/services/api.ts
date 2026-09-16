import type {
  Farmer,
  AssessmentSubmission,
  AssessmentRecord,
  DashboardStats,
  ReportOCC01,
  ReportOCC02,
  FollowUpRecord
} from '../types'
import { localApi, isStaticDemoEnvironment, resetDemoData } from './mockService'

const API_BASE = '/api'

export { resetDemoData, isStaticDemoEnvironment }

export async function fetchFarmer(citizenId: string): Promise<Farmer | null> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchFarmer(citizenId)
  }

  try {
    const res = await fetch(`${API_BASE}/farmers/${citizenId}`)
    if (res.status === 404) return null
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
    }
    return res.json()
  } catch {
    // Graceful fallback to localApi if backend is unreachable
    return localApi.fetchFarmer(citizenId)
  }
}

export async function createAssessment(submission: AssessmentSubmission): Promise<AssessmentRecord> {
  if (isStaticDemoEnvironment()) {
    return localApi.createAssessment(submission)
  }

  try {
    const res = await fetch(`${API_BASE}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'ไม่สามารถบันทึกแบบประเมินได้')
    }
    return res.json()
  } catch {
    return localApi.createAssessment(submission)
  }
}

export async function fetchAssessments(search?: string, riskLevel?: string): Promise<AssessmentRecord[]> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchAssessments(search, riskLevel)
  }

  try {
    const params = new URLSearchParams()
    if (search) params.append('q', search)
    if (riskLevel && riskLevel !== 'ALL') params.append('risk_level', riskLevel)

    const res = await fetch(`${API_BASE}/assessments?${params.toString()}`)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดข้อมูลทะเบียนเกษตรกรได้')
    }
    return res.json()
  } catch {
    return localApi.fetchAssessments(search, riskLevel)
  }
}

export async function fetchAssessmentById(id: string): Promise<AssessmentRecord> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchAssessmentById(id)
  }

  try {
    const res = await fetch(`${API_BASE}/assessments/${id}`)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดข้อมูลแบบประเมินได้')
    }
    return res.json()
  } catch {
    return localApi.fetchAssessmentById(id)
  }
}

export async function updateAssessment(id: string, submission: AssessmentSubmission): Promise<AssessmentRecord> {
  if (isStaticDemoEnvironment()) {
    return localApi.updateAssessment(id, submission)
  }

  try {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'ไม่สามารถอัปเดตแบบประเมินได้')
    }
    return res.json()
  } catch {
    return localApi.updateAssessment(id, submission)
  }
}

export async function deleteAssessment(id: string): Promise<void> {
  if (isStaticDemoEnvironment()) {
    return localApi.deleteAssessment(id)
  }

  try {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'ไม่สามารถลบข้อมูลได้')
    }
  } catch {
    return localApi.deleteAssessment(id)
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchDashboardStats()
  }

  try {
    const res = await fetch(`${API_BASE}/stats/dashboard`)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดข้อมูลสถิติแดชบอร์ดได้')
    }
    return res.json()
  } catch {
    return localApi.fetchDashboardStats()
  }
}

export async function fetchReportOCC01(healthCenter?: string, fiscalYear?: string): Promise<ReportOCC01> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchReportOCC01(healthCenter, fiscalYear)
  }

  try {
    const params = new URLSearchParams()
    if (healthCenter) params.append('health_center', healthCenter)
    if (fiscalYear) params.append('fiscal_year', fiscalYear)

    const res = await fetch(`${API_BASE}/reports/occ01?${params.toString()}`)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดรายงาน OCC-นบ01 ได้')
    }
    return res.json()
  } catch {
    return localApi.fetchReportOCC01(healthCenter, fiscalYear)
  }
}

export async function fetchReportOCC02(province?: string, fiscalYear?: string): Promise<ReportOCC02> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchReportOCC02(province, fiscalYear)
  }

  try {
    const params = new URLSearchParams()
    if (province) params.append('province', province)
    if (fiscalYear) params.append('fiscal_year', fiscalYear)

    const res = await fetch(`${API_BASE}/reports/occ02?${params.toString()}`)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดรายงาน OCC-นบ02 ได้')
    }
    return res.json()
  } catch {
    return localApi.fetchReportOCC02(province, fiscalYear)
  }
}

export async function fetchFollowUps(citizenId?: string): Promise<FollowUpRecord[]> {
  if (isStaticDemoEnvironment()) {
    return localApi.fetchFollowUps(citizenId)
  }

  try {
    const url = citizenId ? `${API_BASE}/followups?citizen_id=${citizenId}` : `${API_BASE}/followups`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดข้อมูลการติดตามผลได้')
    }
    return res.json()
  } catch {
    return localApi.fetchFollowUps(citizenId)
  }
}

export async function createFollowUp(data: Omit<FollowUpRecord, 'id' | 'created_at'>): Promise<FollowUpRecord> {
  if (isStaticDemoEnvironment()) {
    return localApi.createFollowUp(data)
  }

  try {
    const res = await fetch(`${API_BASE}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      throw new Error('ไม่สามารถบันทึกการติดตามผลได้')
    }
    return res.json()
  } catch {
    return localApi.createFollowUp(data)
  }
}

export async function deleteFollowUp(id: string): Promise<void> {
  if (isStaticDemoEnvironment()) {
    return localApi.deleteFollowUp(id)
  }

  try {
    const res = await fetch(`${API_BASE}/followups/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      throw new Error('ไม่สามารถลบข้อมูลการติดตามผลได้')
    }
  } catch {
    return localApi.deleteFollowUp(id)
  }
}
