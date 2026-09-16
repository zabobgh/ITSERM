import type {
  Farmer,
  AssessmentSubmission,
  AssessmentRecord,
  DashboardStats,
  ReportOCC01,
  ReportOCC02,
  FollowUpRecord
} from '../types'

const STORAGE_KEY_RECORDS = 'nbk_records_demo_v1'
const STORAGE_KEY_FARMERS = 'nbk_farmers_demo_v1'
const STORAGE_KEY_FOLLOWUPS = 'nbk_followups_demo_v1'

const INITIAL_SEED_FOLLOWUPS: FollowUpRecord[] = [
  {
    id: 'fu-1',
    citizen_id: '3740100234567',
    assessment_id: 'demo-1',
    follow_up_date: '2026-09-24',
    responsible_person: 'พว. นงลักษณ์ สุขสมบูรณ์',
    follow_up_type: 'นัดตรวจเลือดซ้ำ 2-4 สัปดาห์',
    result: 'ยังมีความเสี่ยง/รอผลตรวจ',
    notes: 'ผลตรวจเลือด Reactive ไม่ปลอดภัย ให้หยุดฉีดพ่นชั่วคราวและนัดตรวจซ้ำอีก 2 สัปดาห์',
    created_at: '2026-09-10T11:00:00Z'
  },
  {
    id: 'fu-2',
    citizen_id: '1749900345678',
    assessment_id: 'demo-2',
    follow_up_date: '2026-09-18',
    responsible_person: 'นวก. ธนพล มิ่งขวัญ',
    follow_up_type: 'ติดตามการสวมใส่อุปกรณ์ PPE',
    result: 'ปกติ/ปลอดภัยแล้ว',
    notes: 'ลงพื้นที่ตรวจเยี่ยม พบว่ามีการสวมหน้ากากคาร์บอนและถุงมือยางถูกต้อง แนะนำล้างมือทันทีหลังฉีดพ่น',
    created_at: '2026-09-12T14:30:00Z'
  }
]

// Pre-seeded clinical records for instant wow factor on GitHub Pages Demo
const INITIAL_SEED_RECORDS: AssessmentRecord[] = [
  {
    id: 'demo-1',
    citizen_id: '3740100234567',
    fullname: 'นายสมศักดิ์ ขยันงาน',
    gender: 'ชาย',
    age: 48,
    address: '14/2 หมู่ 3 ต.บ้านแพ้ว อ.บ้านแพ้ว จ.สมุทรสาคร',
    occupation: '1. เพาะปลูก (ทำเอง)',
    plant_type: 'ทำสวน (ผลไม้/ทุเรียน/ส้ม/มะนาว)',
    eval_date: '2026-09-10',
    interviewer_name: 'พว. นงลักษณ์ สุขสมบูรณ์',
    health_center: 'รพ.สต.หลักสาม',
    score_a: 24,
    score_b: 15,
    total_score: 39,
    highest_symptom_group: 3,
    symptoms: ['เวียนศีรษะ', 'ปวดศีรษะ', 'มือสั่น', 'กล้ามเนื้อเกร็ง'],
    risk_level: 'มีความเสี่ยงสูงมาก',
    require_blood_test: true,
    cholinesterase_result: 'ไม่ปลอดภัย',
    chemical_names: ['คลอร์ไพริฟอส', 'อะบาเมกติน', 'คาร์โบซัลแฟน'],
    answers_a: { q9: 3, q10: 3, q11: 3, q12: 3, q13: 3, q14: 3, q15: 2, q16: 2, q17: 2 },
    answers_b: { q18: 3, q19: 2, q20: 3, q21: 2, q22: 3, q23: 2 },
    created_at: '2026-09-10T09:30:00Z'
  },
  {
    id: 'demo-2',
    citizen_id: '1749900345678',
    fullname: 'นางกัลยา เกษตรดี',
    gender: 'หญิง',
    age: 52,
    address: '88 หมู่ 5 ต.หลักสอง อ.บ้านแพ้ว จ.สมุทรสาคร',
    occupation: '2. เพาะปลูก (รับจ้าง)',
    plant_type: 'ทำสวน (พืชผัก/พริก/มะเขือ/ผักกาด)',
    eval_date: '2026-09-11',
    interviewer_name: 'นวก. ธนพล มิ่งขวัญ',
    health_center: 'รพ.สต.หลักสอง',
    score_a: 18,
    score_b: 14,
    total_score: 32,
    highest_symptom_group: 2,
    symptoms: ['แสบจมูก', 'ผื่นคัน/ตุ่มพุพอง', 'คลื่นไส้ อาเจียน'],
    risk_level: 'มีความเสี่ยงสูง',
    require_blood_test: true,
    cholinesterase_result: 'มีความเสี่ยง',
    chemical_names: ['ไซเพอร์เมทริน', 'ไกลโฟเสต'],
    answers_a: { q9: 2, q10: 3, q11: 2, q12: 2, q13: 2, q14: 2, q15: 1, q16: 2, q17: 2 },
    answers_b: { q18: 2, q19: 3, q20: 2, q21: 2, q22: 3, q23: 2 },
    created_at: '2026-09-11T10:15:00Z'
  },
  {
    id: 'demo-3',
    citizen_id: '3740200876543',
    fullname: 'นายประสิทธิ์ พืชผลเจริญ',
    gender: 'ชาย',
    age: 60,
    address: '5/1 หมู่ 1 ต.เกษตรพัฒนา อ.บ้านแพ้ว จ.สมุทรสาคร',
    occupation: '3. รับจ้างฉีดพ่น',
    plant_type: 'ทำสวน (กล้วยไม้/ไม้ดอกไม้ประดับ)',
    eval_date: '2026-09-12',
    interviewer_name: 'พว. นงลักษณ์ สุขสมบูรณ์',
    health_center: 'รพ.สต.ตำบลเกษตรพัฒนา',
    score_a: 16,
    score_b: 11,
    total_score: 27,
    highest_symptom_group: 1,
    symptoms: ['ตาแดง/แสบตา/คันตา', 'น้ำมูกไหล'],
    risk_level: 'มีความเสี่ยงค่อนข้างสูง',
    require_blood_test: true,
    cholinesterase_result: 'มีความเสี่ยง',
    chemical_names: ['พาราควอต', 'อะบาเมกติน'],
    answers_a: { q9: 2, q10: 2, q11: 2, q12: 2, q13: 2, q14: 2, q15: 1, q16: 2, q17: 1 },
    answers_b: { q18: 2, q19: 2, q20: 2, q21: 2, q22: 2, q23: 1 },
    created_at: '2026-09-12T11:00:00Z'
  },
  {
    id: 'demo-4',
    citizen_id: '5740300123987',
    fullname: 'นายสมพร ปลอดสาร',
    gender: 'ชาย',
    age: 41,
    address: '99/4 หมู่ 2 ต.อำแพง อ.บ้านแพ้ว จ.สมุทรสาคร',
    occupation: '1. เพาะปลูก (ทำเอง)',
    plant_type: 'ทำนา (ข้าว)',
    eval_date: '2026-09-14',
    interviewer_name: 'นวก. ธนพล มิ่งขวัญ',
    health_center: 'รพ.สต.บ้านทำนบแพ้ว',
    score_a: 10,
    score_b: 7,
    total_score: 17,
    highest_symptom_group: 0,
    symptoms: [],
    risk_level: 'มีความเสี่ยงต่ำ',
    require_blood_test: false,
    cholinesterase_result: 'ปลอดภัย',
    chemical_names: [],
    answers_a: { q9: 1, q10: 1, q11: 1, q12: 1, q13: 1, q14: 1, q15: 1, q16: 2, q17: 1 },
    answers_b: { q18: 1, q19: 1, q20: 1, q21: 1, q22: 2, q23: 1 },
    created_at: '2026-09-14T08:45:00Z'
  },
  {
    id: 'demo-5',
    citizen_id: '3740500987123',
    fullname: 'นางปราณี มีสุข',
    gender: 'หญิง',
    age: 46,
    address: '23 หมู่ 4 ต.ยกกระบัตร อ.บ้านแพ้ว จ.สมุทรสาคร',
    occupation: '1. เพาะปลูก (ทำเอง)',
    plant_type: 'ทำสวน (ผลไม้/ทุเรียน/ส้ม/มะนาว)',
    eval_date: '2026-09-15',
    interviewer_name: 'พว. นงลักษณ์ สุขสมบูรณ์',
    health_center: 'โรงพยาบาลบ้านแพ้ว',
    score_a: 11,
    score_b: 8,
    total_score: 19,
    highest_symptom_group: 0,
    symptoms: [],
    risk_level: 'มีความเสี่ยงต่ำ',
    require_blood_test: false,
    cholinesterase_result: 'ปกติ',
    chemical_names: [],
    answers_a: { q9: 1, q10: 1, q11: 1, q12: 1, q13: 1, q14: 1, q15: 1, q16: 2, q17: 2 },
    answers_b: { q18: 1, q19: 1, q20: 1, q21: 2, q22: 2, q23: 1 },
    created_at: '2026-09-15T13:20:00Z'
  }
]

// Initialize LocalStorage with seed data if not present
function getStoredRecords(): AssessmentRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY_RECORDS)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_SEED_RECORDS))
    return INITIAL_SEED_RECORDS
  }
  try {
    return JSON.parse(raw)
  } catch {
    return INITIAL_SEED_RECORDS
  }
}

function saveStoredRecords(records: AssessmentRecord[]) {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records))
}

function getStoredFarmers(): Farmer[] {
  const raw = localStorage.getItem(STORAGE_KEY_FARMERS)
  if (!raw) {
    const seedFarmers: Farmer[] = INITIAL_SEED_RECORDS.map(r => ({
      citizen_id: r.citizen_id,
      fullname: r.fullname,
      gender: r.gender,
      age: r.age,
      address: r.address,
      occupation: r.occupation,
      plant_type: r.plant_type,
      created_at: r.created_at,
      updated_at: r.created_at
    }))
    localStorage.setItem(STORAGE_KEY_FARMERS, JSON.stringify(seedFarmers))
    return seedFarmers
  }
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveStoredFarmers(farmers: Farmer[]) {
  localStorage.setItem(STORAGE_KEY_FARMERS, JSON.stringify(farmers))
}

function getStoredFollowUps(): FollowUpRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY_FOLLOWUPS)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_FOLLOWUPS, JSON.stringify(INITIAL_SEED_FOLLOWUPS))
    return INITIAL_SEED_FOLLOWUPS
  }
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveStoredFollowUps(followUps: FollowUpRecord[]) {
  localStorage.setItem(STORAGE_KEY_FOLLOWUPS, JSON.stringify(followUps))
}

export function resetDemoData() {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_SEED_RECORDS))
  const seedFarmers: Farmer[] = INITIAL_SEED_RECORDS.map(r => ({
    citizen_id: r.citizen_id,
    fullname: r.fullname,
    gender: r.gender,
    age: r.age,
    address: r.address,
    occupation: r.occupation,
    plant_type: r.plant_type,
    created_at: r.created_at,
    updated_at: r.created_at
  }))
  localStorage.setItem(STORAGE_KEY_FARMERS, JSON.stringify(seedFarmers))
  localStorage.setItem(STORAGE_KEY_FOLLOWUPS, JSON.stringify(INITIAL_SEED_FOLLOWUPS))
}

// Symptom catalog for risk calculation
export const symptomsCatalog = {
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

export function calculateRisk(scoreA: number, scoreB: number, symptoms: string[]) {
  const tot = scoreA + scoreB
  let highest = 0
  for (const s of symptoms || []) {
    if (symptomsCatalog.g3.includes(s)) highest = 3
    else if (symptomsCatalog.g2.includes(s) && highest < 2) highest = 2
    else if (symptomsCatalog.g1.includes(s) && highest < 1) highest = 1
  }

  let level = 'มีความเสี่ยงต่ำ'
  if (tot <= 24) {
    if (highest === 0) level = 'มีความเสี่ยงต่ำ'
    else if (highest === 1) level = 'มีความเสี่ยงปานกลาง'
    else if (highest === 2) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (highest === 3) level = 'มีความเสี่ยงสูง'
  } else if (tot <= 30) {
    if (highest === 0) level = 'มีความเสี่ยงปานกลาง'
    else if (highest === 1) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (highest === 2) level = 'มีความเสี่ยงสูง'
    else if (highest === 3) level = 'มีความเสี่ยงสูง'
  } else {
    if (highest === 0) level = 'มีความเสี่ยงค่อนข้างสูง'
    else if (highest === 1) level = 'มีความเสี่ยงสูง'
    else if (highest === 2) level = 'มีความเสี่ยงสูง'
    else if (highest === 3) level = 'มีความเสี่ยงสูงมาก'
  }

  const requireBlood = (level === 'มีความเสี่ยงค่อนข้างสูง' || level === 'มีความเสี่ยงสูง' || level === 'มีความเสี่ยงสูงมาก')
  return { scoreA, scoreB, tot, highest, level, requireBlood }
}

function validateScoredAnswers(submission: AssessmentSubmission) {
  if (Object.keys(submission.answers_a || {}).length !== 9 || Object.keys(submission.answers_b || {}).length !== 6) {
    throw new Error('กรุณาตอบคำถามพฤติกรรมให้ครบ 15 ข้อ')
  }
  for (let q = 9; q <= 23; q++) {
    const value = (q <= 17 ? submission.answers_a : submission.answers_b)['q' + q]
    if (!Number.isInteger(value) || value < 1 || value > 3) throw new Error('คะแนนต้องอยู่ระหว่าง 1 ถึง 3')
  }
}

// LocalStorage implementations
export const localApi = {
  fetchFarmer(citizenId: string): Promise<Farmer | null> {
    const farmers = getStoredFarmers()
    const found = farmers.find(f => f.citizen_id === citizenId.trim())
    return Promise.resolve(found || null)
  },

  createAssessment(submission: AssessmentSubmission): Promise<AssessmentRecord> {
    validateScoredAnswers(submission)
    const records = getStoredRecords()
    const farmers = getStoredFarmers()

    const scoreA = Object.values(submission.answers_a || {}).reduce((a, b) => a + (b || 0), 0)
    const scoreB = Object.values(submission.answers_b || {}).reduce((a, b) => a + (b || 0), 0)
    const { tot, highest, level, requireBlood } = calculateRisk(scoreA, scoreB, submission.symptoms)

    const newRecord: AssessmentRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      citizen_id: submission.citizen_id.trim(),
      fullname: submission.fullname.trim(),
      gender: submission.gender,
      age: submission.age,
      address: submission.address,
      occupation: submission.occupation,
      plant_type: submission.plant_type,
      eval_date: submission.eval_date || new Date().toISOString().slice(0, 10),
      interviewer_name: submission.interviewer_name || 'เจ้าหน้าที่สาธารณสุข',
      health_center: submission.health_center || 'รพ.สต.หลักสาม',
      score_a: scoreA,
      score_b: scoreB,
      total_score: tot,
      highest_symptom_group: highest,
      symptoms: submission.symptoms || [],
      risk_level: level,
      require_blood_test: requireBlood,
      cholinesterase_result: submission.cholinesterase_result || '',
      chemical_names: submission.chemical_names || [],
      answers_a: submission.answers_a,
      answers_b: submission.answers_b,
      created_at: new Date().toISOString()
    }

    records.unshift(newRecord)
    saveStoredRecords(records)

    // Upsert farmer registry
    const fIdx = farmers.findIndex(f => f.citizen_id === newRecord.citizen_id)
    const farmerData: Farmer = {
      citizen_id: newRecord.citizen_id,
      fullname: newRecord.fullname,
      gender: newRecord.gender,
      age: newRecord.age,
      address: newRecord.address,
      occupation: newRecord.occupation,
      plant_type: newRecord.plant_type,
      created_at: fIdx >= 0 ? farmers[fIdx].created_at : newRecord.created_at,
      updated_at: new Date().toISOString()
    }
    if (fIdx >= 0) {
      farmers[fIdx] = farmerData
    } else {
      farmers.unshift(farmerData)
    }
    saveStoredFarmers(farmers)

    return Promise.resolve(newRecord)
  },

  fetchAssessments(search?: string, riskLevel?: string): Promise<AssessmentRecord[]> {
    let records = getStoredRecords()
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      records = records.filter(r => 
        r.fullname.toLowerCase().includes(q) || 
        r.citizen_id.includes(q) || 
        r.address.toLowerCase().includes(q)
      )
    }
    if (riskLevel && riskLevel !== 'ALL') {
      records = records.filter(r => r.risk_level === riskLevel)
    }
    return Promise.resolve(records)
  },

  fetchAssessmentById(id: string): Promise<AssessmentRecord> {
    const records = getStoredRecords()
    const found = records.find(r => r.id === id)
    if (!found) return Promise.reject(new Error('ไม่พบข้อมูลแบบประเมิน'))
    return Promise.resolve(found)
  },

  updateAssessment(id: string, submission: AssessmentSubmission): Promise<AssessmentRecord> {
    validateScoredAnswers(submission)
    const records = getStoredRecords()
    const idx = records.findIndex(r => r.id === id)
    if (idx === -1) return Promise.reject(new Error('ไม่พบข้อมูลแบบประเมินที่ต้องการแก้ไข'))

    const scoreA = Object.values(submission.answers_a || {}).reduce((a, b) => a + (b || 0), 0)
    const scoreB = Object.values(submission.answers_b || {}).reduce((a, b) => a + (b || 0), 0)
    const { tot, highest, level, requireBlood } = calculateRisk(scoreA, scoreB, submission.symptoms)

    const updatedRecord: AssessmentRecord = {
      ...records[idx],
      citizen_id: submission.citizen_id,
      fullname: submission.fullname,
      gender: submission.gender,
      age: submission.age,
      address: submission.address,
      occupation: submission.occupation,
      plant_type: submission.plant_type,
      eval_date: submission.eval_date || records[idx].eval_date,
      interviewer_name: submission.interviewer_name || records[idx].interviewer_name,
      health_center: submission.health_center || records[idx].health_center,
      score_a: scoreA,
      score_b: scoreB,
      total_score: tot,
      highest_symptom_group: highest,
      symptoms: submission.symptoms || [],
      risk_level: level,
      require_blood_test: requireBlood,
      cholinesterase_result: submission.cholinesterase_result ?? records[idx].cholinesterase_result,
      chemical_names: submission.chemical_names || [],
      answers_a: submission.answers_a,
      answers_b: submission.answers_b
    }

    records[idx] = updatedRecord
    saveStoredRecords(records)

    const farmers = getStoredFarmers()
    const fIdx = farmers.findIndex(f => f.citizen_id === updatedRecord.citizen_id)
    if (fIdx >= 0) {
      farmers[fIdx] = {
        ...farmers[fIdx],
        fullname: updatedRecord.fullname,
        gender: updatedRecord.gender,
        age: updatedRecord.age,
        address: updatedRecord.address,
        occupation: updatedRecord.occupation,
        plant_type: updatedRecord.plant_type,
        updated_at: new Date().toISOString()
      }
      saveStoredFarmers(farmers)
    }

    return Promise.resolve(updatedRecord)
  },

  deleteAssessment(id: string): Promise<void> {
    let records = getStoredRecords()
    records = records.filter(r => r.id !== id)
    saveStoredRecords(records)
    return Promise.resolve()
  },

  fetchDashboardStats(): Promise<DashboardStats> {
    const records = getStoredRecords()
    const riskDist: Record<string, number> = {
      'มีความเสี่ยงต่ำ': 0,
      'มีความเสี่ยงปานกลาง': 0,
      'มีความเสี่ยงค่อนข้างสูง': 0,
      'มีความเสี่ยงสูง': 0,
      'มีความเสี่ยงสูงมาก': 0
    }
    const bloodDist: Record<string, number> = {
      'ปกติ': 0,
      'ปลอดภัย': 0,
      'มีความเสี่ยง': 0,
      'ไม่ปลอดภัย': 0
    }

    let highRiskCount = 0
    let testedBloodCount = 0
    let unsafeBloodCount = 0

    records.forEach(r => {
      if (riskDist[r.risk_level] !== undefined) {
        riskDist[r.risk_level]++
      }
      if (
        r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' || 
        r.risk_level === 'มีความเสี่ยงสูง' || 
        r.risk_level === 'มีความเสี่ยงสูงมาก'
      ) {
        highRiskCount++
      }

      if (['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)) {
        testedBloodCount++
        if (bloodDist[r.cholinesterase_result] !== undefined) {
          bloodDist[r.cholinesterase_result]++
        }
        if (r.cholinesterase_result === 'มีความเสี่ยง' || r.cholinesterase_result === 'ไม่ปลอดภัย') {
          unsafeBloodCount++
        }
      }
    })

    const priorityCases = records
      .filter(r => r.risk_level === 'มีความเสี่ยงสูงมาก' || r.risk_level === 'มีความเสี่ยงสูง' || r.cholinesterase_result === 'ไม่ปลอดภัย')
      .slice(0, 5)

    const stats: DashboardStats = {
      total_farmers: records.length,
      high_risk_farmers: highRiskCount,
      tested_blood: testedBloodCount,
      unsafe_blood: unsafeBloodCount,
      risk_distribution: riskDist,
      blood_distribution: bloodDist,
      recent_priority_cases: priorityCases
    }

    return Promise.resolve(stats)
  },

  fetchReportOCC01(healthCenter = 'รพ.สต. บ้านคลองสวน', fiscalYear = '2569'): Promise<ReportOCC01> {
    const records = getStoredRecords()
    const highRisk = records.filter(r => 
      r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' || 
      r.risk_level === 'มีความเสี่ยงสูง' || 
      r.risk_level === 'มีความเสี่ยงสูงมาก'
    ).length
    const tested = records.filter(r => ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)).length
    const unsafe = records.filter(r => r.cholinesterase_result === 'มีความเสี่ยง' || r.cholinesterase_result === 'ไม่ปลอดภัย').length

    return Promise.resolve({
      health_center: healthCenter,
      fiscal_year: fiscalYear,
      total_evaluated: records.length,
      high_risk_evaluated: highRisk,
      total_blood_tested: tested,
      unsafe_blood_count: unsafe,
      total_advised: records.length
    })
  },

  fetchReportOCC02(province = 'สมุทรสาคร', fiscalYear = '2569'): Promise<ReportOCC02> {
    const records = getStoredRecords()
    const highRisk = records.filter(r => 
      r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' || 
      r.risk_level === 'มีความเสี่ยงสูง' || 
      r.risk_level === 'มีความเสี่ยงสูงมาก'
    ).length
    const target = highRisk
    const tested = records.filter(r => ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)).length

    return Promise.resolve({
      province,
      fiscal_year: fiscalYear,
      total_high_risk_cumulative: highRisk,
      total_screened_target: target,
      blood_testing_coverage: highRisk > 0 ? Math.min(100, Math.round((tested / highRisk) * 100)) : 0
    })
  },

  fetchFollowUps(citizenId?: string): Promise<FollowUpRecord[]> {
    const list = getStoredFollowUps().sort((a, b) =>
      b.follow_up_date.localeCompare(a.follow_up_date) || b.created_at.localeCompare(a.created_at))
    if (!citizenId) return Promise.resolve(list)
    return Promise.resolve(list.filter(f => f.citizen_id === citizenId))
  },

  createFollowUp(data: Omit<FollowUpRecord, 'id' | 'created_at'>): Promise<FollowUpRecord> {
    const assessment = getStoredRecords().find(r => r.id === data.assessment_id)
    if (!assessment || assessment.citizen_id !== data.citizen_id) {
      return Promise.reject(new Error('แบบประเมินไม่ตรงกับเกษตรกรที่ระบุ'))
    }
    const list = getStoredFollowUps()
    const newRecord: FollowUpRecord = {
      ...data,
      id: `fu-${crypto.randomUUID()}`,
      created_at: new Date().toISOString()
    }
    list.unshift(newRecord)
    saveStoredFollowUps(list)
    return Promise.resolve(newRecord)
  },

  deleteFollowUp(id: string): Promise<void> {
    const list = getStoredFollowUps().filter(f => f.id !== id)
    saveStoredFollowUps(list)
    return Promise.resolve()
  }
}

// Auto-detection: True if running on GitHub Pages (github.io) or static file preview
export function isStaticDemoEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return (
    host.includes('github.io') ||
    host.includes('netlify.app') ||
    host.includes('vercel.app') ||
    window.location.protocol === 'file:' ||
    localStorage.getItem('force_demo_mode') === 'true'
  )
}
