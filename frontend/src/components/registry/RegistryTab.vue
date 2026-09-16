<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { AssessmentRecord } from '../../types'
import { fetchAssessments, deleteAssessment, fetchFollowUps } from '../../services/api'
import { HEALTH_CENTERS } from '../../constants/healthCenters'
import EditFarmerModal from '../common/EditFarmerModal.vue'
import AddFollowUpModal from '../common/AddFollowUpModal.vue'

const props = defineProps<{
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'viewDetail', record: AssessmentRecord): void
  (e: 'showToast', title: string, message: string, isSuccess?: boolean): void
}>()

const records = ref<AssessmentRecord[]>([])
const loading = ref(false)
const loadError = ref('')
const searchQuery = ref('')
const riskFilter = ref('ALL')
const bloodFilter = ref('ALL')
const healthCenterFilter = ref('ALL')
const followUpOnly = ref(false)
const followedAssessmentIds = ref(new Set<string>())

// Follow-up modal state
const isAddFollowUpOpen = ref(false)
const targetFollowUpRecord = ref<AssessmentRecord | null>(null)

function openFollowUpModal(rec: AssessmentRecord) {
  targetFollowUpRecord.value = rec
  isAddFollowUpOpen.value = true
}

function handleFollowUpSaved() {
  loadRecords()
  emit('showToast', 'บันทึกสำเร็จ', 'บันทึกข้อมูลการติดตามผลเรียบร้อยแล้ว', true)
}

// Edit modal state
const isEditModalOpen = ref(false)
const editingRecord = ref<AssessmentRecord | null>(null)

function openEditModal(rec: AssessmentRecord) {
  editingRecord.value = rec
  isEditModalOpen.value = true
}

function handleRecordUpdated(updated: AssessmentRecord) {
  emit('showToast', 'แก้ไขสำเร็จ', `อัปเดตข้อมูลของ ${updated.fullname} เรียบร้อยแล้ว`, true)
  loadRecords()
}

// Deletion modal state
const isDeleteModalOpen = ref(false)
const pendingDeleteRecord = ref<AssessmentRecord | null>(null)
const isDeleting = ref(false)

async function loadRecords() {
  loading.value = true
  loadError.value = ''
  try {
    const [assessments, followups] = await Promise.all([fetchAssessments(), fetchFollowUps().catch(() => [])])
    records.value = assessments
    followedAssessmentIds.value = new Set(followups.flatMap(f => f.assessment_id ? [f.assessment_id] : []))
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    loadError.value = errorMsg
    emit('showToast', 'ข้อผิดพลาด', errorMsg, false)
  } finally {
    loading.value = false
  }
}

// Multi-criteria client-side filtering for fast instant feedback
const filteredRecords = computed(() => {
  let list = records.value

  // 1. Text Search across multiple fields
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      r.fullname.toLowerCase().includes(q) ||
      r.citizen_id.includes(q) ||
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.plant_type && r.plant_type.toLowerCase().includes(q)) ||
      (r.occupation && r.occupation.toLowerCase().includes(q)) ||
      (r.health_center && r.health_center.toLowerCase().includes(q))
    )
  }

  // 2. Risk Level filter
  if (riskFilter.value === 'HIGH_RISK') {
    list = list.filter(r =>
      r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' ||
      r.risk_level === 'มีความเสี่ยงสูง' ||
      r.risk_level === 'มีความเสี่ยงสูงมาก'
    )
  } else if (riskFilter.value !== 'ALL') {
    list = list.filter(r => r.risk_level === riskFilter.value)
  }

  // 3. Blood filter
  if (bloodFilter.value === 'TESTED') {
    list = list.filter(r => ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result))
  } else if (bloodFilter.value === 'UNSAFE') {
    list = list.filter(r => r.cholinesterase_result === 'มีความเสี่ยง' || r.cholinesterase_result === 'ไม่ปลอดภัย')
  } else if (bloodFilter.value === 'NORMAL') {
    list = list.filter(r => r.cholinesterase_result === 'ปกติ')
  } else if (bloodFilter.value === 'SAFE') {
    list = list.filter(r => r.cholinesterase_result === 'ปลอดภัย')
  } else if (bloodFilter.value === 'UNTESTED') {
    list = list.filter(r => !['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result))
  }

  // 4. Health Center / Subdistrict filter
  if (healthCenterFilter.value !== 'ALL') {
    list = list.filter(r => r.health_center === healthCenterFilter.value)
  }

  // 5. Follow-up only filter
  if (followUpOnly.value) {
    list = list.filter(r => followedAssessmentIds.value.has(r.id))
  }

  return list
})

// Filter counts for quick indicators
const filterCounts = computed(() => {
  const all = records.value.length
  const highRisk = records.value.filter(r =>
    r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' ||
    r.risk_level === 'มีความเสี่ยงสูง' ||
    r.risk_level === 'มีความเสี่ยงสูงมาก'
  ).length
  const unsafeBlood = records.value.filter(r =>
    r.cholinesterase_result === 'มีความเสี่ยง' || r.cholinesterase_result === 'ไม่ปลอดภัย'
  ).length
  return { all, highRisk, unsafeBlood }
})

function setQuickRiskFilter(val: string) {
  riskFilter.value = val
}

function clearAllFilters() {
  searchQuery.value = ''
  riskFilter.value = 'ALL'
  bloodFilter.value = 'ALL'
  healthCenterFilter.value = 'ALL'
  followUpOnly.value = false
}

// Method exposed for external navigation from Dashboard
function applyExternalFilter(f: { riskLevel?: string; bloodResult?: string; followUpOnly?: boolean }) {
  // Reset other filters so external KPI action displays the exact expected data
  searchQuery.value = ''
  riskFilter.value = f.riskLevel || 'ALL'
  bloodFilter.value = f.bloodResult || 'ALL'
  healthCenterFilter.value = 'ALL'
  followUpOnly.value = f.followUpOnly !== undefined ? f.followUpOnly : false
}

function openDeleteModal(rec: AssessmentRecord) {
  pendingDeleteRecord.value = rec
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  pendingDeleteRecord.value = null
  isDeleteModalOpen.value = false
}

async function confirmDelete() {
  if (!pendingDeleteRecord.value) return
  isDeleting.value = true
  try {
    await deleteAssessment(pendingDeleteRecord.value.id)
    emit('showToast', 'ลบข้อมูลสำเร็จ', `ลบแบบประเมินของ ${pendingDeleteRecord.value.fullname} เรียบร้อยแล้ว`, true)
    closeDeleteModal()
    loadRecords()
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้'
    emit('showToast', 'ลบไม่สำเร็จ', errorMsg, false)
  } finally {
    isDeleting.value = false
  }
}

function exportCSV() {
  if (filteredRecords.value.length === 0) {
    emit('showToast', 'ไม่มีข้อมูล', 'ไม่มีรายการเกษตรกรสำหรับส่งออก CSV', false)
    return
  }

  const headers = [
    'เลขประจำตัวประชาชน', 'ชื่อ-สกุล', 'เพศ', 'อายุ', 'ที่อยู่',
    'หน่วยบริการ', 'อาชีพ', 'พืชหลัก', 'คะแนน_A', 'คะแนน_B', 'คะแนนรวม',
    'ระดับความเสี่ยง', 'ผลเจาะเลือดเอนไซม์', 'อาการผิดปกติ', 'วันที่ประเมิน'
  ]

  const rows = filteredRecords.value.map(d => [
    `"${d.citizen_id}"`,
    `"${d.fullname}"`,
    `"${d.gender}"`,
    d.age,
    `"${d.address || ''}"`,
    `"${d.health_center || ''}"`,
    `"${d.occupation || ''}"`,
    `"${d.plant_type || ''}"`,
    d.score_a,
    d.score_b,
    d.total_score,
    `"${d.risk_level}"`,
    `"${d.cholinesterase_result || ''}"`,
    `"${(d.symptoms || []).join('; ')}"`,
    `"${d.eval_date || ''}"`
  ])

  let csvContent = '\uFEFF' // UTF-8 BOM for Microsoft Excel Thai support
  csvContent += headers.join(',') + '\r\n'
  rows.forEach(r => {
    csvContent += r.join(',') + '\r\n'
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `ทะเบียนเกษตรกร_นบก1_56_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  emit('showToast', 'ส่งออกสำเร็จ', 'ดาวน์โหลดไฟล์ Excel (CSV) เรียบร้อยแล้ว', true)
}

function formatId(id: string): string {
  if (!id || id.length !== 13) return id || ''
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12, 13)}`
}

function getRiskBadgeClass(level: string): string {
  switch (level) {
    case 'มีความเสี่ยงต่ำ': return 'bg-emerald-50 text-emerald-800 border border-emerald-300'
    case 'มีความเสี่ยงปานกลาง': return 'bg-amber-50 text-amber-800 border border-amber-300'
    case 'มีความเสี่ยงค่อนข้างสูง': return 'bg-orange-50 text-orange-800 border border-orange-300'
    case 'มีความเสี่ยงสูง': return 'bg-rose-50 text-rose-800 border border-rose-300'
    case 'มีความเสี่ยงสูงมาก': return 'bg-red-100 text-red-900 border border-red-400'
    default: return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

function getBloodDotColor(res: string): string {
  switch (res) {
    case 'ปกติ': return 'bg-amber-500'
    case 'ปลอดภัย': return 'bg-lime-500'
    case 'มีความเสี่ยง': return 'bg-emerald-500'
    case 'ไม่ปลอดภัย': return 'bg-rose-600'
    default: return 'bg-slate-300'
  }
}

onMounted(() => {
  if (props.active) {
    loadRecords()
  }
})

watch(() => props.active, (newVal) => {
  if (newVal) {
    loadRecords()
  }
})

defineExpose({
  refresh: loadRecords,
  applyExternalFilter
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header Control Panel Card -->
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
      <!-- Title & Summary Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <h2 class="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span>ทะเบียนเกษตรกรที่ได้รับการคัดกรอง</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              พบ {{ filteredRecords.length }} จาก {{ records.length }} ราย
            </span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            คลิกหรือแตะที่แถวเพื่อดูรายละเอียดฉบับเต็มและประวัติการติดตามผล
          </p>
        </div>

        <!-- Export CSV Button -->
        <div class="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            @click="exportCSV"
            class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <svg class="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span class="hidden sm:inline">ส่งออก</span>
            <span>Excel (CSV)</span>
          </button>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="space-y-3">
        <!-- Search Input -->
        <div class="relative w-full">
          <input
            type="text"
            aria-label="ค้นหาทะเบียนเกษตรกร"
            v-model="searchQuery"
            placeholder="ค้นหาชื่อ, นามสกุล, เลขบัตรประชาชน 13 หลัก, ที่อยู่, พืชที่ปลูก, หรือหน่วยบริการ..."
            class="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-slate-50/50"
          >
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-1 text-xs font-bold"
            aria-label="ล้างคำค้นหา"
          >
            ✕
          </button>
        </div>

        <!-- Secondary Filter Dropdowns -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <!-- Health Center Dropdown -->
          <div>
            <select
              aria-label="กรองหน่วยบริการ"
              v-model="healthCenterFilter"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">🏥 ทุกหน่วยบริการ (รพ.สต. / รพ.)</option>
              <option v-for="hc in HEALTH_CENTERS" :key="hc" :value="hc">{{ hc }}</option>
            </select>
          </div>

          <!-- Blood Status Dropdown -->
          <div>
            <select
              aria-label="กรองผลตรวจเลือด"
              v-model="bloodFilter"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">🩸 ทุกผลตรวจเลือด (Cholinesterase)</option>
              <option value="UNSAFE">⚠️ ผลเลือดผิดปกติ (เสี่ยง / ไม่ปลอดภัย)</option>
              <option value="TESTED">✓ ตรวจเลือดแล้วทั้งหมด</option>
              <option value="NORMAL">🟠 ปกติ (ส้มเหลือง)</option>
              <option value="SAFE">🟢 ปลอดภัย (เหลืองอมเขียว)</option>
              <option value="UNTESTED">⚪ ยังไม่ได้ตรวจเลือด</option>
            </select>
          </div>

          <!-- Follow-up Toggle & Reset Button -->
          <div class="flex items-center space-x-2">
            <button
              type="button"
              @click="followUpOnly = !followUpOnly"
              :class="[
                'flex-1 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 border',
                followUpOnly
                  ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              ]"
            >
              <span>📅 เฉพาะเคสที่ต้องติดตาม</span>
            </button>
            <button
              type="button"
              @click="clearAllFilters"
              class="px-2.5 py-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 text-xs font-semibold"
              title="ล้างตัวกรองทั้งหมด"
            >
              ล้าง
            </button>
          </div>
        </div>

        <!-- Quick Filter Horizontal Chips for Risk Level -->
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1 border-t border-slate-100">
          <button
            type="button"
            @click="setQuickRiskFilter('ALL')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0',
              riskFilter === 'ALL'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            ทั้งหมด ({{ filterCounts.all }})
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('HIGH_RISK')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'HIGH_RISK'
                ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            ]"
          >
            กลุ่มเสี่ยงสูงขึ้นไป ({{ filterCounts.highRisk }})
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('มีความเสี่ยงต่ำ')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'มีความเสี่ยงต่ำ'
                ? 'bg-emerald-100 text-emerald-900 font-bold border-emerald-400 shadow-xs'
                : 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            ]"
          >
            เสี่ยงต่ำ
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('มีความเสี่ยงปานกลาง')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'มีความเสี่ยงปานกลาง'
                ? 'bg-amber-100 text-amber-900 font-bold border-amber-400 shadow-xs'
                : 'bg-amber-50/60 text-amber-800 border-amber-200 hover:bg-amber-100'
            ]"
          >
            เสี่ยงปานกลาง
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('มีความเสี่ยงค่อนข้างสูง')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'มีความเสี่ยงค่อนข้างสูง'
                ? 'bg-orange-100 text-orange-900 font-bold border-orange-400 shadow-xs'
                : 'bg-orange-50/60 text-orange-800 border-orange-200 hover:bg-orange-100'
            ]"
          >
            เสี่ยงค่อนข้างสูง
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('มีความเสี่ยงสูง')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'มีความเสี่ยงสูง'
                ? 'bg-rose-100 text-rose-900 font-bold border-rose-400 shadow-xs'
                : 'bg-rose-50/60 text-rose-800 border-rose-200 hover:bg-rose-100'
            ]"
          >
            เสี่ยงสูง
          </button>

          <button
            type="button"
            @click="setQuickRiskFilter('มีความเสี่ยงสูงมาก')"
            :class="[
              'px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition flex-shrink-0 border',
              riskFilter === 'มีความเสี่ยงสูงมาก'
                ? 'bg-red-200 text-red-950 font-bold border-red-500 shadow-xs'
                : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
            ]"
          >
            เสี่ยงสูงมาก
          </button>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- RESPONSIVE LIST: Desktop Table (hidden md:table) + Mobile Cards   -->
    <!-- ================================================================= -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12 text-slate-400 text-xs">
        <div class="inline-flex items-center space-x-2">
          <svg class="animate-spin w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>กำลังโหลดข้อมูลทะเบียนเกษตรกร...</span>
        </div>
      </div>

      <div v-else-if="loadError" role="alert" class="px-5 py-12 text-center">
        <div class="mx-auto max-w-md space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <svg class="mx-auto h-8 w-8 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <p class="font-bold text-rose-950">ไม่สามารถโหลดทะเบียนเกษตรกรได้</p>
            <p class="mt-1 text-sm text-rose-800">{{ loadError }} ข้อมูลว่างที่เห็นไม่ได้หมายความว่าไม่มีรายการในระบบ</p>
          </div>
          <button type="button" @click="loadRecords" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800">
            ลองโหลดอีกครั้ง
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredRecords.length === 0" class="text-center py-12 text-slate-500 p-4">
        <div class="max-w-xs mx-auto space-y-2">
          <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-base">
            🔍
          </div>
          <p class="font-bold text-slate-800 text-xs">ไม่พบข้อมูลเกษตรกรตามเงื่อนไขที่ค้นหา</p>
          <p class="text-xs text-slate-400">ลองล้างคำค้นหา หรือเปลี่ยนตัวกรองระดับความเสี่ยง</p>
          <button
            type="button"
            @click="clearAllFilters"
            class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      </div>

      <!-- Desktop View: Table (hidden on mobile, visible on md+) -->
      <div v-else class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700 min-w-full">
          <thead class="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200 select-none">
            <tr>
              <th class="px-4 py-3 whitespace-nowrap">ผู้รับการคัดกรอง</th>
              <th class="px-4 py-3 whitespace-nowrap text-center">ระดับความเสี่ยง</th>
              <th class="px-4 py-3 whitespace-nowrap text-center">ตรวจเลือด</th>
              <th class="px-4 py-3 whitespace-nowrap text-center">คะแนนพฤติกรรม</th>
              <th class="px-4 py-3 whitespace-nowrap">พืช / หน่วยบริการ</th>
              <th class="px-4 py-3 whitespace-nowrap">วันที่ประเมิน</th>
              <th class="px-4 py-3 text-right whitespace-nowrap">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in filteredRecords"
              :key="item.id"
              tabindex="0"
              @keydown.enter.self="emit('viewDetail', item)"
              @click="emit('viewDetail', item)"
              class="hover:bg-emerald-50/50 cursor-pointer transition-colors group"
              title="คลิกเพื่อดูรายละเอียดฉบับเต็ม"
            >
              <!-- Name & ID -->
              <td class="px-4 py-3">
                <div class="flex items-center space-x-2.5">
                  <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-emerald-200">
                    {{ item.fullname.slice(0, 1) }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 group-hover:text-emerald-900 transition flex items-center space-x-1.5">
                      <span>{{ item.fullname }}</span>
                      <span class="text-xs font-normal text-slate-400">({{ item.age }} ปี)</span>
                    </div>
                    <span class="text-xs text-slate-500 font-mono">{{ formatId(item.citizen_id) }}</span>
                  </div>
                </div>
              </td>

              <!-- Risk Badge -->
              <td class="px-4 py-3 text-center">
                <span :class="['inline-block px-2.5 py-0.5 rounded-lg font-bold text-xs whitespace-nowrap', getRiskBadgeClass(item.risk_level)]">
                  {{ item.risk_level.replace('มีความเสี่ยง', 'เสี่ยง') }}
                </span>
              </td>

              <!-- Blood Status -->
              <td class="px-4 py-3 text-center">
                <div class="inline-flex items-center space-x-1.5">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="getBloodDotColor(item.cholinesterase_result)"></span>
                  <span
                    :class="[
                      'text-xs font-semibold whitespace-nowrap',
                      item.cholinesterase_result === 'ไม่ปลอดภัย' ? 'text-rose-700 font-bold' :
                      item.cholinesterase_result === 'มีความเสี่ยง' ? 'text-amber-700' : 'text-slate-700'
                    ]"
                  >
                    {{ item.cholinesterase_result || 'ยังไม่ตรวจ' }}
                  </span>
                </div>
              </td>

              <!-- Behavior Score -->
              <td class="px-4 py-3 text-center">
                <span class="font-bold text-slate-800">{{ item.total_score }}</span>
                <span class="text-xs text-slate-400">/45</span>
                <span class="text-xs text-slate-400 block font-mono">({{ item.score_a }}+{{ item.score_b }})</span>
              </td>

              <!-- Crops & Health Center -->
              <td class="px-4 py-3 text-slate-700">
                <span class="font-medium truncate block max-w-[150px] text-xs">{{ item.plant_type || item.occupation }}</span>
                <span class="text-xs text-slate-400 truncate block max-w-[150px]">{{ item.health_center }}</span>
              </td>

              <!-- Date -->
              <td class="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                {{ item.eval_date }}
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-right whitespace-nowrap" @click.stop>
                <div class="inline-flex items-center space-x-1">
                  <button
                    type="button"
                    @click="openFollowUpModal(item)"
                    class="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition"
                    aria-label="บันทึกติดตามผล" title="บันทึกติดตามผล"
                  >
                    📅
                  </button>
                  <button
                    type="button"
                    @click="openEditModal(item)"
                    class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    aria-label="แก้ไขข้อมูล" title="แก้ไขข้อมูล"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    @click="openDeleteModal(item)"
                    class="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                    aria-label="ลบข้อมูล" title="ลบข้อมูล"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile View: Cards Layout (visible on small screens, hidden on md+) -->
      <div v-if="filteredRecords.length > 0" class="block md:hidden divide-y divide-slate-100">
        <div
          v-for="item in filteredRecords"
          :key="item.id"
          @click="emit('viewDetail', item)"
          class="p-4 hover:bg-slate-50 transition space-y-2.5 active:bg-slate-100/70"
        >
          <!-- Top Row: Name, Age, Risk Badge -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center space-x-2 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-emerald-200">
                {{ item.fullname.slice(0, 1) }}
              </div>
              <div class="min-w-0">
                <span class="font-bold text-slate-900 text-sm truncate block">{{ item.fullname }}</span>
                <span class="text-slate-500 font-mono text-xs">{{ formatId(item.citizen_id) }} ({{ item.age }} ปี)</span>
              </div>
            </div>
            <span :class="['px-2.5 py-0.5 rounded-lg font-bold text-xs whitespace-nowrap flex-shrink-0', getRiskBadgeClass(item.risk_level)]">
              {{ item.risk_level.replace('มีความเสี่ยง', 'เสี่ยง') }}
            </span>
          </div>

          <!-- Middle Meta Row -->
          <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
            <div>
              <span class="text-slate-500">ผลเจาะเลือด: </span>
              <strong :class="[
                'font-bold',
                item.cholinesterase_result === 'ไม่ปลอดภัย' ? 'text-rose-700' :
                item.cholinesterase_result === 'มีความเสี่ยง' ? 'text-amber-700' : 'text-slate-700'
              ]">
                {{ item.cholinesterase_result || 'ยังไม่ตรวจ' }}
              </strong>
            </div>
            <div>
              <span class="text-slate-500">คะแนนพฤติกรรม: </span>
              <strong class="text-slate-800">{{ item.total_score }}/45</strong>
            </div>
            <div class="col-span-2 text-slate-600 truncate">
              <span class="text-slate-400">พืช/ที่อยู่: </span>{{ item.plant_type }} • {{ item.address || item.health_center }}
            </div>
          </div>

          <!-- Action Buttons for Touch Targets -->
          <div class="flex items-center justify-between gap-2 pt-1" @click.stop>
            <span class="text-xs text-slate-400 font-mono">{{ item.eval_date }}</span>
            <div class="flex items-center space-x-1.5">
              <button
                type="button"
                @click="openFollowUpModal(item)"
                class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                <span>📅 ติดตามผล</span>
              </button>
              <button
                type="button"
                @click="emit('viewDetail', item)"
                class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                ดูฉบับเต็ม
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Farmer Assessment Modal -->
    <EditFarmerModal
      :is-open="isEditModalOpen"
      :record="editingRecord"
      @close="isEditModalOpen = false"
      @saved="handleRecordUpdated"
    />

    <!-- Follow-up Modal -->
    <AddFollowUpModal
      :is-open="isAddFollowUpOpen"
      :record="targetFollowUpRecord"
      @close="isAddFollowUpOpen = false"
      @saved="handleFollowUpSaved"
      @show-toast="(t, m, s) => emit('showToast', t, m, s)"
    />

    <!-- Safe Delete Confirmation Modal -->
    <div
      v-if="isDeleteModalOpen && pendingDeleteRecord"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      v-modal-focus="closeDeleteModal"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center space-x-3 text-rose-600">
          <div class="p-2.5 rounded-xl bg-rose-100 text-base">
            🗑️
          </div>
          <div>
            <h3 class="font-bold text-slate-900 text-sm">ยืนยันการลบข้อมูล</h3>
            <p class="text-xs text-slate-400">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
          </div>
        </div>
        <p class="text-sm text-slate-600 leading-relaxed">
          คุณต้องการลบข้อมูลแบบประเมินของ "<strong>{{ pendingDeleteRecord.fullname }}</strong>" ออกจากระบบใช่หรือไม่?
        </p>
        <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button @click="closeDeleteModal" class="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            ยกเลิก
          </button>
          <button
            @click="confirmDelete"
            :disabled="isDeleting"
            class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition"
          >
            {{ isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
