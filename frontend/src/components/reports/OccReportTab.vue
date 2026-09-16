<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { AssessmentRecord, OCC01DetailedStats, CenterBreakdownItem } from '../../types'
import { fetchAssessments } from '../../services/api'
import { HEALTH_CENTERS } from '../../constants/healthCenters'
import Occ01ReportView from './Occ01ReportView.vue'
import Occ02ReportView from './Occ02ReportView.vue'

const props = defineProps<{
  active: boolean
}>()

const activeReport = ref<'01' | '02'>('01')
const loading = ref(false)
const loadError = ref('')
const reportingPeriod = ref<'6month' | '12month'>('12month')
const fiscalYear = ref('2569')
const selectedCenter = ref('รพ.สต.หลักสาม')
const provinceName = ref('สมุทรสาคร')

const records = ref<AssessmentRecord[]>([])

const occ01ViewRef = ref<InstanceType<typeof Occ01ReportView> | null>(null)
const occ02ViewRef = ref<InstanceType<typeof Occ02ReportView> | null>(null)

// Report Logo State (persisted in localStorage)
const STORAGE_KEY_REPORT_LOGO = 'nbk_report_logo_v1'
const reportLogo = ref<string>(localStorage.getItem(STORAGE_KEY_REPORT_LOGO) || '')
const logoFileInputRef = ref<HTMLInputElement | null>(null)
const logoError = ref('')

function triggerLogoUpload() {
  logoError.value = ''
  logoFileInputRef.value?.click()
}

function handleLogoFileChange(event: Event) {
  logoError.value = ''
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    logoError.value = 'กรุณาเลือกไฟล์ภาพที่ถูกต้อง (PNG, JPG, WebP)'
    target.value = ''
    return
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    logoError.value = 'ขนาดไฟล์ภาพต้องไม่เกิน 2MB'
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (result) {
      reportLogo.value = result
      try {
        localStorage.setItem(STORAGE_KEY_REPORT_LOGO, result)
      } catch (err) {
        console.warn('Could not save logo to localStorage:', err)
      }
    }
    target.value = ''
  }
  reader.onerror = () => {
    logoError.value = 'เกิดข้อผิดพลาดในการอ่านไฟล์ภาพ'
    target.value = ''
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  reportLogo.value = ''
  try {
    localStorage.removeItem(STORAGE_KEY_REPORT_LOGO)
  } catch {
    // ignore
  }
  if (logoFileInputRef.value) logoFileInputRef.value.value = ''
}

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
  const eligibleRecords = list.filter(r => [
    'มีความเสี่ยงค่อนข้างสูง',
    'มีความเสี่ยงสูง',
    'มีความเสี่ยงสูงมาก'
  ].includes(r.risk_level))

  // Results are reported only for farmers who meet the blood-screening criteria.
  const bloodTested = eligibleRecords.filter(r => ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)).length
  const normal = eligibleRecords.filter(r => r.cholinesterase_result === 'ปกติ').length
  const safe = eligibleRecords.filter(r => r.cholinesterase_result === 'ปลอดภัย').length
  const atRisk = eligibleRecords.filter(r => r.cholinesterase_result === 'มีความเสี่ยง').length
  const unsafe = eligibleRecords.filter(r => r.cholinesterase_result === 'ไม่ปลอดภัย').length
  const abnormalBlood = atRisk + unsafe

  // Follow-up
  const referred = unsafe // Unsafe must be referred to hospital
  const retestNeeded = atRisk // Risk need re-test in 2-4 weeks
  const advised = total // All get occupational counseling

  const calcPct = (cnt: number, base: number) => {
    if (!base) return '—'
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
    // Confirmed business rule: Percentage = (tested blood / high-risk farmers requiring blood screening) * 100
    bloodTestedPct: calcPct(bloodTested, totalHighGroup),
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
    const eligibleCenterRecs = centerRecs.filter(r => [
      'มีความเสี่ยงค่อนข้างสูง',
      'มีความเสี่ยงสูง',
      'มีความเสี่ยงสูงมาก'
    ].includes(r.risk_level))
    const bloodTested = eligibleCenterRecs.filter(r => ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)).length
    const unsafe = eligibleCenterRecs.filter(r => r.cholinesterase_result === 'มีความเสี่ยง' || r.cholinesterase_result === 'ไม่ปลอดภัย').length
    
    // Denominator = high-risk farmers requiring blood screening
    const coverage = highRisk > 0 ? Number(((bloodTested / highRisk) * 100).toFixed(1)) : 0

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
  loadError.value = ''
  try {
    records.value = await fetchAssessments()
  } catch (err) {
    console.error('Error loading report data:', err)
    loadError.value = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลรายงานได้'
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

function handlePrint() {
  if (activeReport.value === '01' && occ01ViewRef.value) {
    occ01ViewRef.value.printReport()
  } else if (activeReport.value === '02' && occ02ViewRef.value) {
    occ02ViewRef.value.printReport()
  } else {
    window.print()
  }
}

function exportReportCSV() {
  if (activeReport.value === '01') {
    const headers = [
      'หน่วยบริการ',
      'ปีงบประมาณ',
      'รอบระยะเวลา',
      'เกษตรกรที่คัดกรองทั้งหมด',
      'เสี่ยงต่ำ',
      'เสี่ยงปานกลาง',
      'เสี่ยงค่อนข้างสูง',
      'เสี่ยงสูงมาก',
      'รวมกลุ่มเสี่ยงสูงที่ต้องเจาะเลือด',
      'เจาะเลือดเอนไซม์จริง',
      'ร้อยละการตรวจเลือดต่อกลุ่มเสี่ยงสูง',
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
      `"${s.bloodTestedPct}"`,
      s.normal,
      s.safe,
      s.atRisk,
      s.unsafe,
      s.referred,
      s.advised
    ]

    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + row.join(',') + '\r\n'
    downloadCSV(csvContent, `แบบรายงาน_OCC-นบ01_${selectedCenter.value}_${fiscalYear.value}.csv`)
  } else {
    const headers = [
      'ลำดับ',
      'หน่วยบริการปฐมภูมิ',
      'ประเมินทั้งหมด (คน)',
      'กลุ่มเสี่ยงสูงที่ต้องเจาะเลือด (คน)',
      'ตรวจเลือดจริง (คน)',
      'ร้อยละความครอบคลุมการตรวจเลือด (%)'
    ]

    const rows = centerBreakdowns.value.map((item, idx) => [
      idx + 1,
      `"${item.center}"`,
      item.evaluated,
      item.highRisk,
      item.bloodTested,
      item.coverage.toFixed(1)
    ])

    const totalEvaluated = centerBreakdowns.value.reduce((acc, c) => acc + c.evaluated, 0)
    const totalHighRisk = centerBreakdowns.value.reduce((acc, c) => acc + c.highRisk, 0)
    const totalBloodTested = centerBreakdowns.value.reduce((acc, c) => acc + c.bloodTested, 0)
    const totalCoverage = totalHighRisk > 0 ? ((totalBloodTested / totalHighRisk) * 100).toFixed(1) : '0.0'

    const summaryRow = [
      '""',
      '"รวมทั้งอำเภอ"',
      totalEvaluated,
      totalHighRisk,
      totalBloodTested,
      totalCoverage
    ]

    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + rows.map(r => r.join(',')).join('\r\n') + '\r\n' + summaryRow.join(',') + '\r\n'
    downloadCSV(csvContent, `แบบรายงาน_OCC-นบ02_${provinceName.value}_${fiscalYear.value}.csv`)
  }
}

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
            ระบบรายงานเฝ้าระวังสุขภาพ
          </span>
          <span class="text-xs text-slate-500 font-medium">โรงพยาบาลบ้านแพ้ว (องค์การมหาชน)</span>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-slate-900 mt-1">
          ระบบแบบรายงานเฝ้าระวังและจัดบริการอาชีวอนามัย (OCC-นบ)
        </h2>
        <p class="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          จัดทำรายงานระดับหน่วยบริการปฐมภูมิ (OCC-นบ 01) และรายงานสรุปภาพรวมระดับอำเภอ (OCC-นบ 02) พร้อมส่งออกเป็น PDF ขนาด A4
        </p>
      </div>

      <!-- Report Tabs & Actions -->
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100" role="tablist" aria-label="เลือกแบบรายงาน">
          <button 
            type="button"
            @click="activeReport = '01'"
            role="tab"
            :aria-selected="activeReport === '01'"
            aria-controls="occ-report-01"
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
            role="tab"
            :aria-selected="activeReport === '02'"
            aria-controls="occ-report-02"
            :class="[
              'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer',
              activeReport === '02' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            ]"
          >
            OCC-นบ 02 (ระดับอำเภอ)
          </button>
        </div>

        <button 
          type="button"
          @click="exportReportCSV"
          :disabled="loading || !!loadError"
          class="px-3.5 py-2 text-xs sm:text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="ส่งออกรายงานในรูปแบบ CSV / Excel"
        >
          <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>ส่งออก Excel</span>
        </button>

        <button 
          type="button"
          @click="handlePrint"
          :disabled="loading || !!loadError"
          class="px-3.5 py-2 text-xs sm:text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="พิมพ์ผ่านเบราว์เซอร์ (สามารถเลือกบันทึกเป็น PDF คมชัดสูงได้)"
        >
          <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          <span>พิมพ์เอกสาร</span>
        </button>

        <button 
          type="button"
          @click="handleDownloadPdf"
          :disabled="loading || !!loadError"
          class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>ดาวน์โหลด PDF (A4)</span>
        </button>
      </div>
    </div>

    <div v-if="loadError" role="alert" class="no-print rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
      <p class="font-bold">ไม่สามารถจัดทำรายงานได้</p>
      <p class="mt-1 text-sm">{{ loadError }}</p>
      <button type="button" @click="loadData" class="mt-3 min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800">ลองโหลดอีกครั้ง</button>
    </div>

    <!-- LOGO UPLOAD & CONFIGURATION BAR (Screen only) -->
    <div v-if="!loadError" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
      <div class="flex items-center space-x-3">
        <input 
          ref="logoFileInputRef" 
          type="file" 
          accept="image/png,image/jpeg,image/webp" 
          class="hidden" 
          @change="handleLogoFileChange"
        />
        
        <div class="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
          <img 
            v-if="reportLogo" 
            :src="reportLogo" 
            alt="โลโก้รายงาน" 
            class="w-full h-full object-contain p-1"
          />
          <svg v-else class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>

        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-800">โลโก้ส่วนหัวรายงาน</span>
            <span v-if="reportLogo" class="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">พร้อมใช้งาน</span>
            <span v-else class="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">ยังไม่ได้แนบโลโก้ (ใช้สัญลักษณ์มาตรฐาน)</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">รองรับไฟล์ PNG, JPG, WebP ขนาดไม่เกิน 2MB เพื่อแสดงในเอกสารรายงานและตอนพิมพ์/PDF</p>
          <p v-if="logoError" class="text-xs text-rose-600 font-semibold mt-0.5">{{ logoError }}</p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button 
          type="button" 
          @click="triggerLogoUpload" 
          class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
        >
          <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <span>{{ reportLogo ? 'เปลี่ยนโลโก้' : 'แนบโลโก้รายงาน' }}</span>
        </button>

        <button 
          v-if="reportLogo" 
          type="button" 
          @click="removeLogo" 
          class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          ลบโลโก้
        </button>
      </div>
    </div>

    <!-- REPORT FILTERS BAR (Screen only) -->
    <div v-if="!loadError" class="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm no-print">
      <div>
        <label for="report-health-center" class="block text-sm font-bold text-slate-700 mb-1">หน่วยบริการปฐมภูมิ (รพ.สต.)</label>
        <select 
          id="report-health-center"
          v-model="selectedCenter" 
          class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
        >
          <option value="ALL">-- แสดงรวมทุกหน่วยบริการในอำเภอ --</option>
          <option v-for="center in HEALTH_CENTERS" :key="center" :value="center">{{ center }}</option>
        </select>
      </div>

      <div>
        <label for="report-fiscal-year" class="block text-sm font-bold text-slate-700 mb-1">ประจำปีงบประมาณ</label>
        <select 
          id="report-fiscal-year"
          v-model="fiscalYear" 
          class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
        >
          <option value="2569">2569</option>
          <option value="2568">2568</option>
          <option value="2567">2567</option>
        </select>
      </div>

      <div>
        <label for="reporting-period" class="block text-sm font-bold text-slate-700 mb-1">รอบระยะเวลาการรายงาน</label>
        <select 
          id="reporting-period"
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
      v-if="!loadError"
      id="occ-report-01"
      v-show="activeReport === '01'"
      ref="occ01ViewRef"
      :stats="occ01Stats"
      :health-center="selectedCenter"
      :province-name="provinceName"
      :fiscal-year="fiscalYear"
      :reporting-period="reportingPeriod"
      :report-logo="reportLogo"
    />

    <!-- REPORT VIEW OCC-นบ 02 (District Summary with PDF export) -->
    <Occ02ReportView 
      v-if="!loadError"
      id="occ-report-02"
      v-show="activeReport === '02'"
      ref="occ02ViewRef"
      :records="records"
      :center-breakdowns="centerBreakdowns"
      :province-name="provinceName"
      :fiscal-year="fiscalYear"
      :report-logo="reportLogo"
    />

  </div>
</template>
