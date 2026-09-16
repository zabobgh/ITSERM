import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Occ01ReportView from '../src/components/reports/Occ01ReportView.vue'
import Occ02ReportView from '../src/components/reports/Occ02ReportView.vue'
import type { OCC01DetailedStats, CenterBreakdownItem, AssessmentRecord, ReportOCC02 } from '../src/types'

// Mock html2pdf.js bundle
vi.mock('html2pdf.js', () => {
  return {
    default: () => ({
      set: () => ({
        from: () => ({
          save: vi.fn().mockResolvedValue(undefined)
        })
      })
    })
  }
})

describe('Blood Screening Percentage Formula Specification', () => {
  // Confirmed Business Rule:
  // (tested blood / high-risk farmers requiring blood screening) * 100
  const calcBloodCoverage = (tested: number, requiredBlood: number): { pct: number; label: string } => {
    if (requiredBlood <= 0) {
      return { pct: 0, label: 'ไม่มีผู้เข้าเกณฑ์' }
    }
    const pct = Number(((tested / requiredBlood) * 100).toFixed(1))
    return { pct, label: `${pct}%` }
  }

  it('calculates 75% when requiredBlood = 20 and tested = 15', () => {
    const res = calcBloodCoverage(15, 20)
    expect(res.pct).toBe(75)
    expect(res.label).toBe('75%')
  })

  it('calculates 100% when requiredBlood = 20 and tested = 20', () => {
    const res = calcBloodCoverage(20, 20)
    expect(res.pct).toBe(100)
    expect(res.label).toBe('100%')
  })

  it('calculates 0% when requiredBlood = 20 and tested = 0', () => {
    const res = calcBloodCoverage(0, 20)
    expect(res.pct).toBe(0)
    expect(res.label).toBe('0%')
  })

  it('prevents division by zero when requiredBlood = 0', () => {
    const res = calcBloodCoverage(0, 0)
    expect(res.pct).toBe(0)
    expect(res.label).toBe('ไม่มีผู้เข้าเกณฑ์')
    expect(Number.isFinite(res.pct)).toBe(true)
    expect(Number.isNaN(res.pct)).toBe(false)
  })
})

describe('OCC-นบ 01 Report Component Tests', () => {
  const mockStats: OCC01DetailedStats = {
    total: 50,
    lowRisk: 10,
    lowRiskPct: '20.0%',
    medRisk: 20,
    medRiskPct: '40.0%',
    highRisk: 12,
    highRiskPct: '24.0%',
    veryHighRisk: 8,
    veryHighRiskPct: '16.0%',
    totalHighGroup: 20, // Denominator
    totalHighGroupPct: '40.0%',
    bloodTested: 15, // Numerator
    bloodTestedPct: '75.0%', // 15 / 20 * 100
    normal: 5,
    normalPct: '33.3%',
    safe: 5,
    safePct: '33.3%',
    atRisk: 3,
    atRiskPct: '20.0%',
    unsafe: 2,
    unsafePct: '13.3%',
    abnormalBlood: 5,
    abnormalBloodPct: '33.3%',
    referred: 2,
    retestNeeded: 3,
    advised: 50
  }

  const defaultProps = {
    stats: mockStats,
    healthCenter: 'รพ.สต.หลักสาม',
    provinceName: 'สมุทรสาคร',
    fiscalYear: '2569',
    reportingPeriod: '12month' as const
  }

  it('does NOT contain forbidden header and agency text', () => {
    const wrapper = mount(Occ01ReportView, { props: defaultProps })
    const html = wrapper.html()
    expect(html).not.toContain('แบบฟอร์มกระทรวงสาธารณสุข')
    expect(html).not.toContain('กองโรคจากการประกอบอาชีพฯ')
    expect(html).not.toContain('กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม')
  })

  it('renders blood screening results and percentage derived from real denominator', () => {
    const wrapper = mount(Occ01ReportView, { props: defaultProps })
    const text = wrapper.text()
    // Should display tested count 15 and percentage 75.0%
    expect(text).toContain('15')
    expect(text).toContain('75.0%')
    expect(text).toContain('จากกลุ่มเสี่ยงสูงที่ต้องส่งเจาะเลือด 20 คน')
  })

  it('renders dual signatures for รพ.บ้านแพ้ว according to requirement', () => {
    const wrapper = mount(Occ01ReportView, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('ผู้รวบรวมรายงาน')
    expect(text).toContain('(ผู้รับผิดชอบงานอาชีวเวชกรรมและอนามัยสิ่งแวดล้อม รพ.บ้านแพ้ว)')
    expect(text).toContain('ผู้รับรอง')
    expect(text).toContain('(หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว)')
  })

  it('does NOT render any logo or fallback emblem when reportLogo is not provided', () => {
    const wrapper = mount(Occ01ReportView, { props: { ...defaultProps, reportLogo: '' } })
    const img = wrapper.find('img[alt="โลโก้รายงาน"]')
    expect(img.exists()).toBe(false)
    const headerEmblemSvg = wrapper.find('svg[viewBox="0 0 100 100"]')
    expect(headerEmblemSvg.exists()).toBe(false)
  })

  it('renders attached custom logo with proper aspect ratio styling', () => {
    const dummyLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const wrapper = mount(Occ01ReportView, { props: { ...defaultProps, reportLogo: dummyLogo } })
    const img = wrapper.find('img[alt="โลโก้รายงาน"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(dummyLogo)
    expect(img.classes()).toContain('object-contain')
  })
})

describe('OCC-นบ 02 Report Component Tests', () => {
  const mockBreakdowns: CenterBreakdownItem[] = [
    {
      center: 'รพ.สต.หลักสาม',
      evaluated: 30,
      highRisk: 20, // requiring blood
      bloodTested: 15,
      unsafe: 2,
      coverage: 75.0 // (15 / 20) * 100
    },
    {
      center: 'รพ.สต.หลักสอง',
      evaluated: 10,
      highRisk: 0, // no one required
      bloodTested: 0,
      unsafe: 0,
      coverage: 0 // 0 / 0 handled as 0%
    }
  ]

  const mockOcc02: ReportOCC02 = {
    province: 'สมุทรสาคร',
    fiscal_year: '2569',
    total_high_risk_cumulative: 20,
    total_screened_target: 20,
    blood_testing_coverage: 75.0
  }

  const mockRecords: AssessmentRecord[] = [
    {
      id: 'rec-1',
      citizen_id: '1111111111111',
      fullname: 'นาย ทดสอบ',
      gender: 'ชาย',
      age: 50,
      address: 'บ้านแพ้ว',
      occupation: 'ทำสวน',
      plant_type: 'มะพร้าว',
      eval_date: '2026-09-16',
      interviewer_name: 'เจ้าหน้าที่',
      health_center: 'รพ.สต.หลักสาม',
      score_a: 10,
      score_b: 15,
      total_score: 25,
      highest_symptom_group: 'ระบบประสาท',
      symptoms: [],
      risk_level: 'มีความเสี่ยงค่อนข้างสูง',
      require_blood_test: true,
      cholinesterase_result: 'ปกติ',
      chemical_names: []
    }
  ]

  const defaultProps = {
    records: mockRecords,
    centerBreakdowns: mockBreakdowns,
    occ02: mockOcc02,
    provinceName: 'สมุทรสาคร',
    fiscalYear: '2569'
  }

  it('does NOT contain forbidden header and agency text', () => {
    const wrapper = mount(Occ02ReportView, { props: defaultProps })
    const html = wrapper.html()
    expect(html).not.toContain('แบบฟอร์มกระทรวงสาธารณสุข')
    expect(html).not.toContain('กองโรคจากการประกอบอาชีพฯ')
    expect(html).not.toContain('กรมควบคุมโรค กระทรวงสาธารณสุข')
  })

  it('displays correct coverage percentage for centers and handles zero high-risk', () => {
    const wrapper = mount(Occ02ReportView, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('75.0%')
    expect(text).toContain('ไม่มีผู้เข้าเกณฑ์')
  })

  it('renders dual signatures for รพ.บ้านแพ้ว in OCC-นบ 02', () => {
    const wrapper = mount(Occ02ReportView, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('ผู้รวบรวมรายงาน')
    expect(text).toContain('(ผู้รับผิดชอบงานอาชีวเวชกรรมและอนามัยสิ่งแวดล้อม รพ.บ้านแพ้ว)')
    expect(text).toContain('ผู้รับรอง')
    expect(text).toContain('(หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว)')
  })

  it('renders logo in OCC-02 when provided and renders NO logo or emblem when absent', () => {
    const dummyLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const withLogoWrapper = mount(Occ02ReportView, { props: { ...defaultProps, reportLogo: dummyLogo } })
    expect(withLogoWrapper.find('img[alt="โลโก้รายงาน"]').exists()).toBe(true)

    const noLogoWrapper = mount(Occ02ReportView, { props: { ...defaultProps, reportLogo: '' } })
    expect(noLogoWrapper.find('img[alt="โลโก้รายงาน"]').exists()).toBe(false)
    const headerEmblemSvg = noLogoWrapper.find('svg[viewBox="0 0 100 100"]')
    expect(headerEmblemSvg.exists()).toBe(false)
  })
})
