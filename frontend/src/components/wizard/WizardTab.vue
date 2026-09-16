<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import type { AssessmentSubmission, AssessmentRecord } from '../../types'
import { fetchFarmer, createAssessment } from '../../services/api'
import { HEALTH_CENTERS } from '../../constants/healthCenters'

const emit = defineEmits<{
  (e: 'saved', record: AssessmentRecord): void
  (e: 'showToast', title: string, message: string, isSuccess?: boolean): void
}>()

const currentStep = ref(1)
const isSubmitting = ref(false)
const citizenFeedback = ref('')
const citizenFeedbackClass = ref('')
const rawCitizenId = ref('')

// Autosave Draft State
const STORAGE_KEY_WIZARD_DRAFT = 'nbk_wizard_draft_v1'
const saveStatus = ref<'saved' | 'saving' | 'error' | 'idle' | 'recovered'>('idle')
const lastSavedTime = ref('')

// Predefined Answer Set Modal State
const isPredefinedModalOpen = ref(false)
const presetNeedsReview = ref(false)
let restoringDraft = false

function discardDraft() {
  if (confirm('คุณต้องการลบแบบร่างที่บันทึกไว้ในเครื่องและเริ่มต้นใหม่ใช่หรือไม่?')) {
    localStorage.removeItem(STORAGE_KEY_WIZARD_DRAFT)
    resetForm()
    saveStatus.value = 'idle'
    emit('showToast', 'ล้างแบบร่างแล้ว', 'แบบร่างในเครื่องถูกลบเรียบร้อยแล้ว', true)
  }
}

// Progressive Disclosure: Toggle to force show chemical questions even if Q9 & Q10 are 'ไม่ใช่'
const forceShowAllChemicalQuestions = ref(false)

// Inline Field Validation Errors
const fieldErrors = reactive({
  citizen_id: '',
  fullname: '',
  age: '',
  interviewer_name: '',
  health_center: ''
})

// Searchable health center combobox state
const isHealthCenterOpen = ref(false)
const healthCenterSearch = ref('')
const healthCenterContainerRef = ref<HTMLElement | null>(null)

const filteredHealthCenters = computed(() => {
  const q = healthCenterSearch.value.trim().toLowerCase()
  if (!q) return HEALTH_CENTERS
  return HEALTH_CENTERS.filter(h => h.toLowerCase().includes(q))
})

function selectHealthCenter(center: string) {
  form.health_center = center
  healthCenterSearch.value = center
  isHealthCenterOpen.value = false
}

function handleHealthCenterInput(val: string) {
  form.health_center = val
  healthCenterSearch.value = val
  isHealthCenterOpen.value = true
}

function closeHealthCenterDropdown(e: MouseEvent) {
  if (healthCenterContainerRef.value && !healthCenterContainerRef.value.contains(e.target as Node)) {
    isHealthCenterOpen.value = false
  }
}

const form = reactive<AssessmentSubmission>({
  citizen_id: '',
  fullname: '',
  gender: 'ชาย',
  age: 45,
  address: '',
  occupation: '1. เพาะปลูก (ทำเอง)',
  plant_type: 'ทำนา (ข้าว)',
  eval_date: new Date().toISOString().slice(0, 10),
  interviewer_name: 'เจ้าหน้าที่สาธารณสุข',
  health_center: 'รพ.สต.หลักสาม',
  answers_a: {
    q9: 1, q10: 1, q11: 1, q12: 1, q13: 1, q14: 1, q15: 1, q16: 1, q17: 1
  },
  answers_b: {
    q18: 1, q19: 1, q20: 1, q21: 1, q22: 1, q23: 1
  },
  symptoms: [],
  cholinesterase_result: '',
  chemical_names: []
})

// Persist form and UI-only state together; suppress watchers during restore/reset.
let saveTimer: ReturnType<typeof setTimeout> | null = null
function cancelDraftSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
}
function persistDraft() {
  cancelDraftSave()
  if (restoringDraft || (!form.citizen_id && !form.fullname)) return
  try {
    localStorage.setItem(STORAGE_KEY_WIZARD_DRAFT, JSON.stringify({
      form, currentStep: currentStep.value, hasSymptomsChoice: hasSymptomsChoice.value,
      chemicalInputText: chemicalInputText.value, cachedChemicalAnswers,
      forceShowAllChemicalQuestions: forceShowAllChemicalQuestions.value,
      presetNeedsReview: presetNeedsReview.value
    }))
    saveStatus.value = 'saved'
    lastSavedTime.value = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  } catch { saveStatus.value = 'error' }
}
function scheduleDraftSave() {
  if (restoringDraft) return
  cancelDraftSave()
  saveStatus.value = 'saving'
  saveTimer = setTimeout(persistDraft, 600)
}
watch(form, scheduleDraftSave, { deep: true, flush: 'sync' })

onMounted(() => {
  window.addEventListener('click', closeHealthCenterDropdown)
  window.addEventListener('pagehide', flushPendingDraft)
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WIZARD_DRAFT)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const draft = parsed.form || parsed
    if (!draft || typeof draft.citizen_id !== 'string' || !draft.answers_a || !draft.answers_b || !Array.isArray(draft.symptoms)) return
    restoringDraft = true
    Object.assign(form, draft)
    rawCitizenId.value = form.citizen_id
    hasSymptomsChoice.value = form.symptoms.length ? 'yes' : (parsed.hasSymptomsChoice || 'no')
    currentStep.value = Math.min(5, Math.max(1, parsed.currentStep || 1))
    chemicalInputText.value = parsed.chemicalInputText || ''
    forceShowAllChemicalQuestions.value = !!parsed.forceShowAllChemicalQuestions
    cachedChemicalAnswers = parsed.cachedChemicalAnswers || null
    presetNeedsReview.value = !!parsed.presetNeedsReview
    healthCenterSearch.value = form.health_center
    saveStatus.value = 'recovered'
  } catch { saveStatus.value = 'error' }
  finally { restoringDraft = false }
})
function flushPendingDraft() {
  if (saveTimer) persistDraft()
}
onUnmounted(() => {
  flushPendingDraft()
  cancelDraftSave()
  window.removeEventListener('click', closeHealthCenterDropdown)
  window.removeEventListener('pagehide', flushPendingDraft)
})

const hasSymptomsChoice = ref<'no' | 'yes'>('no')
const chemicalInputText = ref('')
watch([currentStep, hasSymptomsChoice, chemicalInputText, forceShowAllChemicalQuestions, presetNeedsReview], scheduleDraftSave, { flush: 'sync' })

// Thai Citizen ID Validation (Modulo 11)
function validateThaiCitizenID(id: string): boolean {
  const clean = id.replace(/\D/g, '')
  if (clean.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * (13 - i)
  }
  const check = (11 - (sum % 11)) % 10
  return check === parseInt(clean.charAt(12), 10)
}

// Formatted Citizen ID display
const formattedCitizenId = computed({
  get() {
    const clean = rawCitizenId.value.replace(/\D/g, '').slice(0, 13)
    if (clean.length === 0) return ''
    if (clean.length <= 1) return clean
    if (clean.length <= 5) return `${clean.slice(0, 1)}-${clean.slice(1)}`
    if (clean.length <= 10) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5)}`
    if (clean.length <= 12) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10)}`
    return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12, 13)}`
  },
  set(val: string) {
    const clean = val.replace(/\D/g, '').slice(0, 13)
    if (form.citizen_id && form.citizen_id !== clean) resetForm()
    rawCitizenId.value = clean
    form.citizen_id = clean
  }
})

const isCitizenIdValid = computed(() => {
  if (form.citizen_id.length !== 13) return false
  return validateThaiCitizenID(form.citizen_id)
})

// Questions Definitions
const questionsA = [
  { id: 'q9', text: '9. ใช้สารเคมีกำจัดแมลงในการปฏิบัติงานหรือไม่' },
  { id: 'q10', text: '10. ใช้สารเคมีกำจัดวัชพืชในการฉีดพ่นหรือไม่' },
  { id: 'q11', text: '11. ใช้ถังบรรจุสารเคมีที่รั่วซึมหรือปิดไม่สนิท' },
  { id: 'q12', text: '12. ได้รับสัมผัสสารเคมีกำจัดศัตรูพืชในขณะทำงาน' },
  { id: 'q13', text: '13. เสื้อผ้าเปียกชุ่มสารเคมีกำจัดศัตรูพืชขณะทำงาน' },
  { id: 'q14', text: '14. มีอาการผิดปกติหลังจากการใช้สารเคมี' },
  { id: 'q15', text: '15. ขณะทำงานท่านสูบบุหรี่ / ยาเส้น' },
  { id: 'q16', text: '16. รับประทานอาหารหรือดื่มน้ำในบริเวณที่ทำงาน' },
  { id: 'q17', text: '17. ดื่มเหล้า/เบียร์/แอลกอฮอล์ ในบริเวณที่ทำงาน' }
]

const questionsB = [
  { id: 'q18', text: '18. ก่อนใช้สารเคมี อ่านฉลากที่ภาชนะบรรจุหรือไม่' },
  { id: 'q19', text: '19. ขณะทำงาน สวมถุงมือยางป้องกันสารเคมีหรือไม่' },
  { id: 'q20', text: '20. สวมรองเท้าบู๊ทหรือรองเท้าปิดมิดชิดกันสารเคมี' },
  { id: 'q21', text: '21. ล้างมือทุกครั้งก่อนพักทานอาหารหรือดื่มน้ำ' },
  { id: 'q22', text: '22. หลังฉีดพ่น เปลี่ยนเสื้อผ้าเปื้อนสารเคมีทันที' },
  { id: 'q23', text: '23. อาบน้ำทำความสะอาดร่างกายทันทีหลังเลิกงาน' }
]

const symptomsCatalog = {
  g1: [
    'ไอ', 'แสบจมูก', 'เจ็บคอ คอแห้ง', 'หายใจติดขัด',
    'ตาแดง/แสบตา/คันตา', 'น้ำมูกไหล', 'น้ำตาไหล',
    'คันผิวหนัง/ผิวแห้ง/ผิวแตก', 'ผื่นคัน/ตุ่มพุพอง', 'ปวดแสบร้อนผิวหนัง'
  ],
  g2: [
    'อ่อนเพลีย', 'อาการชา', 'ใจสั่น', 'เวียนศีรษะ', 'ปวดศีรษะ',
    'นอนหลับไม่สนิท', 'คลื่นไส้ อาเจียน', 'ปวดท้อง', 'ท้องเสีย',
    'เหงื่อออก', 'เจ็บหน้าอก/แน่นหน้าอก', 'อ่อนล้า'
  ],
  g3: [
    'ตาพร่ามัว', 'หนังตากระตุก', 'กล้ามเนื้อเกร็ง', 'เป็นตะคริว',
    'มือสั่น', 'เดินโซเซ', 'น้ำลายไหลฟูมปาก', 'ลมชัก', 'หมดสติ/ไม่รู้สึกตัว'
  ]
}

const quickChemicals = ['คลอร์ไพริฟอส', 'ไกลโฟเสต', 'อะบาเมกติน', 'ไซเพอร์เมทริน', 'พาราควอต', 'คาร์โบซัลแฟน']

// Real-time Scores calculation
const scoreA = computed(() => {
  return Object.values(form.answers_a).reduce((sum, val) => sum + (val || 0), 0)
})

const scoreB = computed(() => {
  return Object.values(form.answers_b).reduce((sum, val) => sum + (val || 0), 0)
})

const totalBehaviorScore = computed(() => scoreA.value + scoreB.value)

// Highest symptom group determination
const highestSymptomGroup = computed(() => {
  if (hasSymptomsChoice.value === 'no' || form.symptoms.length === 0) return 0
  let highest = 0
  for (const s of form.symptoms) {
    if (symptomsCatalog.g3.includes(s)) return 3
    if (symptomsCatalog.g2.includes(s) && highest < 2) highest = 2
    if (symptomsCatalog.g1.includes(s) && highest < 1) highest = 1
  }
  return highest
})

// Risk Matrix Evaluation logic matching DDC guidelines
const riskEvaluation = computed(() => {
  const tot = totalBehaviorScore.value
  const g = highestSymptomGroup.value
  let level = 'มีความเสี่ยงต่ำ'

  if (tot <= 24) {
    if (g === 0) level = 'มีความเสี่ยงต่ำ'
    else if (g === 1) level = 'มีความเสี่ยงปานกลาง'
    else if (g === 2) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (g === 3) level = 'มีความเสี่ยงสูง'
  } else if (tot <= 30) {
    if (g === 0) level = 'มีความเสี่ยงปานกลาง'
    else if (g === 1) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (g === 2) level = 'มีความเสี่ยงสูง'
    else if (g === 3) level = 'มีความเสี่ยงสูง'
  } else {
    if (g === 0) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (g === 1) level = 'มีความเสี่ยงสูง'
    else if (g === 2) level = 'มีความเสี่ยงสูง'
    else if (g === 3) level = 'มีความเสี่ยงสูงมาก'
  }

  const requireBlood = (level === 'มีความเสี่ยงค่อนข้างสูง' || level === 'มีความเสี่ยงสูง' || level === 'มีความเสี่ยงสูงมาก')

  return {
    riskLevel: level,
    requireBloodTest: requireBlood,
    scoreColumn: tot <= 24 ? 0 : tot <= 30 ? 1 : 2,
    symptomRow: g
  }
})

// Progressive disclosure for chemical questions (Q9 & Q10)
const isUsingChemicals = computed(() => {
  return form.answers_a.q9 > 1 || form.answers_a.q10 > 1 || forceShowAllChemicalQuestions.value
})

const visibleQuestionsA = computed(() => {
  if (isUsingChemicals.value) return questionsA
  return questionsA.filter(q => !['q11', 'q12', 'q13', 'q14'].includes(q.id))
})

// Non-destructive progressive disclosure: cache previous chemical answers so accidental toggles do not erase data
let cachedChemicalAnswers: Record<string, number> | null = null
watch(isUsingChemicals, (using, oldUsing) => {
  if (restoringDraft) return
  if (!using && oldUsing) {
    cachedChemicalAnswers = {
      q11: form.answers_a.q11,
      q12: form.answers_a.q12,
      q13: form.answers_a.q13,
      q14: form.answers_a.q14
    }
    form.answers_a.q11 = 1
    form.answers_a.q12 = 1
    form.answers_a.q13 = 1
    form.answers_a.q14 = 1
  } else if (using && !oldUsing && cachedChemicalAnswers) {
    form.answers_a.q11 = cachedChemicalAnswers.q11
    form.answers_a.q12 = cachedChemicalAnswers.q12
    form.answers_a.q13 = cachedChemicalAnswers.q13
    form.answers_a.q14 = cachedChemicalAnswers.q14
  }
}, { flush: 'sync' })

// Apply predefined answer set after explicit user confirmation
function confirmApplyPredefinedPreset() {
  restoringDraft = true
  cachedChemicalAnswers = null
  questionsA.forEach(q => {
    form.answers_a[q.id] = 1
  })
  questionsB.forEach(q => {
    form.answers_b[q.id] = 1
  })
  restoringDraft = false
  presetNeedsReview.value = true
  scheduleDraftSave()
  isPredefinedModalOpen.value = false
  emit('showToast', 'กรอกคำตอบเริ่มต้นแล้ว', 'กรุณาตรวจสอบความถูกต้องของคำตอบแต่ละข้อร่วมกับเกษตรกรก่อนบันทึก', true)
}

// Citizen ID Lookup
async function lookupCitizen() {
  const cid = form.citizen_id.trim()
  if (!cid || cid.length !== 13) {
    emit('showToast', 'แจ้งเตือน', 'กรุณาระบุเลขบัตรประชาชนให้ครบ 13 หลัก', false)
    return
  }

  try {
    const existing = await fetchFarmer(cid)
    if (cid !== form.citizen_id || restoringDraft) return
    if (existing) {
      form.fullname = existing.fullname
      form.gender = existing.gender
      form.age = existing.age
      form.address = existing.address
      form.occupation = existing.occupation || form.occupation
      form.plant_type = existing.plant_type || form.plant_type
      citizenFeedback.value = `✓ พบประวัติเดิมของ: ${existing.fullname} (ดึงข้อมูลอัตโนมัติแล้ว)`
      citizenFeedbackClass.value = 'text-emerald-700 font-medium'
      emit('showToast', 'พบข้อมูลเดิม', `ดึงข้อมูลของ ${existing.fullname} เรียบร้อยแล้ว`, true)
    } else {
      citizenFeedback.value = '✓ เป็นเกษตรกรรายใหม่ (ยังไม่มีประวัติในระบบ)'
      citizenFeedbackClass.value = 'text-slate-500'
    }
  } catch (err) {
    console.error(err)
  }
}

// Watch citizen_id length to auto-lookup
watch(() => form.citizen_id, (val) => {
  if (restoringDraft) return
  if (val && val.length === 13) {
    lookupCitizen()
  } else {
    citizenFeedback.value = ''
  }
}, { flush: 'sync' })

function addChemicalTag(name: string) {
  if (!form.chemical_names.includes(name)) {
    form.chemical_names.push(name)
  }
}

function removeChemicalTag(name: string) {
  form.chemical_names = form.chemical_names.filter(c => c !== name)
}

function handleChemicalKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && chemicalInputText.value.trim()) {
    e.preventDefault()
    const parsed = chemicalInputText.value.split(',').map(s => s.trim()).filter(Boolean)
    parsed.forEach(c => addChemicalTag(c))
    chemicalInputText.value = ''
  }
}

function toggleSymptom(s: string) {
  const idx = form.symptoms.indexOf(s)
  if (idx >= 0) {
    form.symptoms.splice(idx, 1)
  } else {
    form.symptoms.push(s)
  }
}

function setHasSymptoms(val: 'no' | 'yes') {
  hasSymptomsChoice.value = val
  if (val === 'no') {
    form.symptoms = []
  }
}

function goToStep(step: number) {
  if (step < currentStep.value) {
    currentStep.value = step
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function validateStep1(): boolean {
  let valid = true
  fieldErrors.citizen_id = ''
  fieldErrors.fullname = ''
  fieldErrors.age = ''
  fieldErrors.interviewer_name = ''
  fieldErrors.health_center = ''

  if (!form.citizen_id || form.citizen_id.length !== 13) {
    fieldErrors.citizen_id = 'กรุณาระบุเลขประจำตัวประชาชน 13 หลัก'
    valid = false
  } else if (!validateThaiCitizenID(form.citizen_id)) {
    fieldErrors.citizen_id = 'เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการตรวจสอบ (Modulo 11)'
    valid = false
  }

  if (!form.fullname.trim()) {
    fieldErrors.fullname = 'กรุณาระบุชื่อ - นามสกุล เกษตรกร'
    valid = false
  }

  if (!form.age || form.age <= 0 || form.age > 120) {
    fieldErrors.age = 'กรุณาระบุอายุให้ถูกต้อง (1 - 120 ปี)'
    valid = false
  }

  if (!form.interviewer_name.trim()) {
    fieldErrors.interviewer_name = 'กรุณาระบุชื่อเจ้าหน้าที่ผู้ซักประวัติ'
    valid = false
  }

  if (!form.health_center.trim()) {
    fieldErrors.health_center = 'กรุณาเลือกหรือระบุหน่วยบริการ'
    valid = false
  }

  return valid
}

function nextStep() {
  if (currentStep.value === 1) {
    if (!validateStep1()) {
      emit('showToast', 'ข้อมูลไม่ครบถ้วน', 'กรุณาตรวจสอบข้อมูลที่ต้องระบุ (*)', false)
      return
    }
  }

  if (currentStep.value < 5) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

async function submitForm() {
  if (isSubmitting.value || currentStep.value !== 5 || !validateStep1()) return
  isSubmitting.value = true
  try {
    if (chemicalInputText.value.trim()) {
      const parsed = chemicalInputText.value.split(',').map(s => s.trim()).filter(Boolean)
      parsed.forEach(c => addChemicalTag(c))
      chemicalInputText.value = ''
    }

    const payload: AssessmentSubmission = JSON.parse(JSON.stringify(form))
    if (!isUsingChemicals.value) {
      for (const key of ['q11', 'q12', 'q13', 'q14']) payload.answers_a[key] = 1
    }
    const res = await createAssessment(payload)
    cancelDraftSave()
    try {
      localStorage.removeItem(STORAGE_KEY_WIZARD_DRAFT)
    } catch {
      // ignore
    }
    emit('showToast', 'บันทึกสำเร็จ', `บันทึกแบบประเมินของ ${form.fullname} เรียบร้อยแล้ว`, true)
    emit('saved', res)
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกแบบประเมิน'
    emit('showToast', 'บันทึกไม่สำเร็จ', errorMsg, false)
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  restoringDraft = true
  cancelDraftSave()
  cachedChemicalAnswers = null
  presetNeedsReview.value = false
  isPredefinedModalOpen.value = false
  questionsA.forEach(q => { form.answers_a[q.id] = 1 })
  questionsB.forEach(q => { form.answers_b[q.id] = 1 })
  Object.keys(fieldErrors).forEach(key => { fieldErrors[key as keyof typeof fieldErrors] = '' })
  try {
    localStorage.removeItem(STORAGE_KEY_WIZARD_DRAFT)
  } catch {
    // ignore
  }
  rawCitizenId.value = ''
  form.citizen_id = ''
  form.fullname = ''
  form.gender = 'ชาย'
  form.age = 45
  form.address = ''
  form.occupation = '1. เพาะปลูก (ทำเอง)'
  form.plant_type = 'ทำนา (ข้าว)'
  form.eval_date = new Date().toISOString().slice(0, 10)
  form.symptoms = []
  hasSymptomsChoice.value = 'no'
  chemicalInputText.value = ''
  form.chemical_names = []
  form.cholinesterase_result = ''
  citizenFeedback.value = ''
  forceShowAllChemicalQuestions.value = false
  currentStep.value = 1
  form.interviewer_name = 'เจ้าหน้าที่สาธารณสุข'
  form.health_center = 'รพ.สต.หลักสาม'
  healthCenterSearch.value = form.health_center
  saveStatus.value = 'idle'
  restoringDraft = false
}

defineExpose({
  resetForm,
  discardDraft
})
</script>

<template>
  <div class="max-w-5xl lg:max-w-6xl mx-auto space-y-6 pb-24 md:pb-10">
    <!-- Progress Indicator Bar with Interactive Step Buttons -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div class="flex items-center justify-between text-xs sm:text-sm">
        <div class="flex items-center space-x-2.5">
          <span class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-700 text-white font-bold text-xs sm:text-sm">
            {{ currentStep }}
          </span>
          <span class="text-slate-900 font-bold text-sm sm:text-base">ขั้นตอนที่ {{ currentStep }} จาก 5</span>
        </div>
        <div class="flex items-center space-x-3">
          <!-- Autosave Draft Status Badge -->
          <span v-if="saveStatus === 'saving'" class="text-xs text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>กำลังบันทึกร่างในเครื่อง...</span>
          </span>
          <span v-else-if="saveStatus === 'recovered'" class="text-xs text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center space-x-1.5">
            <span>📋 กู้คืนแบบร่างจากเครื่องแล้ว</span>
            <button type="button" @click="discardDraft" class="text-blue-700 hover:text-blue-950 font-bold underline ml-1 cursor-pointer">เริ่มใหม่</button>
          </span>
          <span v-else-if="saveStatus === 'saved' && lastSavedTime" class="text-xs text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1.5">
            <span>✓ บันทึกร่างในเครื่องแล้ว ({{ lastSavedTime }} น.)</span>
          </span>
          <span v-else-if="saveStatus === 'error'" class="text-xs text-rose-900 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center space-x-1.5">
            <span>⚠️ บันทึกร่างในเครื่องไม่สำเร็จ</span>
          </span>
          <span class="text-slate-600 font-mono font-semibold text-xs sm:text-sm">{{ Math.round((currentStep / 5) * 100) }}% เสร็จสิ้น</span>
        </div>
      </div>

      <!-- Stepper Track -->
      <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div 
          class="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${(currentStep / 5) * 100}%` }"
        ></div>
      </div>

      <!-- Step Titles on Desktop (Clickable for previous steps) -->
      <div class="hidden sm:grid grid-cols-5 text-xs sm:text-sm text-center pt-1 gap-2">
        <button 
          v-for="(stepName, idx) in ['1. ข้อมูลทั่วไป', '2. พฤติกรรม', '3. กลุ่มอาการ', '4. ประเมินความเสี่ยง', '5. ตรวจเลือด']"
          :key="idx"
          type="button"
          @click="goToStep(idx + 1)"
          :disabled="idx + 1 > currentStep"
          :class="[
            'py-2 px-2 rounded-xl transition font-semibold text-center truncate',
            currentStep === idx + 1 ? 'text-emerald-950 font-bold bg-emerald-50 ring-1 ring-emerald-300/80 shadow-xs' :
            currentStep > idx + 1 ? 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100 cursor-pointer' :
            'text-slate-400 cursor-not-allowed'
          ]"
        >
          {{ stepName }}
        </button>
      </div>
    </div>

    <p v-if="presetNeedsReview" role="status" class="text-sm text-amber-950 bg-amber-50 p-3 rounded-xl">
      คำตอบพฤติกรรมถูกเติมจากชุดเริ่มต้น ยังไม่ได้ยืนยันกับเกษตรกร กรุณาทบทวนทุกข้อก่อนบันทึก
      <button type="button" class="underline font-bold" @click="presetNeedsReview = false">ทบทวนทุกข้อแล้ว</button>
    </p>
    <!-- Form Container -->
    <form @submit.prevent="submitForm">
      <!-- ================================================================= -->
      <!-- STEP 1: GENERAL INFORMATION                                       -->
      <!-- ================================================================= -->
      <div v-show="currentStep === 1" class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
        <div class="border-b border-slate-100 pb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 1: ข้อมูลทั่วไปเกษตรกร</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">ระบุเลขประจำตัวประชาชน 13 หลัก เพื่อค้นหาประวัติเดิมอัตโนมัติ</p>
          </div>
          <span class="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
            Step 1/5
          </span>
        </div>

        <div class="space-y-5">
          <!-- Citizen ID & Lookup Button -->
          <div class="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label for="WizardTab-formattedCitizenId" class="block text-sm font-semibold text-slate-800">
                เลขประจำตัวประชาชน (13 หลัก) <span class="text-rose-500">*</span>
              </label>
              <!-- Checksum badge -->
              <span 
                v-if="form.citizen_id.length === 13" 
                :class="[
                  'text-xs font-semibold px-2.5 py-1 rounded-full border',
                  isCitizenIdValid 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                ]"
              >
                {{ isCitizenIdValid ? '✓ เลขบัตรถูกต้องตามโครงสร้าง' : '⚠️ ตรวจสอบเลขบัตร (ผลรวมตรวจสอบไม่ตรง)' }}
              </span>
              <span v-else-if="form.citizen_id.length > 0" class="text-xs text-slate-400">
                ({{ form.citizen_id.length }}/13 หลัก)
              </span>
            </div>

            <div class="flex gap-3">
              <div class="relative flex-1">
                <input id="WizardTab-formattedCitizenId" :aria-invalid="!!fieldErrors.citizen_id" aria-describedby="error-citizen_id" 
                  type="text" 
                  v-model="formattedCitizenId" 
                  maxlength="17"
                  placeholder="X-XXXX-XXXXX-XX-X" 
                  :class="[
                    'w-full px-4 py-3 border rounded-xl text-sm sm:text-base font-mono tracking-wider focus:ring-2 focus:outline-none bg-white',
                    fieldErrors.citizen_id ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                  ]"
                >
              </div>
              <button 
                type="button" 
                @click="lookupCitizen" 
                class="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span>ค้นหาประวัติ</span>
              </button>
            </div>
            <p id="error-citizen_id" v-if="fieldErrors.citizen_id" class="text-xs sm:text-sm text-rose-600 font-medium mt-1">
              ⚠️ {{ fieldErrors.citizen_id }}
            </p>
            <p v-else-if="citizenFeedback" :class="['text-xs sm:text-sm mt-1.5 font-medium', citizenFeedbackClass]">
              {{ citizenFeedback }}
            </p>
          </div>

          <!-- Name, Gender, Age in balanced multi-column grid -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div class="sm:col-span-6">
              <label for="WizardTab-form-fullname" class="block text-sm font-semibold text-slate-800 mb-1.5">
                ชื่อ - นามสกุล <span class="text-rose-500">*</span>
              </label>
              <input id="WizardTab-form-fullname" :aria-invalid="!!fieldErrors.fullname" aria-describedby="error-fullname" 
                type="text" 
                v-model="form.fullname" 
                placeholder="เช่น นายสมศักดิ์ ขยันงาน" 
                :class="[
                  'w-full px-4 py-3 border rounded-xl text-sm sm:text-base focus:ring-2 focus:outline-none',
                  fieldErrors.fullname ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                ]"
              >
              <p id="error-fullname" v-if="fieldErrors.fullname" class="text-xs sm:text-sm text-rose-600 font-medium mt-1">
                ⚠️ {{ fieldErrors.fullname }}
              </p>
            </div>
            <div class="sm:col-span-3">
              <label for="WizardTab-form-gender" class="block text-sm font-semibold text-slate-800 mb-1.5">เพศ</label>
              <select id="WizardTab-form-gender" v-model="form.gender" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base bg-white focus:ring-2 focus:ring-emerald-500">
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>
            <div class="sm:col-span-3">
              <label for="WizardTab-form-age" class="block text-sm font-semibold text-slate-800 mb-1.5">
                อายุ (ปี) <span class="text-rose-500">*</span>
              </label>
              <input id="WizardTab-form-age" :aria-invalid="!!fieldErrors.age" aria-describedby="error-age" 
                type="number" 
                v-model.number="form.age" 
                min="1" 
                max="120" 
                :class="[
                  'w-full px-4 py-3 border rounded-xl text-sm sm:text-base focus:ring-2',
                  fieldErrors.age ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-emerald-500'
                ]"
              >
              <p id="error-age" v-if="fieldErrors.age" class="text-xs sm:text-sm text-rose-600 font-medium mt-1">
                ⚠️ {{ fieldErrors.age }}
              </p>
            </div>
          </div>

          <!-- Address -->
          <div>
            <label for="WizardTab-form-address" class="block text-sm font-semibold text-slate-800 mb-1.5">ที่อยู่ / หมู่บ้าน / ตำบล</label>
            <input id="WizardTab-form-address" 
              type="text" 
              v-model="form.address" 
              placeholder="เช่น 12 หมู่ 3 ต.บ้านแพ้ว อ.บ้านแพ้ว จ.สมุทรสาคร" 
              class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-emerald-500"
            >
          </div>

          <!-- Occupation & Crops (2 columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="WizardTab-form-occupation" class="block text-sm font-semibold text-slate-800 mb-1.5">ลักษณะงานเกษตรกรรม</label>
              <select id="WizardTab-form-occupation" v-model="form.occupation" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base bg-white focus:ring-2 focus:ring-emerald-500">
                <option value="1. เพาะปลูก (ทำเอง)">1. เพาะปลูก (ทำเอง)</option>
                <option value="2. เพาะปลูก (รับจ้าง)">2. เพาะปลูก (รับจ้าง)</option>
                <option value="3. รับจ้างฉีดพ่น">3. รับจ้างฉีดพ่นสารเคมี</option>
                <option value="4. ค้าขาย/ผสมสารเคมี">4. ร้านค้า/ผสมสารเคมี</option>
                <option value="5. อื่นๆ">5. อื่นๆ</option>
              </select>
            </div>
            <div>
              <label for="WizardTab-form-plant_type" class="block text-sm font-semibold text-slate-800 mb-1.5">ชนิดพืชหลักที่ปลูก</label>
              <select id="WizardTab-form-plant_type" v-model="form.plant_type" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base bg-white focus:ring-2 focus:ring-emerald-500">
                <option value="ทำนา (ข้าว)">ทำนา (ข้าว)</option>
                <option value="ทำสวน (ผลไม้/ทุเรียน/ส้ม/มะนาว)">ทำสวน (ผลไม้/ทุเรียน/ส้ม/มะนาว)</option>
                <option value="ทำสวน (พืชผัก/พริก/มะเขือ/ผักกาด)">ทำสวน (พืชผัก/พริก/มะเขือ/ผักกาด)</option>
                <option value="ทำไร่ (ข้าวโพด/อ้อย/มันสำปะหลัง)">ทำไร่ (ข้าวโพด/อ้อย/มันสำปะหลัง)</option>
                <option value="ทำสวน (ยางพารา/ปาล์มน้ำมัน)">ทำสวน (ยางพารา/ปาล์มน้ำมัน)</option>
                <option value="ทำสวน (กล้วยไม้/ไม้ดอกไม้ประดับ)">ทำสวน (กล้วยไม้/ไม้ดอกไม้ประดับ)</option>
              </select>
            </div>
          </div>

          <!-- Clinical Protocol & Interviewer Info (รพ.สต. / รพ.) -->
          <div class="p-4 sm:p-5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-xs sm:text-sm text-emerald-950 space-y-2">
            <div class="flex items-center space-x-2 font-bold text-emerald-900 text-sm sm:text-base">
              <svg class="w-5 h-5 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
              </svg>
              <span>แนวทางปฏิบัติงาน: รพ.สต. และ รพ. คัดกรองสารเคมีในเลือด</span>
            </div>
            <p class="text-xs sm:text-sm text-emerald-800 leading-relaxed font-normal pl-7">
              1. ตรวจคัดกรองสารเคมีตกค้างในเลือดด้วยกระดาษทดสอบ (Reactive Paper)<br>
              2. หากผลตรวจเป็น <strong>"เสี่ยง"</strong> หรือ <strong>"ไม่ปลอดภัย"</strong> ➔ เจ้าหน้าที่ รพ.สต./รพ. เป็นผู้ซักประวัติแบบประเมิน นบก. 1-56 และนัดเจาะเลือดซ้ำ
            </p>
          </div>

          <!-- Evaluation Context & Interviewer (3 columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label for="WizardTab-form-eval_date" class="block text-sm font-semibold text-slate-800 mb-1.5">วันที่ประเมิน</label>
              <input id="WizardTab-form-eval_date" type="date" v-model="form.eval_date" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base bg-white">
            </div>
            <div>
              <label for="WizardTab-form-interviewer_name" class="block text-sm font-semibold text-slate-800 mb-1.5">
                เจ้าหน้าที่ผู้ซักประวัติ <span class="text-rose-500">*</span>
              </label>
              <input id="WizardTab-form-interviewer_name" :aria-invalid="!!fieldErrors.interviewer_name" aria-describedby="error-interviewer_name" 
                type="text" 
                v-model="form.interviewer_name" 
                placeholder="ชื่อ-สกุล เจ้าหน้าที่" 
                :class="[
                  'w-full px-4 py-3 border rounded-xl text-sm sm:text-base',
                  fieldErrors.interviewer_name ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300'
                ]"
              >
              <p id="error-interviewer_name" v-if="fieldErrors.interviewer_name" class="text-xs sm:text-sm text-rose-600 font-medium mt-1">
                ⚠️ {{ fieldErrors.interviewer_name }}
              </p>
            </div>
            <!-- Searchable Dropdown Combobox for Health Center -->
            <div class="relative" ref="healthCenterContainerRef">
              <label class="block text-sm font-semibold text-slate-800 mb-1.5">
                หน่วยบริการ (รพ.สต. / โรงพยาบาล) <span class="text-rose-500">*</span>
              </label>
              
              <div class="relative">
                <input 
                  type="text" 
                  id="WizardTab-health-center"
                  aria-label="หน่วยบริการ (รพ.สต. / โรงพยาบาล)"
                  :aria-expanded="isHealthCenterOpen"
                  :aria-invalid="!!fieldErrors.health_center"
                  aria-describedby="error-health_center"
                  @keydown.esc.stop="isHealthCenterOpen = false"
                  :value="form.health_center"
                  @focus="isHealthCenterOpen = true"
                  @input="handleHealthCenterInput(($event.target as HTMLInputElement).value)"
                  placeholder="พิมพ์ค้นหาหรือคลิกเลือก..." 
                  :class="[
                    'w-full pl-4 pr-10 py-3 border rounded-xl text-sm sm:text-base bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                    fieldErrors.health_center ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  ]"
                >
                <!-- Toggle Chevron -->
                <button 
                  type="button" 
                  @click="isHealthCenterOpen = !isHealthCenterOpen"
                  class="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="เปิดรายชื่อหน่วยบริการ"
                >
                  <svg class="w-5 h-5 transition-transform" :class="isHealthCenterOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
              <p id="error-health_center" v-if="fieldErrors.health_center" class="text-xs sm:text-sm text-rose-600 font-medium mt-1">
                ⚠️ {{ fieldErrors.health_center }}
              </p>

              <!-- Floating Dropdown Menu -->
              <div 
                v-if="isHealthCenterOpen"
                class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 text-sm py-1.5"
              >
                <div v-if="filteredHealthCenters.length === 0" class="p-3.5 text-center text-slate-400 text-xs sm:text-sm">
                  ไม่พบหน่วยบริการที่ค้นหา (สามารถพิมพ์ระบุเองได้)
                </div>
                <button
                  v-for="item in filteredHealthCenters"
                  :key="item"
                  type="button"
                  @click="selectHealthCenter(item)"
                  :class="[
                    'w-full text-left px-4 py-2.5 hover:bg-emerald-100 hover:text-emerald-950 transition flex items-center justify-between',
                    form.health_center === item ? 'bg-emerald-200 text-emerald-950 font-bold' : 'text-emerald-900'
                  ]"
                >
                  <span>{{ item }}</span>
                  <span v-if="form.health_center === item" class="text-emerald-600 font-bold">✓</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- STEP 2: BEHAVIOR QUESTIONS (Part A & Part B)                      -->
      <!-- ================================================================= -->
      <div v-show="currentStep === 2" class="space-y-4">
        <!-- Sticky Real-time Score Banner & Speed Preset -->
        <div class="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div class="flex items-center space-x-3 flex-wrap gap-y-1">
            <span class="font-bold text-slate-200 text-sm sm:text-base">คะแนนพฤติกรรมเรียลไทม์:</span>
            <span>เสี่ยง (A): <strong class="text-amber-300 text-sm">{{ scoreA }}</strong>/27</span>
            <span>ป้องกัน (B): <strong class="text-teal-300 text-sm">{{ scoreB }}</strong>/18</span>
            <span class="px-2 py-0.5 bg-white/15 rounded-md font-bold text-white">รวม: {{ totalBehaviorScore }}/45</span>
          </div>
          <button 
            type="button" 
            @click="isPredefinedModalOpen = true"
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl font-medium text-[11px] transition flex items-center justify-center space-x-1.5 border border-slate-700 shadow-xs cursor-pointer"
          >
            <span>📋 ใช้ชุดคำตอบเริ่มต้น (ความเสี่ยงต่ำ)</span>
          </button>
        </div>

        <!-- Part A -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div class="border-b border-slate-100 pb-2">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base sm:text-lg font-bold text-slate-900">ตอนที่ 2 ส่วนที่ 1: พฤติกรรมเสี่ยง (ข้อ 9 - 17)</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">คะแนนยิ่งมาก = ยิ่งมีความเสี่ยงสูง (ไม่ใช่=1, บางครั้ง=2, ทุกครั้ง=3)</p>
              </div>
              <span class="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                คะแนน A: {{ scoreA }} / 27
              </span>
            </div>
          </div>

          <!-- Progressive Disclosure Banner: Non-chemical user shortcut -->
          <div v-if="!isUsingChemicals" class="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-start sm:items-center space-x-2">
              <span class="text-base flex-shrink-0">ℹ️</span>
              <span class="leading-relaxed">
                เกษตรกรตอบข้อ 9-10 ว่า <strong>ไม่ใช่ (ไม่ได้ใช้สารเคมี)</strong> ระบบจึงข้ามและซ่อนข้อ 11 - 14 อัตโนมัติ (คะแนนข้อ 11-14 เป็น 1)
              </span>
            </div>
            <button 
              type="button" 
              @click="forceShowAllChemicalQuestions = true"
              class="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline self-end sm:self-auto flex-shrink-0 cursor-pointer"
            >
              แสดงคำถามทุกข้อ
            </button>
          </div>
          <div v-else-if="forceShowAllChemicalQuestions && form.answers_a.q9 === 1 && form.answers_a.q10 === 1" class="flex justify-end">
            <button 
              type="button" 
              @click="forceShowAllChemicalQuestions = false"
              class="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              ซ่อนคำถามสารเคมี (ข้อ 11 - 14)
            </button>
          </div>

          <div class="space-y-3">
            <div 
              v-for="q in visibleQuestionsA" 
              :key="q.id" 
              class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3 hover:border-slate-300 transition"
            >
              <div class="flex items-start justify-between">
                <p class="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">{{ q.text }}</p>
                <span 
                  v-if="form.answers_a[q.id] === 3" 
                  class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 flex-shrink-0"
                >
                  เสี่ยงสูง
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button 
                  type="button"
                  v-for="opt in [
                    { val: 1, label: 'ไม่ใช่ (1)', activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' },
                    { val: 2, label: 'บางครั้ง (2)', activeClass: 'border-amber-600 bg-amber-50 text-amber-900 font-bold' },
                    { val: 3, label: 'ทุกครั้ง (3)', activeClass: 'border-rose-600 bg-rose-50 text-rose-900 font-bold' }
                  ]" 
                  :key="opt.val"
                  :class="[
                    'py-2 px-1 text-center rounded-xl border text-[11px] cursor-pointer transition select-none',
                    form.answers_a[q.id] === opt.val 
                      ? opt.activeClass 
                      : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  ]"
                  :aria-pressed="form.answers_a[q.id] === opt.val"
                  :aria-label="q.text + ': ' + opt.label"
                  @click="form.answers_a[q.id] = opt.val"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Part B -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div class="border-b border-slate-100 pb-2">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base sm:text-lg font-bold text-slate-900">ตอนที่ 2 ส่วนที่ 2: พฤติกรรมป้องกันความปลอดภัย (ข้อ 18 - 23)</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">★ สเกลกลับด้าน: ปฏิบัติครบถ้วนทุกครั้ง = 1 คะแนน (ปลอดภัย) | ไม่ปฏิบัติ = 3 คะแนน</p>
              </div>
              <span class="text-xs text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                คะแนน B: {{ scoreB }} / 18
              </span>
            </div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="q in questionsB" 
              :key="q.id" 
              class="p-3 rounded-xl border border-slate-200/80 bg-white space-y-2 hover:border-slate-300 transition"
            >
              <div class="flex items-start justify-between">
                <p class="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">{{ q.text }}</p>
                <span 
                  v-if="form.answers_b[q.id] === 1" 
                  class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 flex-shrink-0"
                >
                  ปลอดภัย
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button 
                  type="button"
                  v-for="opt in [
                    { val: 3, label: 'ไม่ใช่ (3)', sub: 'ไม่ป้องกัน', activeClass: 'border-rose-600 bg-rose-50 text-rose-900 font-bold' },
                    { val: 2, label: 'บางครั้ง (2)', sub: 'ไม่สม่ำเสมอ', activeClass: 'border-amber-600 bg-amber-50 text-amber-900 font-bold' },
                    { val: 1, label: 'ทุกครั้ง (1)', sub: 'ป้องกันดี', activeClass: 'border-teal-600 bg-teal-50 text-teal-900 font-bold' }
                  ]" 
                  :key="opt.val"
                  :class="[
                    'py-2 px-1 text-center rounded-xl border text-[11px] cursor-pointer transition select-none flex flex-col items-center justify-center',
                    form.answers_b[q.id] === opt.val 
                      ? opt.activeClass 
                      : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  ]"
                  :aria-pressed="form.answers_b[q.id] === opt.val"
                  :aria-label="q.text + ': ' + opt.label"
                  @click="form.answers_b[q.id] = opt.val"
                >
                  <span>{{ opt.label }}</span>
                  <span class="text-[9px] opacity-75 mt-0.5">{{ opt.sub }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- STEP 3: SYMPTOMS SCREENING                                        -->
      <!-- ================================================================= -->
      <div v-show="currentStep === 3" class="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div class="border-b border-slate-100 pb-3 flex items-start justify-between">
          <div>
            <h3 class="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 3: แบบคัดกรองอาการผิดปกติจากการสัมผัสสารเคมี</h3>
            <p class="text-xs text-slate-500 mt-0.5">ในรอบ 1 เดือนที่ผ่านมา เกษตรกรมีอาการผิดปกติเกิดขึ้นหรือไม่</p>
          </div>
          <span 
            v-if="form.symptoms.length > 0" 
            class="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full font-bold text-xs"
          >
            เลือกแล้ว {{ form.symptoms.length }} อาการ
          </span>
        </div>

        <!-- Choice: Has symptom or not -->
        <div class="grid grid-cols-2 gap-3">
          <button 
            type="button" 
            @click="setHasSymptoms('no')"
            :class="[
              'p-4 rounded-xl border-2 font-bold text-xs text-center transition flex flex-col items-center justify-center space-y-1.5 focus:outline-none',
              hasSymptomsChoice === 'no' 
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            ]"
          >
            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span>ไม่มีอาการผิดปกติ</span>
          </button>

          <button 
            type="button" 
            @click="setHasSymptoms('yes')"
            :class="[
              'p-4 rounded-xl border-2 font-bold text-xs text-center transition flex flex-col items-center justify-center space-y-1.5 focus:outline-none',
              hasSymptomsChoice === 'yes' 
                ? 'border-rose-600 bg-rose-50 text-rose-950 shadow-xs' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            ]"
          >
            <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <span>มีอาการผิดปกติ (คลิกเลือกอาการ)</span>
          </button>
        </div>

        <!-- Symptoms Selection Groups (Multi-column on desktop) -->
        <div v-show="hasSymptomsChoice === 'yes'" class="space-y-6 pt-3">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- Group 1 -->
            <div class="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <h4 class="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>กลุ่มที่ 1: ระบบทางเดินหายใจ และผิวหนัง</span>
              </h4>
              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="sym in symptomsCatalog.g1" 
                  :key="sym"
                  type="button"
                  @click="toggleSymptom(sym)"
                  :class="[
                    'px-3.5 py-2 rounded-xl border text-xs sm:text-sm transition font-medium',
                    form.symptoms.includes(sym)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                >
                  {{ sym }}
                </button>
              </div>
            </div>

            <!-- Group 2 -->
            <div class="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <h4 class="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-orange-500"></span>
                <span>กลุ่มที่ 2: ประสาทส่วนปลาย และทางเดินอาหาร</span>
              </h4>
              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="sym in symptomsCatalog.g2" 
                  :key="sym"
                  type="button"
                  @click="toggleSymptom(sym)"
                  :class="[
                    'px-3.5 py-2 rounded-xl border text-xs sm:text-sm transition font-medium',
                    form.symptoms.includes(sym)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                >
                  {{ sym }}
                </button>
              </div>
            </div>
          </div>

          <!-- Group 3 (High Alert / Severe) -->
          <div class="p-5 sm:p-6 rounded-2xl border border-rose-300 bg-rose-50/50 space-y-3">
            <h4 class="text-sm sm:text-base font-bold text-rose-900 flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
              <span>กลุ่มที่ 3: ระบบประสาทส่วนกลาง / อาการรุนแรง (ส่งพบแพทย์ทันทีหากมีอาการ)</span>
            </h4>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="sym in symptomsCatalog.g3" 
                :key="sym"
                type="button"
                @click="toggleSymptom(sym)"
                :class="[
                  'px-3.5 py-2 rounded-xl border text-xs sm:text-sm transition font-medium',
                  form.symptoms.includes(sym)
                    ? 'border-rose-600 bg-rose-100 text-rose-950 font-bold shadow-xs ring-1 ring-rose-500'
                    : 'border-rose-200 bg-white text-rose-900 hover:bg-rose-50'
                ]"
              >
                {{ sym }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- STEP 4: RISK MATRIX EVALUATION (INTERACTIVE 2D GRID)              -->
      <!-- ================================================================= -->
      <div v-show="currentStep === 4" class="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
        <div class="border-b border-slate-100 pb-3 text-center">
          <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">เกณฑ์มาตรฐานกรมควบคุมโรค (DDC Standards)</span>
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 mt-1">ผลการประเมินระดับความเสี่ยง (Risk Matrix)</h3>
        </div>

        <!-- Big Risk Grade Card -->
        <div :class="[
          'p-5 sm:p-6 rounded-2xl border-2 text-center space-y-2 transition',
          riskEvaluation.riskLevel === 'มีความเสี่ยงต่ำ' ? 'border-emerald-400 bg-emerald-50 text-emerald-950' :
          riskEvaluation.riskLevel === 'มีความเสี่ยงปานกลาง' ? 'border-amber-400 bg-amber-50 text-amber-950' :
          riskEvaluation.riskLevel === 'มีความเสี่ยงค่อนข้างสูง' ? 'border-orange-400 bg-orange-50 text-orange-950' :
          'border-rose-400 bg-rose-50 text-rose-950'
        ]">
          <span class="text-xs font-bold opacity-80 uppercase tracking-wide">ระดับความเสี่ยงของเกษตรกร</span>
          <h4 class="text-2xl sm:text-3xl font-black tracking-tight">
            {{ riskEvaluation.riskLevel }}
          </h4>
          <p class="text-xs max-w-md mx-auto opacity-90 leading-relaxed">
            คำนวณจากคะแนนพฤติกรรมรวม <strong>{{ totalBehaviorScore }} คะแนน</strong> 
            ร่วมกับกลุ่มอาการผิดปกติสูงสุด 
            <strong v-if="highestSymptomGroup > 0">กลุ่มที่ {{ highestSymptomGroup }}</strong>
            <strong v-else>ไม่มีอาการผิดปกติ</strong>
          </p>
        </div>

        <!-- Authentic DDC 2D Risk Matrix Visual Table -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-800">ตารางวิเคราะห์ความเสี่ยง 2 มิติ (Risk Matrix Grid)</span>
            <span class="text-[11px] text-emerald-700 font-semibold">★ ช่องที่กำลังไฮไลท์คือตำแหน่งของรายนี้</span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-center text-xs sm:text-sm border-collapse">
              <thead>
                <tr class="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th class="p-2.5 text-left border-r border-slate-200">กลุ่มอาการ \ คะแนนพฤติกรรม</th>
                  <th :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 0 ? 'bg-emerald-100 text-emerald-900 font-bold' : '']">
                    ≤ 24 คะแนน
                  </th>
                  <th :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 1 ? 'bg-amber-100 text-amber-900 font-bold' : '']">
                    25 - 30 คะแนน
                  </th>
                  <th :class="['p-2.5', riskEvaluation.scoreColumn === 2 ? 'bg-rose-100 text-rose-900 font-bold' : '']">
                    ≥ 31 คะแนน
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-xs sm:text-sm">
                <!-- Row 0: No Symptoms -->
                <tr :class="riskEvaluation.symptomRow === 0 ? 'bg-slate-50' : ''">
                  <td class="p-2.5 text-left font-medium text-slate-800 border-r border-slate-200">
                    กลุ่ม 0: ไม่มีอาการ
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 0 && riskEvaluation.symptomRow === 0 ? 'ring-2 ring-emerald-600 bg-emerald-100 font-bold text-emerald-900 rounded-md' : 'text-emerald-700']">
                    เสี่ยงต่ำ
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 1 && riskEvaluation.symptomRow === 0 ? 'ring-2 ring-amber-600 bg-amber-100 font-bold text-amber-900 rounded-md' : 'text-amber-700']">
                    เสี่ยงปานกลาง
                  </td>
                  <td :class="['p-2.5', riskEvaluation.scoreColumn === 2 && riskEvaluation.symptomRow === 0 ? 'ring-2 ring-orange-600 bg-orange-100 font-bold text-orange-900 rounded-md' : 'text-orange-700']">
                    เสี่ยงค่อนข้างสูง *
                  </td>
                </tr>

                <!-- Row 1: Group 1 -->
                <tr :class="riskEvaluation.symptomRow === 1 ? 'bg-slate-50' : ''">
                  <td class="p-2.5 text-left font-medium text-slate-800 border-r border-slate-200">
                    กลุ่ม 1: ทางเดินหายใจ/ผิวหนัง
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 0 && riskEvaluation.symptomRow === 1 ? 'ring-2 ring-amber-600 bg-amber-100 font-bold text-amber-900 rounded-md' : 'text-amber-700']">
                    เสี่ยงปานกลาง
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 1 && riskEvaluation.symptomRow === 1 ? 'ring-2 ring-orange-600 bg-orange-100 font-bold text-orange-900 rounded-md' : 'text-orange-700']">
                    เสี่ยงค่อนข้างสูง *
                  </td>
                  <td :class="['p-2.5', riskEvaluation.scoreColumn === 2 && riskEvaluation.symptomRow === 1 ? 'ring-2 ring-rose-600 bg-rose-100 font-bold text-rose-900 rounded-md' : 'text-rose-700']">
                    เสี่ยงสูง *
                  </td>
                </tr>

                <!-- Row 2: Group 2 -->
                <tr :class="riskEvaluation.symptomRow === 2 ? 'bg-slate-50' : ''">
                  <td class="p-2.5 text-left font-medium text-slate-800 border-r border-slate-200">
                    กลุ่ม 2: ประสาทส่วนปลาย/ทางเดินอาหาร
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 0 && riskEvaluation.symptomRow === 2 ? 'ring-2 ring-orange-600 bg-orange-100 font-bold text-orange-900 rounded-md' : 'text-orange-700']">
                    เสี่ยงค่อนข้างสูง *
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 1 && riskEvaluation.symptomRow === 2 ? 'ring-2 ring-rose-600 bg-rose-100 font-bold text-rose-900 rounded-md' : 'text-rose-700']">
                    เสี่ยงสูง *
                  </td>
                  <td :class="['p-2.5', riskEvaluation.scoreColumn === 2 && riskEvaluation.symptomRow === 2 ? 'ring-2 ring-rose-600 bg-rose-100 font-bold text-rose-900 rounded-md' : 'text-rose-700']">
                    เสี่ยงสูง *
                  </td>
                </tr>

                <!-- Row 3: Group 3 -->
                <tr :class="riskEvaluation.symptomRow === 3 ? 'bg-slate-50' : ''">
                  <td class="p-2.5 text-left font-medium text-slate-800 border-r border-slate-200">
                    กลุ่ม 3: ประสาทส่วนกลาง/รุนแรง
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 0 && riskEvaluation.symptomRow === 3 ? 'ring-2 ring-rose-600 bg-rose-100 font-bold text-rose-900 rounded-md' : 'text-rose-700']">
                    เสี่ยงสูง *
                  </td>
                  <td :class="['p-2.5 border-r border-slate-200', riskEvaluation.scoreColumn === 1 && riskEvaluation.symptomRow === 3 ? 'ring-2 ring-rose-600 bg-rose-100 font-bold text-rose-900 rounded-md' : 'text-rose-700']">
                    เสี่ยงสูง *
                  </td>
                  <td :class="['p-2.5', riskEvaluation.scoreColumn === 2 && riskEvaluation.symptomRow === 3 ? 'ring-2 ring-red-700 bg-red-100 font-black text-red-950 rounded-md' : 'text-red-800']">
                    เสี่ยงสูงมาก *
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[10px] text-slate-500">* หมายเหตุ: ระดับที่มีเครื่องหมายดอกจัน (*) คือกลุ่มเป้าหมายที่ต้องได้รับการเจาะเลือดคัดกรองเอนไซม์</p>
        </div>

        <!-- Action Protocol Alert Banner -->
        <div v-if="riskEvaluation.requireBloodTest" class="p-4 rounded-xl border border-rose-300 bg-rose-50 flex items-start space-x-3">
          <div class="text-rose-600 mt-0.5 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h5 class="text-xs font-bold text-rose-900">★ เกณฑ์ส่งตรวจเลือดคัดกรอง (Reactive Paper)</h5>
            <p class="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
              ผู้รับการประเมินมีความเสี่ยงค่อนข้างสูงขึ้นไป จำเป็นต้องได้รับการเจาะเลือดปลายนิ้วตรวจระดับเอนไซม์โคลีนเอสเตอเรสในขั้นตอนถัดไป (ขั้นตอนที่ 5)
            </p>
          </div>
        </div>
        <div v-else class="p-4 rounded-xl border border-emerald-300 bg-emerald-50 flex items-start space-x-3">
          <div class="text-emerald-600 mt-0.5 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h5 class="text-xs font-bold text-emerald-900">ข้อแนะนำการดูแลสุขภาพ</h5>
            <p class="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              ระดับความเสี่ยงยังไม่ถึงเกณฑ์ที่ต้องเจาะเลือด แนะนำให้อบรมปรับพฤติกรรม สวมใส่อุปกรณ์ PPE อย่างสม่ำเสมอ และตรวจคัดกรองติดตามเป็นประจำทุกปี
            </p>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- STEP 5: BLOOD SCREENING (CHOLINESTERASE REACTIVE PAPER)           -->
      <!-- ================================================================= -->
      <div v-show="currentStep === 5" class="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
        <div class="border-b border-slate-100 pb-3">
          <h3 class="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 5: บันทึกผลตรวจเอนไซม์โคลีนเอสเตอเรสในเลือด</h3>
          <p class="text-xs text-slate-500 mt-0.5">การตรวจคัดกรองด้วยกระดาษทดสอบ Reactive Paper และสารเคมีที่ใช้</p>
        </div>

        <!-- Chemicals Used Section -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-800">
            สารเคมีกำจัดศัตรูพืชที่ใช้บ่อย (คลิกเลือก หรือพิมพ์แล้วกด Enter)
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button 
              v-for="c in quickChemicals" 
              :key="c"
              type="button" 
              @click="addChemicalTag(c)"
              class="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs transition"
            >
              + {{ c }}
            </button>
          </div>

          <!-- Active Chemical Chips -->
          <div v-if="form.chemical_names.length > 0" class="flex flex-wrap gap-1.5 pt-1">
            <span 
              v-for="c in form.chemical_names" 
              :key="c"
              class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-900 border border-emerald-200"
            >
              <span>{{ c }}</span>
              <button type="button" @click="removeChemicalTag(c)" class="text-emerald-700 hover:text-emerald-900 font-bold ml-1">
                ×
              </button>
            </span>
          </div>

          <input 
            type="text" 
            v-model="chemicalInputText" 
            @keydown="handleChemicalKeydown"
            placeholder="พิมพ์ชื่อสารเคมีเพิ่มเติม เช่น คลอร์ไพริฟอส แล้วกด Enter..." 
            class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
        </div>

        <!-- Reactive Paper Blood Result Authentic Swatch Cards -->
        <div class="space-y-2 pt-2 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-slate-800">
              ผลการตรวจระดับเอนไซม์ด้วยกระดาษทดสอบ (Reactive Paper) <span class="text-rose-500">*</span>
            </label>
            <span class="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              ตรวจครั้งแรก / เจาะซ้ำ
            </span>
          </div>
          <p class="text-[11px] text-slate-500">
            เกษตรกรที่มีผลตรวจครั้งแรกเป็น "เสี่ยง" หรือ "ไม่ปลอดภัย" ต้องได้รับการเจาะเลือดซ้ำและติดตามผลอย่างต่อเนื่อง
          </p>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div 
              v-for="item in [
                { 
                  val: 'ปกติ', 
                  sub: 'สีส้มเหลือง', 
                  colorHex: '#f59e0b', 
                  activeBorder: 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400' 
                },
                { 
                  val: 'ปลอดภัย', 
                  sub: 'สีเหลืองเขียว', 
                  colorHex: '#84cc16', 
                  activeBorder: 'border-lime-600 bg-lime-50/80 text-lime-950 ring-2 ring-lime-500' 
                },
                { 
                  val: 'มีความเสี่ยง', 
                  sub: 'สีเขียวเหลือง / นัดเจาะซ้ำ', 
                  colorHex: '#10b981', 
                  activeBorder: 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500' 
                },
                { 
                  val: 'ไม่ปลอดภัย', 
                  sub: 'สีเขียวขี้ม้า / พบแพทย์ทันที', 
                  colorHex: '#1e3a24', 
                  activeBorder: 'border-rose-600 bg-rose-50/80 text-rose-950 ring-2 ring-rose-500' 
                }
              ]" 
              :key="item.val"
              @click="form.cholinesterase_result = item.val"
              :class="[
                'p-3.5 rounded-xl border text-center cursor-pointer transition select-none flex flex-col items-center justify-center space-y-1.5',
                form.cholinesterase_result === item.val
                  ? `${item.activeBorder} font-bold shadow-xs`
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              ]"
            >
              <!-- Authentic Color Strip Swatch Indicator -->
              <span 
                class="w-6 h-6 rounded-full border-2 border-white shadow-xs" 
                :style="{ backgroundColor: item.colorHex }"
              ></span>
              <span class="block text-sm sm:text-base font-bold">{{ item.val }}</span>
              <span class="block text-[10px] opacity-80">{{ item.sub }}</span>
            </div>
          </div>

          <!-- Dynamic Medical Referral & Repeat Screening Guidance -->
          <div v-if="form.cholinesterase_result === 'มีความเสี่ยง'" class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <svg class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <span class="font-bold">แนวทางปฏิบัติสำหรับผล "มีความเสี่ยง":</span>
              <p class="text-[11px] text-amber-800 mt-0.5">
                • นัดหมายเจาะเลือดตรวจซ้ำ (Repeat Test) ภายใน 2-4 สัปดาห์<br>
                • เจ้าหน้าที่ รพ.สต. ให้คำปรึกษาปรับเปลี่ยนพฤติกรรมการใช้สารเคมีและแนะนำอุปกรณ์ป้องกัน PPE
              </p>
            </div>
          </div>

          <div v-else-if="form.cholinesterase_result === 'ไม่ปลอดภัย'" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start space-x-2">
            <svg class="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <span class="font-bold">แนวทางปฏิบัติเร่งด่วนสำหรับผล "ไม่ปลอดภัย":</span>
              <p class="text-[11px] text-rose-800 mt-0.5">
                • <strong>สั่งหยุดสัมผัสสารเคมีกำจัดศัตรูพืชทุกชนิดทันที</strong><br>
                • ส่งต่อพบแพทย์ รพ. เพื่อวินิจฉัย ซักประวัติอาการพิษ และตรวจระดับเอนไซม์ซ้ำทางห้องปฏิบัติการ<br>
                • ติดตามอาการผิดปกติอย่างใกล้ชิด
              </p>
            </div>
          </div>

          <div v-else class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2">
            <svg class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <span class="font-bold">แนวทางปฏิบัติสำหรับผล "ปกติ / ปลอดภัย":</span>
              <p class="text-[11px] text-emerald-800 mt-0.5">
                • ไม่ต้องเจาะเลือดซ้ำ<br>
                • แนะนำให้อบรมพัฒนาความรู้ สวมใส่อุปกรณ์คุ้มครองความปลอดภัยต่อเนื่อง และนัดตรวจคัดกรองประจำปีถัดไป
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Wizard Action Bar (Properly spaced so it never collides on mobile) -->
      <div class="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between space-x-3">
        <button 
          type="button" 
          v-if="currentStep > 1"
          @click="prevStep" 
          class="px-6 py-3 border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span>ย้อนกลับ</span>
        </button>
        <div v-else></div>

        <div class="text-xs font-semibold text-slate-500">
          ขั้นตอนที่ {{ currentStep }} จาก 5
        </div>

        <button 
          type="button" 
          v-if="currentStep < 5"
          @click="nextStep" 
          class="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm sm:text-base font-bold transition shadow-sm ring-1 ring-emerald-700/30 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <span>ถัดไป</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <button 
          type="submit" 
          v-else
          :disabled="isSubmitting"
          class="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm sm:text-base font-bold transition shadow-sm ring-1 ring-emerald-800/30 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>{{ isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกแบบประเมินสมบูรณ์' }}</span>
        </button>
      </div>
    </form>

    <!-- Mobile Thumb-Friendly Fixed Bottom Bar -->
    <div class="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 z-40 flex items-center justify-between shadow-lg">
      <button 
        type="button" 
        v-if="currentStep > 1"
        @click="prevStep" 
        class="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white active:bg-slate-100 flex items-center space-x-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        <span>ย้อนกลับ</span>
      </button>
      <div v-else class="w-16"></div>

      <div class="text-[11px] font-bold text-slate-700">
        ขั้นตอนที่ {{ currentStep }}/5
      </div>

      <button 
        type="button" 
        v-if="currentStep < 5"
        @click="nextStep" 
        class="px-5 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1"
      >
        <span>ถัดไป</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
      <button 
        type="button" 
        v-else
        @click="submitForm"
        :disabled="isSubmitting"
        class="px-5 py-2.5 bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1"
      >
        <span>{{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
      </button>
    </div>

    <!-- Confirmation Modal for Predefined Low Risk Answer Set -->
    <div 
      v-if="isPredefinedModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn"
      v-modal-focus="() => { isPredefinedModalOpen = false }"
      @click.self="isPredefinedModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg flex-shrink-0">
            ⚠️
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">ยืนยันการใช้ชุดคำตอบเริ่มต้น</h3>
            <p class="text-xs text-slate-500">แบบประเมินพฤติกรรมความเสี่ยง นบก. 1-56</p>
          </div>
        </div>

        <div class="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
          <p class="font-semibold leading-relaxed">
            ระบบจะกรอกคำตอบเริ่มต้นในตอนที่ 2 ให้โดยอัตโนมัติ:
          </p>
          <ul class="list-disc list-inside space-y-1 text-[11px] text-amber-900 pl-1">
            <li>พฤติกรรมเสี่ยง (ข้อ 9 - 17): ปรับเป็น <strong>"ไม่ใช่" (1 คะแนน)</strong></li>
            <li>พฤติกรรมป้องกัน (ข้อ 18 - 23): ปรับเป็น <strong>"ปฏิบัติทุกครั้ง" (1 คะแนน)</strong></li>
          </ul>
          <p class="text-[11px] text-amber-950 pt-1 font-bold">
            ⚠️ คำเตือน: เจ้าหน้าที่ต้องซักถามและทวนคำตอบร่วมกับเกษตรกรทีละข้อก่อนบันทึกข้อมูล ห้ามใช้เป็นข้ออ้างในการบันทึกข้อมูลโดยไม่ตรวจสอบ
          </p>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button 
            type="button" 
            @click="isPredefinedModalOpen = false"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            @click="confirmApplyPredefinedPreset"
            class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            ยืนยันและตรวจสอบคำตอบ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
