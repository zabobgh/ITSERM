<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { AssessmentRecord, ReportOCC01, ReportOCC02, OCC01DetailedStats, CenterBreakdownItem } from '../../types'
import { fetchAssessments, fetchReportOCC01, fetchReportOCC02 } from '../../services/api'
import { HEALTH_CENTERS } from '../../constants/healthCenters'
import Occ01ReportView from './Occ01ReportView.vue'
import Occ02ReportView from './Occ02ReportView.vue'

const props = defineProps<{
  active: boolean
}>()

const activeReport = ref<'01' | '02'>('01')
const loading = ref(false)
const reportingPeriod = ref<'6month' | '12month'>('12month')
const fiscalYear = ref('2569')
const selectedCenter = ref('รพ.สต.หลักสาม')
const provinceName = ref('สมุทรสาคร')

const records = ref<AssessmentRecord[]>([])
const occ01 = ref<ReportOCC01>({
  health_center: 'รพ.สต.หลักสาม',
  fiscal_year: '2569',
  total_evaluated: 0,
  high_risk_evaluated: 0,
  total_blood_tested: 0,
  unsafe_blood_count: 0,
  total_advised: 0
})

const occ02 = ref<ReportOCC02>({
  province: 'สมุทรสาคร',
  fiscal_year: '2569',
  total_high_risk_cumulative: 0,
  total_screened_target: 0,
  blood_testing_coverage: 100
})

const occ01ViewRef = ref<InstanceType<typeof Occ01ReportView> | null>(null)
const occ02ViewRef = ref<InstanceType<typeof Occ02ReportView> | null>(null)

// Filter records belonging to selected center
const centerRecords = computed(() => {
  if (selectedCenter.value === 'ALL') return records.value
  return records.value.filter(r => r.health_center === selectedCenter.value)
})

// Detailed Computed Government Metrics for OCC-นบ 01
const occ01Stats = computed<OCC01DetailedStats>(() => {
  const list = centerRecords.value
  const total = list.length

  // Risk Breakdown
  const lowRisk = list.filter(r => r.risk_level === 'มีความเสี่ยงต่ำ').length
  const medRisk = list.filter(r => r.risk_level === 'มีความเสี่ยงปานกลาง').length
  const highRisk = list.filter(r => r.risk_level === 'มีความเสี่ยงค่อนข้างสูง').length
  const veryHighRisk = list.filter(r => r.risk_level === 'มีความเสี่ยงสูง' || r.risk_level === 'มีความเสี่ยงสูงมาก').length
  const totalHighGroup = highRisk + veryHighRisk

  // Blood Test Breakdown
  const bloodTested = list.filter(r => Boolean(r.cholinesterase_result)).length
  const normal = list.filter(r => r.cholinesterase_result === 'ปกติ').length
  const safe = list.filter(r => r.cholinesterase_result === 'ปลอดภัย').length
  const atRisk = list.filter(r => r.cholinesterase_result === 'มีความเสี่ยง').length
  const unsafe = list.filter(r => r.cholinesterase_result === 'ไม่ปลอดภัย').length
  const abnormalBlood = atRisk + unsafe

  // Follow-up
  const referred = unsafe // Unsafe must be referred to hospital
  const retestNeeded = atRisk // Risk need re-test in 2-4 weeks
  const advised = total // All get occupational counseling

  const calcPct = (cnt: number, base: number) => {
    if (!base) return '0.0%'
    return `${((cnt / base) * 100).toFixed(1)}%`
  }

  return {
    total,
    lowRisk,
    lowRiskPct: calcPct(lowRisk, total),
    medRisk,
    medRiskPct: calcPct(medRisk, total),
    highRisk,
    highRiskPct: calcPct(highRisk, total),
    veryHighRisk,
    veryHighRiskPct: calcPct(veryHighRisk, total),
    totalHighGroup,
    totalHighGroupPct: calcPct(totalHighGroup, total),

    bloodTested,
    bloodTestedPct: calcPct(bloodTested, total),
    normal,
    normalPct: calcPct(normal, bloodTested),
    safe,
    safePct: calcPct(safe, bloodTested),
    atRisk,
    atRiskPct: calcPct(atRisk, bloodTested),
    unsafe,
    unsafePct: calcPct(unsafe, bloodTested),
    abnormalBlood,
    abnormalBloodPct: calcPct(abnormalBlood, bloodTested),

    referred,
    retestNeeded,
    advised
  }
})

// Detailed Computed OCC-นบ 02: Table across Health Centers in District
const centerBreakdowns = computed<CenterBreakdownItem[]>(() => {
  return HEALTH_CENTERS.map(center => {
    const centerRecs = records.value.filter(r => r.health_center === center)
    const evaluated = centerRecs.length
    const highRisk = centerRecs.filter(r => 
      r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' || 
      r.risk_level === 'มีความเสี่ยงสูง' || 
      r.risk_level === 'มีความเสี่ยงสูงมาก'
    ).length
    const bloodTested = centerRecs.filter(r => Boolean(r.cholinesterase_result)).length
    const unsafe = centerRecs.filter(r => r.cholinesterase_result === 'ไม่ปลอดภัย' || r.cholinesterase_result === 'มีความเสี่ยง').length
    const coverage = highRisk > 0 ? Math.min(100, Math.round((bloodTested / highRisk) * 100)) : (bloodTested > 0 ? 100 : 0)

    return {
      center,
      evaluated,
      highRisk,
      bloodTested,
      unsafe,
      coverage
    }
  })
})

async function loadData() {
  loading.value = true
  try {
    const [allRecs, r1, r2] = await Promise.all([
      fetchAssessments(),
      fetchReportOCC01(selectedCenter.value, fiscalYear.value),
      fetchReportOCC02(provinceName.value, fiscalYear.value)
    ])
    records.value = allRecs
    occ01.value = r1
    occ02.value = r2
  } catch (err) {
    console.error('Error loading report data:', err)
  } finally {
    loading.value = false
  }
}

function handleDownloadPdf() {
  if (activeReport.value === '01' && occ01ViewRef.value) {
    occ01ViewRef.value.downloadPdf()
  } else if (activeReport.value === '02' && occ02ViewRef.value) {
    occ02ViewRef.value.downloadPdf()
  }
}

function exportReportCSV() {
  const headers = [
    'หน่วยบริการ',
    'ปีงบประมาณ',
    'รอบระยะเวลา',
    'เกษตรกรที่คัดกรองทั้งหมด',
    'เสี่ยงต่ำ',
    'เสี่ยงปานกลาง',
    'เสี่ยงค่อนข้างสูง',
    'เสี่ยงสูงมาก',
    'รวมเสี่ยงสูง',
    'เจาะเลือดเอนไซม์',
    'ปกติ',
    'ปลอดภัย',
    'มีความเสี่ยง',
    'ไม่ปลอดภัย',
    'ส่งต่อ รพ.',
    'ได้รับคำแนะนำ'
  ]

  const s = occ01Stats.value
  const row = [
    `"${selectedCenter.value}"`,
    `"${fiscalYear.value}"`,
    `"${reportingPeriod.value === '6month' ? 'รอบ 6 เดือน' : 'รอบ 12 เดือน'}"`,
    s.total,
    s.lowRisk,
    s.medRisk,
    s.highRisk,
    s.veryHighRisk,
    s.totalHighGroup,
    s.bloodTested,
    s.normal,
    s.safe,
    s.atRisk,
    s.unsafe,
    s.referred,
    s.advised
  ]

  let csvContent = '\uFEFF' + headers.join(',') + '\r\n' + row.join(',') + '\r\n'
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `แบบรายงาน_${activeReport.value === '01' ? 'OCC-นบ01' : 'OCC-นบ02'}_${selectedCenter.value}_${fiscalYear.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  if (props.active) loadData()
})

watch(() => props.active, (newVal) => {
  if (newVal) loadData()
})

defineExpose({
  refresh: loadData
})
</script>

<template>
  <div class="space-y-6">
    
    <!-- TOOLBAR CONTROLS (Screen only) -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
      <div>
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ระบบรายงานราชการ สธ.
          </span>
          <span class="text-xs text-slate-500 font-medium">กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม กรมควบคุมโรค</span>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-slate-900 mt-1">
          ระบบแบบรายงานเฝ้าระวังและจัดบริการอาชีวอนามัย (OCC-นบ)
        </h2>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
          แบบรายงานมาตรฐานระดับหน่วยบริการปฐมภูมิ (OCC-นบ 01) และระดับจังหวัด (OCC-นบ 02) พร้อมระบบโหลดเอกสาร PDF ต่อเนื่อง
        </p>
      </div>

      <!-- Report Tabs & PDF Actions -->
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100">
          <button 
            type="button"
            @click="activeReport = '01'"
            :class="[
              'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer',
              activeReport === '01' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            ]"
          >
            OCC-นบ 01 (รพ.สต.)
          </button>
          <button 
            type="button"
            @click="activeReport = '02'"
            :class="[
              'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer',
              activeReport === '02' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            ]"
          >
            OCC-นบ 02 (สสจ./สสอ.)
          </button>
        </div>

        <button 
          type="button"
          @click="exportReportCSV"
          class="px-3.5 py-2 text-xs sm:text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          title="ส่งออกรายงานในรูปแบบ CSV / Excel"
        >
          <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>ส่งออก Excel</span>
        </button>

        <button 
          type="button"
          @click="handleDownloadPdf"
          class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>ดาวน์โหลด PDF</span>
        </button>
      </div>
    </div>

    <!-- REPORT FILTERS BAR (Screen only) -->
    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm no-print">
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">หน่วยบริการปฐมภูมิ (รพ.สต.):</label>
        <select 
          v-model="selectedCenter" 
          class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
        >
          <option value="ALL">-- แสดงรวมทุกหน่วยบริการในอำเภอ --</option>
          <option v-for="center in HEALTH_CENTERS" :key="center" :value="center">{{ center }}</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">ประจำปีงบประมาณ:</label>
        <select 
          v-model="fiscalYear" 
          class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
        >
          <option value="2569">2569</option>
          <option value="2568">2568</option>
          <option value="2567">2567</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">รอบระยะเวลาการรายงาน:</label>
        <select 
          v-model="reportingPeriod" 
          class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
        >
          <option value="6month">รอบ 6 เดือน (1 ต.ค. - 31 มี.ค.)</option>
          <option value="12month">รอบ 12 เดือน (1 ต.ค. - 30 ก.ย.)</option>
        </select>
      </div>
    </div>

    <!-- REPORT VIEW OCC-นบ 01 (Multi-page continuous A4 layout with PDF export) -->
    <Occ01ReportView 
      v-show="activeReport === '01'"
      ref="occ01ViewRef"
      :stats="occ01Stats"
      :health-center="selectedCenter"
      :province-name="provinceName"
      :fiscal-year="fiscalYear"
      :reporting-period="reportingPeriod"
    />

    <!-- REPORT VIEW OCC-นบ 02 (District Summary with PDF export) -->
    <Occ02ReportView 
      v-show="activeReport === '02'"
      ref="occ02ViewRef"
      :records="records"
      :center-breakdowns="centerBreakdowns"
      :occ02="occ02"
      :province-name="provinceName"
      :fiscal-year="fiscalYear"
    />

  </div>
</template>
