<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import type { DashboardStats, AssessmentRecord } from '../../types'
import { fetchDashboardStats, fetchFollowUps, fetchAssessments } from '../../services/api'

Chart.register(...registerables)

const props = defineProps<{
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'viewDetail', record: AssessmentRecord): void
  (e: 'recordFollowUp', record: AssessmentRecord): void
  (e: 'newAssessment'): void
  (e: 'filterRegistry', filter: { riskLevel?: string; bloodResult?: string; followUpOnly?: boolean }): void
}>()

const followUpCount = ref(0)
const followUpAvailable = ref(true)
const stats = ref<DashboardStats>({
  total_farmers: 0,
  high_risk_farmers: 0,
  tested_blood: 0,
  unsafe_blood: 0,
  risk_distribution: {
    'มีความเสี่ยงต่ำ': 0,
    'มีความเสี่ยงปานกลาง': 0,
    'มีความเสี่ยงค่อนข้างสูง': 0,
    'มีความเสี่ยงสูง': 0,
    'มีความเสี่ยงสูงมาก': 0
  },
  blood_distribution: {
    'ปกติ': 0,
    'ปลอดภัย': 0,
    'มีความเสี่ยง': 0,
    'ไม่ปลอดภัย': 0
  },
  recent_priority_cases: []
})

const loading = ref(false)
const riskCanvasRef = ref<HTMLCanvasElement | null>(null)
const bloodCanvasRef = ref<HTMLCanvasElement | null>(null)
let riskChartInstance: Chart | null = null
let bloodChartInstance: Chart | null = null

async function loadStats() {
  loading.value = true
  try {
    const [s, fuList, assessments] = await Promise.all([
      fetchDashboardStats(),
      fetchFollowUps().catch(() => null),
      fetchAssessments()
    ])
    stats.value = s
    followUpAvailable.value = fuList !== null
    const followedIds = new Set((fuList || []).map(f => f.assessment_id))
    followUpCount.value = assessments.filter(r => followedIds.has(r.id)).length
    await nextTick()
    renderCharts()
  } catch (err) {
    console.error('Error loading dashboard stats:', err)
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  // 1. Risk Matrix Donut Chart
  if (riskCanvasRef.value) {
    if (riskChartInstance) riskChartInstance.destroy()
    const ctx = riskCanvasRef.value.getContext('2d')
    if (ctx) {
      const d = stats.value.risk_distribution
      riskChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['ต่ำ', 'ปานกลาง', 'ค่อนข้างสูง', 'สูง', 'สูงมาก'],
          datasets: [{
            data: [
              d['มีความเสี่ยงต่ำ'] || 0,
              d['มีความเสี่ยงปานกลาง'] || 0,
              d['มีความเสี่ยงค่อนข้างสูง'] || 0,
              d['มีความเสี่ยงสูง'] || 0,
              d['มีความเสี่ยงสูงมาก'] || 0
            ],
            backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#991b1b'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%'
        }
      })
    }
  }

  // 2. Blood Bar Chart
  if (bloodCanvasRef.value) {
    if (bloodChartInstance) bloodChartInstance.destroy()
    const ctx = bloodCanvasRef.value.getContext('2d')
    if (ctx) {
      const b = stats.value.blood_distribution
      bloodChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['ปกติ', 'ปลอดภัย', 'เสี่ยง', 'ไม่ปลอดภัย'],
          datasets: [{
            data: [
              b['ปกติ'] || 0,
              b['ปลอดภัย'] || 0,
              b['มีความเสี่ยง'] || 0,
              b['ไม่ปลอดภัย'] || 0
            ],
            backgroundColor: ['#059669', '#0d9488', '#d97706', '#dc2626'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      })
    }
  }
}

function getRiskBadgeClass(level: string): string {
  switch (level) {
    case 'มีความเสี่ยงต่ำ': return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
    case 'มีความเสี่ยงปานกลาง': return 'bg-amber-100 text-amber-800 border border-amber-300'
    case 'มีความเสี่ยงค่อนข้างสูง': return 'bg-orange-100 text-orange-800 border border-orange-300'
    case 'มีความเสี่ยงสูง': return 'bg-rose-100 text-rose-800 border border-rose-300'
    case 'มีความเสี่ยงสูงมาก': return 'bg-red-200 text-red-900 border border-red-400'
    default: return 'bg-slate-100 text-slate-700'
  }
}

function getBloodBadgeClass(res: string): string {
  switch (res) {
    case 'ปกติ': return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
    case 'ปลอดภัย': return 'bg-teal-100 text-teal-800 border border-teal-300'
    case 'มีความเสี่ยง': return 'bg-amber-100 text-amber-800 border border-amber-300'
    case 'ไม่ปลอดภัย': return 'bg-rose-100 text-rose-800 border border-rose-300'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function formatId(id: string): string {
  if (!id || id.length !== 13) return id || ''
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12, 13)}`
}

onMounted(() => {
  if (props.active) {
    loadStats()
  }
})

watch(() => props.active, (newVal) => {
  if (newVal) {
    loadStats()
  }
})

defineExpose({
  refresh: loadStats
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Hero Banner / Quick Action -->
    <div class="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="space-y-2 max-w-xl">
        <div class="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          <span>ระบบสนับสนุนการปฏิบัติงานภาคสนาม (Field Screening)</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-black tracking-tight">
          ระบบคัดกรองความเสี่ยงสุขภาพเกษตรกร นบก. 1-56
        </h2>
        <p class="text-xs sm:text-sm text-emerald-100 leading-relaxed font-light">
          เฝ้าระวังความเสี่ยงจากการใช้สารเคมีกำจัดศัตรูพืช ตรวจสอบระดับเอนไซม์โคลีนเอสเตอเรส (Reactive Paper) และประมวลผลสรุปรายงานราชการอัตโนมัติ
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="emit('newAssessment')" 
          class="w-full sm:w-auto px-5 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-xs shadow-lg transition transform active:scale-95 flex items-center justify-center space-x-2"
        >
          <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>เริ่มแบบประเมินรายใหม่</span>
        </button>
      </div>
    </div>

    <!-- Clinical Screening Protocol Flow Card (รพ.สต. + รพ.) -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <h3 class="text-xs sm:text-sm font-bold text-slate-800">
            ขั้นตอนการให้บริการคัดกรองสารเคมีกำจัดศัตรูพืชตกค้างในเลือด (รพ.สต. และ โรงพยาบาล)
          </h3>
        </div>
        <span class="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          กระบวนการ 4 ขั้นตอน
        </span>
      </div>

      <!-- 4-step Flow Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <!-- Step 1 -->
        <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900">1. ตรวจคัดกรองเลือด</span>
            <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center">1</span>
          </div>
          <p class="text-[11px] text-slate-600 leading-relaxed">
            รพ.สต. และ รพ. ตรวจคัดกรองสารเคมีตกค้างในเลือดด้วยกระดาษทดสอบ (Reactive Paper)
          </p>
        </div>

        <!-- Step 2 -->
        <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900">2. จำแนกผล 4 ระดับ</span>
            <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center">2</span>
          </div>
          <div class="flex items-center space-x-1 text-[10px] pt-0.5">
            <span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">ปกติ</span>
            <span class="px-1.5 py-0.5 rounded bg-lime-50 text-lime-800 border border-lime-200 font-semibold">ปลอดภัย</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">เสี่ยง</span>
            <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold">ไม่ปลอดภัย</span>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-950">3. คัดกรองซ้ำ & ซักประวัติ</span>
            <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-mono font-bold text-[10px] flex items-center justify-center">3</span>
          </div>
          <p class="text-[11px] text-amber-900 leading-relaxed">
            ผล <strong class="text-emerald-800">เสี่ยง</strong> หรือ <strong class="text-rose-700">ไม่ปลอดภัย</strong> ➔ <strong>ต้องเจาะซ้ำ</strong> และเข้าสู่แบบประเมิน นบก. 1-56
          </p>
        </div>

        <!-- Step 4 -->
        <div class="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-emerald-950">4. จนท. ซักประวัติผ่านระบบ</span>
            <span class="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 font-mono font-bold text-[10px] flex items-center justify-center">4</span>
          </div>
          <p class="text-[11px] text-emerald-900 leading-relaxed">
            เจ้าหน้าที่ รพ.สต. / รพ. ซักประวัติพฤติกรรม อาการ คำนวณความเสี่ยง และวางแผนส่งต่อแพทย์
          </p>
        </div>
      </div>
    </div>

    <!-- 4 Actionable KPI Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Total Assessed -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold text-slate-600">เกษตรกรที่ประเมินแล้ว</span>
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <p class="text-2xl sm:text-3xl font-black text-slate-800">{{ stats.total_farmers }}</p>
            <span class="text-[11px] font-medium text-slate-400">รายสะสม</span>
          </div>
        </div>
        <button 
          type="button"
          @click="emit('filterRegistry', { riskLevel: 'ALL' })" 
          class="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <span>ดูทะเบียนเกษตรกร</span>
          <span>&rarr;</span>
        </button>
      </div>

      <!-- High Risk -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-rose-600">
            <span class="text-xs font-semibold text-rose-700">กลุ่มเสี่ยงสูงขึ้นไป</span>
            <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <p class="text-2xl sm:text-3xl font-black text-rose-600">{{ stats.high_risk_farmers }}</p>
            <span class="text-[11px] font-medium text-rose-400">เป้าหมายเจาะเลือด</span>
          </div>
        </div>
        <button 
          type="button"
          @click="emit('filterRegistry', { riskLevel: 'HIGH_RISK' })" 
          class="w-full mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-700 hover:text-rose-900 transition"
        >
          <span>ดูรายชื่อกลุ่มเสี่ยงสูง</span>
          <span>&rarr;</span>
        </button>
      </div>

      <!-- Tested Blood -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-teal-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-teal-600">
            <span class="text-xs font-semibold text-teal-700">ตรวจเอนไซม์แล้ว</span>
            <div class="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <p class="text-2xl sm:text-3xl font-black text-teal-600">{{ stats.tested_blood }}</p>
            <span class="text-[11px] font-medium text-teal-400">Reactive Paper</span>
          </div>
        </div>
        <button 
          type="button"
          @click="emit('filterRegistry', { bloodResult: 'TESTED' })" 
          class="w-full mt-3 pt-2.5 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-teal-700 hover:text-teal-900 transition"
        >
          <span>ดูผลตรวจเลือด</span>
          <span>&rarr;</span>
        </button>
      </div>

      <!-- Unsafe Blood -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-amber-600">
            <span class="text-xs font-semibold text-amber-700">ผลเลือดเสี่ยง/ไม่ปลอดภัย</span>
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <p class="text-2xl sm:text-3xl font-black text-amber-600">{{ stats.unsafe_blood }}</p>
            <span class="text-[11px] font-medium text-amber-500">ต้องส่งต่อพบแพทย์</span>
          </div>
        </div>
        <button 
          type="button"
          @click="emit('filterRegistry', { bloodResult: 'UNSAFE' })" 
          class="w-full mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-900 transition"
        >
          <span>ดูเคสผิดปกติ / ส่งต่อ</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>

    <!-- Operational Coverage Bar & Follow-up status row -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div class="sm:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate-800 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>อัตราการตรวจคัดกรองสารเคมีในเลือด (Reactive Paper)</span>
          </span>
          <span class="font-bold font-mono text-emerald-800">
            {{ stats.total_farmers > 0 ? Math.round((stats.tested_blood / stats.total_farmers) * 100) : 0 }}%
          </span>
        </div>
        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            :style="{ width: `${stats.total_farmers > 0 ? Math.round((stats.tested_blood / stats.total_farmers) * 100) : 0}%` }"
          ></div>
        </div>
        <div class="flex items-center justify-between text-[11px] text-slate-500">
          <span>ตรวจเลือดแล้ว {{ stats.tested_blood }} จากแบบประเมินทั้งหมด {{ stats.total_farmers }} รายการ</span>
          <span class="text-slate-400">กลุ่มเสี่ยงสูงในระบบ: {{ stats.high_risk_farmers }} ราย</span>
        </div>
      </div>

      <div class="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
            <span>📅</span>
            <span>เคสติดตามผล / ตรวจซ้ำ</span>
          </span>
          <span class="px-2 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900">
            {{ followUpAvailable ? followUpCount : 'ไม่พร้อมใช้งาน' }}
          </span>
        </div>
        <p class="text-[11px] text-amber-900 leading-tight">
          ติดตามอาการพิษ ตรวจเลือดซ้ำใน 2-4 สัปดาห์ และตรวจเยี่ยมการสวมใส่ PPE
        </p>
        <button 
          type="button"
          :disabled="!followUpAvailable"
          @click="emit('filterRegistry', { followUpOnly: true })"
          class="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1"
        >
          <span>ดูเคสนัดติดตามผล</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>

    <!-- Charts Row: Risk Distribution & Blood Screening Distribution -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <!-- Risk Matrix Donut Chart Card -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>สัดส่วนระดับความเสี่ยง (Risk Matrix)</span>
            </h3>
            <span class="text-[11px] font-medium text-slate-400">5 ระดับมาตรฐาน</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            จำแนกตามเกณฑ์คะแนนพฤติกรรม นบก. 1-56 ร่วมกับกลุ่มอาการผิดปกติ
          </p>
        </div>

        <div class="relative h-56 my-3 flex items-center justify-center">
          <canvas ref="riskCanvasRef"></canvas>
        </div>

        <!-- Custom Legend -->
        <div class="grid grid-cols-5 gap-1 pt-2 border-t border-slate-100 text-[10px] text-center">
          <div><span class="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>ต่ำ ({{ stats.risk_distribution['มีความเสี่ยงต่ำ'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>ปานกลาง ({{ stats.risk_distribution['มีความเสี่ยงปานกลาง'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>ค่อนข้างสูง ({{ stats.risk_distribution['มีความเสี่ยงค่อนข้างสูง'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1"></span>สูง ({{ stats.risk_distribution['มีความเสี่ยงสูง'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-red-800 mr-1"></span>สูงมาก ({{ stats.risk_distribution['มีความเสี่ยงสูงมาก'] || 0 }})</div>
        </div>
      </div>

      <!-- Blood Screening Bar Chart Card -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>ผลตรวจเอนไซม์โคลีนเอสเตอเรสในเลือด</span>
            </h3>
            <span class="text-[11px] font-medium text-slate-400">Reactive Paper Test</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            สถิติผลการตรวจ 4 ระดับสีของแถบกระดาษทดสอบ
          </p>
        </div>

        <div class="relative h-56 my-3 flex items-center justify-center">
          <canvas ref="bloodCanvasRef"></canvas>
        </div>

        <!-- Custom Legend -->
        <div class="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 text-[10px] text-center">
          <div><span class="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1"></span>ปกติ ({{ stats.blood_distribution['ปกติ'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-teal-600 mr-1"></span>ปลอดภัย ({{ stats.blood_distribution['ปลอดภัย'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-amber-600 mr-1"></span>เสี่ยง ({{ stats.blood_distribution['มีความเสี่ยง'] || 0 }})</div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-rose-600 mr-1"></span>ไม่ปลอดภัย ({{ stats.blood_distribution['ไม่ปลอดภัย'] || 0 }})</div>
        </div>
      </div>
    </div>

    <!-- Priority Cases Section: Responsive Desktop Table + Mobile Cards -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>เกษตรกรกลุ่มเสี่ยงสูงที่ต้องติดตามเร่งด่วน</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">เรียงลำดับตามคะแนนความเสี่ยงและผลเจาะเลือดผิดปกติ</p>
        </div>
        <button 
          type="button"
          @click="emit('filterRegistry', { riskLevel: 'HIGH_RISK' })"
          class="text-xs text-emerald-800 hover:text-emerald-900 font-bold self-start sm:self-auto"
        >
          ดูทั้งหมดในทะเบียน &rarr;
        </button>
      </div>

      <!-- Desktop Table View (hidden on mobile) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th class="px-4 py-3">ชื่อ - สกุล</th>
              <th class="px-4 py-3">เลขประจำตัว ปชช.</th>
              <th class="px-4 py-3">ระดับความเสี่ยง</th>
              <th class="px-4 py-3 text-center">คะแนนรวม</th>
              <th class="px-4 py-3">อาการสำคัญ</th>
              <th class="px-4 py-3">ผลเจาะเลือด</th>
              <th class="px-4 py-3 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="stats.recent_priority_cases.length === 0">
              <td colspan="7" class="text-center py-6 text-slate-400">ยังไม่มีข้อมูลการประเมินในระบบ</td>
            </tr>
            <tr v-for="item in stats.recent_priority_cases" :key="item.id" class="hover:bg-slate-50/80 transition">
              <td class="px-4 py-3 font-semibold text-slate-800">{{ item.fullname }}</td>
              <td class="px-4 py-3 font-mono text-slate-500">{{ formatId(item.citizen_id) }}</td>
              <td class="px-4 py-3">
                <span :class="['px-2 py-0.5 rounded-full font-semibold text-[10px]', getRiskBadgeClass(item.risk_level)]">
                  {{ item.risk_level }}
                </span>
              </td>
              <td class="px-4 py-3 text-center font-bold text-slate-700">{{ item.total_score }}</td>
              <td class="px-4 py-3 text-slate-500 max-w-xs truncate">
                {{ item.symptoms && item.symptoms.length > 0 ? item.symptoms.slice(0, 2).join(', ') : 'ไม่มี' }}
              </td>
              <td class="px-4 py-3">
                <span :class="['px-2 py-0.5 rounded-full font-semibold text-[10px]', getBloodBadgeClass(item.cholinesterase_result)]">
                  {{ item.cholinesterase_result || '-' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex items-center space-x-1.5">
                  <button 
                    type="button"
                    @click="emit('recordFollowUp', item)" 
                    class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition"
                  >
                    📅 ติดตามผล
                  </button>
                  <button 
                    type="button"
                    @click="emit('viewDetail', item)" 
                    class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition"
                  >
                    ดูประวัติ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View (block md:hidden) -->
      <div class="block md:hidden space-y-3">
        <div v-if="stats.recent_priority_cases.length === 0" class="py-6 text-center text-xs text-slate-400">
          ยังไม่มีข้อมูลการประเมินในระบบ
        </div>
        <div 
          v-for="item in stats.recent_priority_cases" 
          :key="item.id"
          class="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5 text-xs"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="font-bold text-slate-900 text-sm block">{{ item.fullname }}</span>
              <span class="text-slate-500 font-mono text-[11px]">{{ formatId(item.citizen_id) }}</span>
            </div>
            <span :class="['px-2 py-0.5 rounded-full font-bold text-[10px]', getRiskBadgeClass(item.risk_level)]">
              {{ item.risk_level }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
            <div>
              <span class="text-slate-500">คะแนนรวม: </span>
              <strong class="text-slate-800">{{ item.total_score }} / 45</strong>
            </div>
            <div>
              <span class="text-slate-500">ผลเลือด: </span>
              <span :class="['font-bold', getBloodBadgeClass(item.cholinesterase_result)]">
                {{ item.cholinesterase_result || 'ยังไม่ตรวจ' }}
              </span>
            </div>
          </div>

          <div v-if="item.symptoms && item.symptoms.length > 0" class="text-[11px] text-slate-600">
            <span class="text-slate-400">อาการ: </span>{{ item.symptoms.slice(0, 3).join(', ') }}
          </div>

          <div class="pt-2 border-t border-slate-200/60 flex items-center justify-end space-x-2">
            <button 
              type="button"
              @click="emit('recordFollowUp', item)"
              class="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs text-center"
            >
              📅 ติดตามผล
            </button>
            <button 
              type="button"
              @click="emit('viewDetail', item)"
              class="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs text-center"
            >
              ดูประวัติ
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
