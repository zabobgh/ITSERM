import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import cases from '../../qa/risk-cases.json'
import { localApi, resetDemoData, calculateRisk, symptomsCatalog } from '../src/services/mockService'
import * as api from '../src/services/api'
import Wizard from '../src/components/wizard/WizardTab.vue'
import Registry from '../src/components/registry/RegistryTab.vue'
import EditModal from '../src/components/common/EditFarmerModal.vue'
import ResultModal from '../src/components/common/AssessmentResultModal.vue'
import DetailModal from '../src/components/common/DetailModal.vue'
import FollowUpModal from '../src/components/common/AddFollowUpModal.vue'
import Dashboard from '../src/components/dashboard/DashboardTab.vue'
import { modalFocus } from '../src/directives/modalFocus'

vi.mock('chart.js', () => ({ Chart: Object.assign(class { destroy() {} }, { register() {} }), registerables: [] }))
vi.mock('../src/services/api', async () => {
  const { localApi } = await import('../src/services/mockService')
  return {
    fetchFarmer: vi.fn(async () => null),
    createAssessment: vi.fn((s) => localApi.createAssessment(s)),
    fetchAssessments: vi.fn(() => localApi.fetchAssessments()),
    fetchAssessmentById: vi.fn((id) => localApi.fetchAssessmentById(id)),
    updateAssessment: vi.fn((id, s) => localApi.updateAssessment(id, s)),
    fetchFollowUps: vi.fn((id) => localApi.fetchFollowUps(id)),
    createFollowUp: vi.fn((s) => localApi.createFollowUp(s)),
    deleteAssessment: vi.fn((id) => localApi.deleteAssessment(id)),
    fetchDashboardStats: vi.fn(() => localApi.fetchDashboardStats())
  }
})

const wrappers: VueWrapper[] = []
function render(component: any, props = {}) {
  const w = mount(component, { props, attachTo: document.body,
    global: { directives: { 'modal-focus': modalFocus } } })
  wrappers.push(w)
  return w
}
// Access setup state only in component tests; browser tests use actual controls.
const state = (w: VueWrapper): any => (w.vm as any).$.setupState
const submission = (tc = cases[0], citizen_id = '0000000000001') => ({
  citizen_id, fullname: 'QA Synthetic', gender: 'ชาย', age: 45, address: 'QA address',
  occupation: '1. เพาะปลูก (ทำเอง)', plant_type: 'ทำนา (ข้าว)', eval_date: '2026-09-16',
  interviewer_name: 'QA Staff', health_center: 'รพ.สต.หลักสาม',
  answers_a: { ...tc.answers_a }, answers_b: { ...tc.answers_b },
  symptoms: [...tc.symptoms], cholinesterase_result: '', chemical_names: []
})
beforeEach(() => {
  localStorage.clear()
  resetDemoData()
  vi.clearAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })

describe('Risk matrix: repository contract, not medical certification', () => {
  for (const tc of cases) {
    it(tc.id + ' across wizard, edit, demo persistence and result', async () => {
      const saved = await localApi.createAssessment(submission(tc))
      expect(saved.total_score).toBe(tc.total_score)
      expect(saved.risk_level).toBe(tc.risk_level)
      expect(saved.require_blood_test).toBe(tc.require_blood_test)
      expect(await localApi.fetchAssessmentById(saved.id)).toEqual(saved)
      const w = render(Wizard), v = state(w)
      Object.assign(v.form, submission(tc))
      v.hasSymptomsChoice = tc.symptoms.length ? 'yes' : 'no'
      expect(v.totalBehaviorScore).toBe(tc.total_score)
      expect(v.riskEvaluation.riskLevel).toBe(tc.risk_level)
      const e = render(EditModal, { record: null, isOpen: true })
      await e.setProps({ record: saved })
      expect(state(e).liveScores.totalScore).toBe(tc.total_score)
      expect(state(e).liveScores.riskLevel).toBe(tc.risk_level)
      const result = render(ResultModal, { record: saved, isOpen: true })
      expect(result.text()).toContain(tc.risk_level)
      expect(result.text()).toContain('คะแนนพฤติกรรม: ' + tc.total_score + ' / 45')
      expect(result.text()).not.toContain('มีนัยสำคัญทางคลินิก')
    })
  }
  for (const [index, group] of Object.values(symptomsCatalog).entries()) {
    for (const symptom of group) {
      it('symptom ' + symptom, () => expect(calculateRisk(9, 6, [symptom]).highest).toBe(index + 1))
    }
  }
  it('highest symptom wins regardless of order', () => {
    expect(calculateRisk(9,6,['มือสั่น','ไอ','อ่อนเพลีย']).highest).toBe(3)
  })
  it('Part A direct and Part B reverse buttons represent every score', async () => {
    const w = render(Wizard), v = state(w)
    v.currentStep = 2
    v.forceShowAllChemicalQuestions = true
    await nextTick()
    for (let q = 9; q <= 23; q++) {
      for (const [label, score] of (q <= 17 ? [['ไม่ใช่ (1)',1],['บางครั้ง (2)',2],['ทุกครั้ง (3)',3]] : [['ไม่ใช่ (3)',3],['บางครั้ง (2)',2],['ทุกครั้ง (1)',1]])) {
        const button = w.findAll('button').find(b => b.attributes('aria-label')?.startsWith(q + '.') && b.attributes('aria-label')?.endsWith(String(label)))!
        await button.trigger('click')
        expect((q<=17?v.form.answers_a:v.form.answers_b)['q'+q]).toBe(score)
      }
    }
  })
})

describe('Draft, preset and conditional regressions', () => {
  it('requires explicit behavior, symptom and blood-test decisions before saving', async () => {
    const w = render(Wizard), v = state(w)
    expect(v.validateStep2()).toBe(false)
    expect(v.fieldErrors.answers).toContain('ตอบคำถาม')
    expect(v.validateStep3()).toBe(false)
    v.hasSymptomsChoice = 'yes'
    expect(v.validateStep3()).toBe(false)
    v.form.symptoms = ['ไอ']
    expect(v.validateStep3()).toBe(true)
    expect(v.validateStep5()).toBe(false)
    expect(w.findAll('input[name="cholinesterase-result"]').length).toBeGreaterThanOrEqual(5)
    expect(w.text()).not.toContain('แนวทางปฏิบัติสำหรับผล "ปกติ / ปลอดภัย"')
  })
  it('reload recovers all fields, UI state and cached chemical answers', async () => {
    vi.useFakeTimers()
    const w = render(Wizard), v = state(w)
    Object.assign(v.form, submission(cases[23]))
    v.form.fullname = 'QA draft ทุกช่อง'
    v.form.gender = 'หญิง'; v.form.age = 61
    v.form.chemical_names = ['QA chemical']
    v.form.cholinesterase_result = 'มีความเสี่ยง'
    v.hasSymptomsChoice = 'yes'; v.currentStep = 5
    v.chemicalInputText = 'unfinished chemical'
    v.presetNeedsReview = true
    v.form.answers_a.q9 = 1; v.form.answers_a.q10 = 1
    const expected = JSON.parse(JSON.stringify(v.form))
    await vi.advanceTimersByTimeAsync(650)
    w.unmount(); wrappers.splice(wrappers.indexOf(w),1)
    const recovered = state(render(Wizard))
    expect(JSON.parse(JSON.stringify(recovered.form))).toEqual(expected)
    expect(recovered.hasSymptomsChoice).toBe('yes')
    expect(recovered.highestSymptomGroup).toBe(3)
    expect(recovered.chemicalInputText).toBe('unfinished chemical')
    expect(recovered.currentStep).toBe(5)
    expect(recovered.presetNeedsReview).toBe(true)
    recovered.form.answers_a.q9 = 3
    expect(recovered.form.answers_a.q11).toBe(3)
  })
  it('confirmed reset cancels pending save and clears all answers after reload', async () => {
    vi.useFakeTimers(); vi.stubGlobal('confirm', vi.fn(() => true))
    const w = render(Wizard), v = state(w)
    Object.assign(v.form, submission(cases[23]))
    v.discardDraft()
    await vi.advanceTimersByTimeAsync(700)
    expect(localStorage.getItem('nbk_wizard_draft_v2')).toBeNull()
    expect(Object.values(v.form.answers_a)).toEqual(Array(9).fill(0))
    expect(Object.values(v.form.answers_b)).toEqual(Array(6).fill(0))
    const recovered = state(render(Wizard))
    expect(recovered.form.citizen_id).toBe('')
    expect(recovered.form.symptoms).toEqual([])
  })
  it('changing farmer identity clears A answers and ignores a late lookup response', async () => {
    const w = render(Wizard), v = state(w)
    let resolveA: any
    vi.mocked(api.fetchFarmer).mockImplementationOnce(() => new Promise(resolve => { resolveA=resolve }))
    Object.assign(v.form, submission(cases[23]))
    v.form.fullname = 'A'
    v.formattedCitizenId = '0000000000002'
    resolveA({ citizen_id: '0000000000001', fullname:'LATE A', gender:'ชาย',age:90,address:'A' })
    await flushPromises()
    expect(v.form.citizen_id).toBe('0000000000002')
    expect(v.form.fullname).toBe('')
    expect(v.form.symptoms).toEqual([])
    expect(v.form.answers_b.q23).toBe(0)
  })
  it('conditional cache restores Yes; No submits only normalized values', async () => {
    const w=render(Wizard), v=state(w)
    Object.assign(v.form, submission())
    v.form.answers_a.q9=3
    for(const q of ['q11','q12','q13','q14']) v.form.answers_a[q]=3
    v.form.answers_a.q9=1
    expect(v.visibleQuestionsA.map((q:any)=>q.id)).not.toContain('q11')
    v.form.answers_a.q9=3
    expect(v.form.answers_a.q14).toBe(3)
    v.form.answers_a.q9=1
    v.currentStep=5
    v.hasSymptomsChoice='no'
    v.form.cholinesterase_result='ไม่เข้าเกณฑ์ตรวจเลือด'
    await v.submitForm()
    const payload=vi.mocked(api.createAssessment).mock.calls[0][0]
    for(const q of ['q11','q12','q13','q14']) expect(payload.answers_a[q]).toBe(1)
    expect(payload.cholinesterase_result).toBe('ไม่เข้าเกณฑ์ตรวจเลือด')
    expect(localStorage.getItem('nbk_wizard_draft_v2')).toBeNull()
  })
  it('preset confirmation fills defaults only; remains editable and unconfirmed after reload', async () => {
    const w=render(Wizard),v=state(w)
    Object.assign(v.form,submission(cases[23]))
    const before=(await localApi.fetchAssessments()).length
    v.isPredefinedModalOpen=true
    await nextTick()
    expect(w.text()).toContain('ระบบจะกรอกคำตอบเริ่มต้น')
    expect(v.form.answers_a.q9).toBe(3)
    v.confirmApplyPredefinedPreset()
    expect(v.form.answers_a.q9).toBe(1)
    expect(v.form.answers_b.q18).toBe(1)
    expect(v.presetNeedsReview).toBe(true)
    expect(api.createAssessment).not.toHaveBeenCalled()
    expect((await localApi.fetchAssessments()).length).toBe(before)
    v.form.answers_a.q9=3
    expect(v.form.answers_a.q11).toBe(1) // old cached answers must not undo the preset
    v.form.answers_b.q18=2
    expect(v.form.answers_b.q18).toBe(2)
  })
})

describe('Dashboard, registry intersection and follow-up integrity', () => {
  it('incomplete or out-of-range score maps cannot create a demo record', async () => {
    const before = (await localApi.fetchAssessments()).length
    for (const change of [{answers_a:{}}, {answers_b:{q18:0}}, {answers_a:{...submission().answers_a,q9:4}}]) {
      expect(() => localApi.createAssessment({...submission(),...change})).toThrow()
    }
    expect((await localApi.fetchAssessments()).length).toBe(before)
  })
  it('editing an old record without source answers cannot overwrite its scores with defaults', async () => {
    const [saved] = await localApi.fetchAssessments()
    const w = render(EditModal,{record:null,isOpen:true})
    await w.setProps({record:{...saved,answers_a:undefined,answers_b:undefined}})
    await state(w).handleSave()
    expect(api.updateAssessment).not.toHaveBeenCalled()
    expect(state(w).errorMessage).toContain('ไม่พบคำตอบเดิม')
  })
  it('every scored question can appear in result factors without clinical overstatement', async () => {
    for (let q=9;q<=23;q++) {
      const sub=submission()
      ;(q<=17?sub.answers_a:sub.answers_b)['q'+q]=2
      const saved=await localApi.createAssessment(sub)
      const result=render(ResultModal,{record:saved,isOpen:true})
      expect(state(result).detectedRiskFactors.length).toBeGreaterThan(0)
      expect(state(result).riskInfo.label).toBe(saved.risk_level)
      expect(state(result).riskInfo.advice.length).toBeGreaterThan(0)
    }
  })
  it('all requested filter intersections, empty state, reset and stale filter navigation', async () => {
    const w=render(Registry,{active:true}); await flushPromises()
    const v=state(w), rows=await localApi.fetchAssessments()
    const target=rows[0]
    const combos=[
      {risk:true},{blood:true},{provider:true},{search:true},{risk:true,blood:true},
      {risk:true,provider:true},{blood:true,provider:true},{search:true,risk:true},
      {search:true,blood:true,provider:true}
    ]
    for(const c of combos) {
      v.clearAllFilters()
      if(c.risk)v.riskFilter=target.risk_level
      if(c.blood)v.bloodFilter='UNSAFE'
      if(c.provider)v.healthCenterFilter=target.health_center
      if(c.search)v.searchQuery=target.fullname
      const expected=rows.filter(r=>(!c.risk||r.risk_level===target.risk_level)&&(!c.blood||['มีความเสี่ยง','ไม่ปลอดภัย'].includes(r.cholinesterase_result))&&(!c.provider||r.health_center===target.health_center)&&(!c.search||r.fullname.includes(target.fullname)))
      expect(v.filteredRecords.map((r:any)=>r.id)).toEqual(expected.map(r=>r.id))
    }
    v.searchQuery='NO SUCH QA PERSON';await nextTick()
    expect(v.filteredRecords).toHaveLength(0)
    expect(w.text()).toContain('ไม่พบ')
    v.clearAllFilters();expect(v.filteredRecords).toHaveLength(rows.length)
    v.searchQuery='STALE';v.healthCenterFilter='STALE';v.bloodFilter='UNSAFE'
    v.applyExternalFilter({riskLevel:'HIGH_RISK'})
    const stats=await localApi.fetchDashboardStats()
    expect(v.filteredRecords).toHaveLength(stats.high_risk_farmers)
    v.applyExternalFilter({bloodResult:'TESTED'});expect(v.filteredRecords).toHaveLength(stats.tested_blood)
    v.applyExternalFilter({bloodResult:'UNSAFE'});expect(v.filteredRecords).toHaveLength(stats.unsafe_blood)
    v.applyExternalFilter({riskLevel:'ALL'});expect(v.filteredRecords).toHaveLength(stats.total_farmers)
    v.applyExternalFilter({followUpOnly:true})
    const d=render(Dashboard,{active:true});await flushPromises()
    expect(v.filteredRecords).toHaveLength(state(d).followUpCount)
  })
  it('missing or pending blood is not counted as tested', async () => {
    const initial=await localApi.fetchDashboardStats()
    await localApi.createAssessment(submission())
    await localApi.createAssessment({...submission(),cholinesterase_result:'รอรับการตรวจ'})
    const after=await localApi.fetchDashboardStats()
    expect(after.tested_blood).toBe(initial.tested_blood)
    const w=render(Registry,{active:true});await flushPromises()
    state(w).applyExternalFilter({bloodResult:'UNTESTED'})
    expect(state(w).filteredRecords).toHaveLength(2)
  })
  it('follow-up fields persist, stay with farmer A, sort by date and created_at', async () => {
    const [a,b]=await localApi.fetchAssessments()
    const input={citizen_id:a.citizen_id,assessment_id:a.id,follow_up_date:'2026-10-01',responsible_person:'QA Staff',follow_up_type:'ติดตามการสวมใส่อุปกรณ์ PPE',result:'ยังมีความเสี่ยง/รอผลตรวจ',notes:'QA recommendation'}
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-16T01:00:00Z'))
    const first=await localApi.createFollowUp(input as any)
    vi.setSystemTime(new Date('2026-09-16T02:00:00Z'))
    const second=await localApi.createFollowUp({...input,notes:'later'} as any)
    const older=await localApi.createFollowUp({...input,follow_up_date:'2026-09-01'} as any)
    vi.useRealTimers()
    expect(first).toMatchObject(input)
    expect(first.created_at).toBe('2026-09-16T01:00:00.000Z')
    const list=await localApi.fetchFollowUps(a.citizen_id)
    expect(list.slice(0,2).map(f=>f.id)).toEqual([second.id,first.id])
    expect(list.at(-1)?.id).toBe(older.id)
    expect((await localApi.fetchFollowUps(b.citizen_id)).some(f=>f.id===first.id)).toBe(false)
    await expect(localApi.createFollowUp({...input,citizen_id:b.citizen_id} as any)).rejects.toThrow()
    const w=render(DetailModal,{isOpen:false,record:null})
    await w.setProps({record:a,isOpen:true});await flushPromises()
    expect(state(w).followUps[0].id).toBe(second.id)
    await w.setProps({record:b});await flushPromises()
    expect(state(w).followUps.every((f:any)=>f.citizen_id===b.citizen_id)).toBe(true)
  })
  it('follow-up form sends the selected assessment and recommendation notes', async () => {
    const [a]=await localApi.fetchAssessments()
    const w=render(FollowUpModal,{record:null,isOpen:true})
    await w.setProps({record:a})
    const v=state(w);v.form.notes='QA recommendation';await v.handleSubmit()
    expect(api.createFollowUp).toHaveBeenCalledWith(expect.objectContaining({citizen_id:a.citizen_id,assessment_id:a.id,notes:'QA recommendation'}))
  })
})
