<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { AssessmentRecord, FollowUpRecord } from '../../types'
import { fetchFollowUps } from '../../services/api'
import AddFollowUpModal from './AddFollowUpModal.vue'

const props = defineProps<{
  record: AssessmentRecord | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', record: AssessmentRecord): void
  (e: 'showToast', title: string, message: string, isSuccess?: boolean): void
}>()

const activeSection = ref<'assessment' | 'followup'>('assessment')
const followUps = ref<FollowUpRecord[]>([])
const loadingFollowUps = ref(false)
const followUpError = ref('')
const isAddFollowUpOpen = ref(false)

async function loadFollowUps() {
  const citizenId = props.record?.citizen_id
  followUps.value = []
  followUpError.value = ''
  if (!citizenId) return
  loadingFollowUps.value = true
  try {
    const list = await fetchFollowUps(citizenId)
    if (props.record?.citizen_id !== citizenId) return
    followUps.value = list.slice().sort((a, b) => {
      const timeA = new Date(a.follow_up_date || a.created_at).getTime()
      const timeB = new Date(b.follow_up_date || b.created_at).getTime()
      return timeB - timeA || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  } catch (err) {
    if (props.record?.citizen_id === citizenId) followUpError.value = 'ไม่สามารถโหลดประวัติติดตามผลได้ กรุณาตรวจการเชื่อมต่อและบริการติดตามผล'
    console.error('Error loading follow-ups:', err)
  } finally {
    loadingFollowUps.value = false
  }
}

watch(() => props.record, (newRec) => {
  if (newRec && props.isOpen) {
    activeSection.value = 'assessment'
    loadFollowUps()
  }
})

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.record) {
    loadFollowUps()
  }
})

function handleFollowUpSaved() {
  loadFollowUps()
  emit('showToast', 'บันทึกสำเร็จ', 'บันทึกประวัติการติดตามผลเรียบร้อยแล้ว', true)
}

function formatId(id: string): string {
  if (!id || id.length !== 13) return id || ''
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12, 13)}`
}

function getRiskBadgeStyle(level: string) {
  switch (level) {
    case 'มีความเสี่ยงต่ำ':
      return {
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-emerald-500/20',
        bar: 'bg-emerald-500',
        desc: 'ผลจัดอยู่ในระดับความเสี่ยงต่ำตามคำตอบที่บันทึกในการประเมินครั้งนี้'
      }
    case 'มีความเสี่ยงปานกลาง':
      return {
        badge: 'bg-amber-100 text-amber-900 border-amber-300 ring-amber-500/20',
        bar: 'bg-amber-500',
        desc: 'มีความเสี่ยงปานกลาง ควรให้คำปรึกษาปรับเปลี่ยนพฤติกรรมการใช้และจัดเก็บสารเคมี'
      }
    case 'มีความเสี่ยงค่อนข้างสูง':
      return {
        badge: 'bg-orange-100 text-orange-900 border-orange-300 ring-orange-500/20',
        bar: 'bg-orange-500',
        desc: 'มีความเสี่ยงสูง ต้องปรับปรุงการสวมใส่อุปกรณ์ PPE และควรได้รับการตรวจเอนไซม์ในเลือด'
      }
    case 'มีความเสี่ยงสูง':
    case 'มีความเสี่ยงสูงมาก':
      return {
        badge: 'bg-rose-100 text-rose-900 border-rose-300 ring-rose-500/20',
        bar: 'bg-rose-600',
        desc: 'ผลจัดอยู่ในกลุ่มความเสี่ยงสูงหรือสูงมากตามคำตอบที่บันทึก ควรให้เจ้าหน้าที่ประเมินการดูแลต่อเนื่อง'
      }
    default:
      return {
        badge: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-400/20',
        bar: 'bg-slate-400',
        desc: 'ยังไม่มีผลการประเมิน'
      }
  }
}

function getBloodSwatch(res: string) {
  switch (res) {
    case 'ปกติ':
      return {
        color: '#f59e0b',
        name: 'แถบสีส้มเหลือง (ปกติ)',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        advice: 'ระดับเอนไซม์ปกติ แนะนำดูแลสุขภาพและใช้อุปกรณ์ป้องกันอย่างต่อเนื่อง'
      }
    case 'ปลอดภัย':
      return {
        color: '#84cc16',
        name: 'แถบสีเหลืองอมเขียว (ปลอดภัย)',
        badge: 'bg-lime-100 text-lime-900 border-lime-300',
        advice: 'ผลคัดกรองอยู่ในกลุ่มปลอดภัย ตรวจติดตามปีละ 1 ครั้ง'
      }
    case 'มีความเสี่ยง':
      return {
        color: '#10b981',
        name: 'แถบสีเขียวอมเหลือง (มีความเสี่ยง)',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        advice: 'เอนไซม์เริ่มลดลง แนะนำให้พักการพ่นสารเคมี สวม PPE เคร่งครัด และนัดตรวจซ้ำใน 2-4 สัปดาห์'
      }
    case 'ไม่ปลอดภัย':
      return {
        color: '#065f46',
        name: 'แถบสีเขียวเข้ม (ไม่ปลอดภัย)',
        badge: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
        advice: 'ผลคัดกรองอยู่ในกลุ่มไม่ปลอดภัย หยุดสัมผัสสารเคมีทันที ส่งต่อพบแพทย์ รพ. เพื่อตรวจยืนยันทางห้องปฏิบัติการ'
      }
    default:
      return {
        color: '#cbd5e1',
        name: 'ยังไม่ได้เจาะเลือด',
        badge: 'bg-slate-100 text-slate-700 border-slate-300',
        advice: 'เกษตรกรกลุ่มเสี่ยงควรได้รับการเจาะเลือดคัดกรองด้วยกระดาษทดสอบ'
      }
  }
}

function printDetail() {
  window.print()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen && !isAddFollowUpOpen.value) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-if="isOpen && record"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto"
    v-modal-focus="() => emit('close')"
    @click.self="emit('close')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">

      <p v-if="followUpError" role="alert" class="text-sm text-rose-800">{{ followUpError }}</p>
      <!-- Top Header & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              แบบประเมินทางการแพทย์ นบก. 1-56
            </span>
            <span class="text-xs text-slate-500">กรมควบคุมโรค กระทรวงสาธารณสุข</span>
          </div>
          <h2 id="modal-title" class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            ใบคัดกรองและประเมินความเสี่ยงสุขภาพเกษตรกร
          </h2>
          <p class="text-xs sm:text-sm text-slate-600">
            หน่วยบริการ: <span class="font-bold text-emerald-800">{{ record.health_center }}</span>
            | วันที่คัดกรอง: <span class="font-semibold text-slate-800">{{ record.eval_date }}</span>
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="isAddFollowUpOpen = true"
            class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>📅 นัดติดตามผล</span>
          </button>

          <button
            type="button"
            @click="emit('edit', record)"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 shadow-xs"
          >
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span>แก้ไขข้อมูล</span>
          </button>

          <button
            type="button"
            @click="printDetail"
            class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center space-x-1.5"
            title="พิมพ์เอกสารนี้"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            <span>พิมพ์</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
            aria-label="ปิดหน้าต่าง"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs between Assessment & Follow-up Timeline -->
      <div class="flex items-center space-x-2 border-b border-slate-200">
        <button
          type="button"
          @click="activeSection = 'assessment'"
          :class="[
            'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2',
            activeSection === 'assessment'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          ]"
        >
          <span>📋 ผลการประเมิน นบก. 1-56 ฉบับเต็ม</span>
        </button>

        <button
          type="button"
          @click="activeSection = 'followup'"
          :class="[
            'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2',
            activeSection === 'followup'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          ]"
        >
          <span>📅 ประวัติการติดตามผล (Timeline)</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            {{ followUps.length }}
          </span>
        </button>
      </div>

      <!-- Main Content Grid -->
      <div v-show="activeSection === 'assessment'" class="space-y-6">

        <!-- SECTION 1: Personal & Demographic Info (2-Col Desktop) -->
        <div class="bg-slate-50/90 rounded-2xl p-4 sm:p-6 border border-slate-200">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>ตอนที่ 1: ข้อมูลทั่วไปและประวัติการทำเกษตรกรรม</span>
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div class="space-y-1">
              <span class="text-xs text-slate-500 font-medium">ชื่อ-นามสกุล:</span>
              <p class="text-base font-bold text-slate-900">{{ record.fullname }}</p>
              <p class="text-xs text-slate-600">เพศ {{ record.gender }} • อายุ {{ record.age }} ปี</p>
            </div>
            <div class="space-y-1">
              <span class="text-xs text-slate-500 font-medium">เลขประจำตัวประชาชน (13 หลัก):</span>
              <p class="font-mono text-base font-bold text-slate-900 tracking-wider">{{ formatId(record.citizen_id) }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-xs text-slate-500 font-medium">ผู้สัมภาษณ์ / บันทึกข้อมูล:</span>
              <p class="text-sm font-semibold text-slate-800">{{ record.interviewer_name || '-' }}</p>
              <p class="text-xs text-slate-500">{{ record.health_center }}</p>
            </div>
            <div class="md:col-span-2 space-y-1">
              <span class="text-xs text-slate-500 font-medium">ที่อยู่ปัจจุบัน:</span>
              <p class="text-sm text-slate-800">{{ record.address || 'ไม่ได้ระบุที่อยู่' }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-xs text-slate-500 font-medium">ลักษณะงานในไร่นา:</span>
              <p class="text-sm font-semibold text-slate-800">{{ record.occupation || 'เกษตรกรทั่วไป' }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-xs text-slate-500 font-medium">พืชหลักที่เพาะปลูก:</span>
              <p class="text-sm font-bold text-emerald-800">{{ record.plant_type || 'ไม่ได้ระบุ' }}</p>
            </div>
            <div class="md:col-span-2 space-y-1">
              <span class="text-xs text-slate-500 font-medium">สารเคมีทางการเกษตรที่ใช้เป็นประจำ:</span>
              <div class="flex flex-wrap gap-1.5 mt-0.5">
                <template v-if="record.chemical_names && record.chemical_names.length > 0">
                  <span
                    v-for="chem in record.chemical_names"
                    :key="chem"
                    class="px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-xs"
                  >
                    {{ chem }}
                  </span>
                </template>
                <span v-else class="text-xs text-slate-400 italic">ไม่มีการบันทึกชื่อสารเคมีเฉพาะ</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: Assessment Scores & Risk Matrix (2-Col Desktop) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <!-- Score Breakdown Card -->
          <div class="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>ตอนที่ 2: คะแนนพฤติกรรม (นบก. 1-56)</span>
              <span class="text-xs text-slate-500 font-normal">เกณฑ์ประเมิน 2 มิติ</span>
            </h3>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-amber-900">พฤติกรรมเสี่ยง (A)</span>
                  <span class="text-xs text-amber-800 font-medium">ข้อ 9-17</span>
                </div>
                <div class="flex items-baseline space-x-1">
                  <span class="text-2xl sm:text-3xl font-black text-amber-900">{{ record.score_a }}</span>
                  <span class="text-xs text-amber-800">/ 27 คะแนน</span>
                </div>
                <div class="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden">
                  <div class="bg-amber-600 h-full rounded-full" :style="{ width: `${Math.min(100, (record.score_a / 27) * 100)}%` }"></div>
                </div>
                <p class="text-xs text-amber-800 leading-tight pt-1">
                  ยิ่งคะแนนสูง หมายถึงมีพฤติกรรมเสี่ยงต่อการสัมผัสสารเคมีสูง
                </p>
              </div>

              <div class="p-4 rounded-xl bg-teal-50/80 border border-teal-200 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-teal-900">พฤติกรรมป้องกัน (B)</span>
                  <span class="text-xs text-teal-800 font-medium">ข้อ 18-23</span>
                </div>
                <div class="flex items-baseline space-x-1">
                  <span class="text-2xl sm:text-3xl font-black text-teal-900">{{ record.score_b }}</span>
                  <span class="text-xs text-teal-800">/ 18 คะแนน</span>
                </div>
                <div class="w-full bg-teal-200/70 h-2 rounded-full overflow-hidden">
                  <div class="bg-teal-600 h-full rounded-full" :style="{ width: `${Math.min(100, (record.score_b / 18) * 100)}%` }"></div>
                </div>
                <p class="text-xs text-teal-800 leading-tight pt-1">
                  คำนวณแบบสเกลกลับด้าน (การสวม PPE และล้างมือ)
                </p>
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">คะแนนพฤติกรรมรวมทั้งสิ้น (A + B):</span>
              <span class="text-lg font-black text-slate-900">{{ record.total_score }} / 45 คะแนน</span>
            </div>
          </div>

          <!-- Risk Matrix Classification Card -->
          <div class="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>ผลการจัดระดับความเสี่ยง (Risk Matrix Level)</span>
                <span class="text-xs font-mono text-slate-500">สูตรกระทรวงสาธารณสุข</span>
              </h3>

              <div class="p-4 rounded-2xl border ring-2" :class="getRiskBadgeStyle(record.risk_level).badge">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs uppercase font-bold tracking-wider opacity-80">ระดับความเสี่ยงที่ระบุ</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 shadow-xs">
                    {{ record.risk_level }}
                  </span>
                </div>
                <p class="text-xl sm:text-2xl font-black">{{ record.risk_level }}</p>
                <p class="text-xs sm:text-sm mt-2 leading-relaxed opacity-95">
                  {{ getRiskBadgeStyle(record.risk_level).desc }}
                </p>
              </div>
            </div>

            <!-- Symptoms Observed -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-xs font-bold text-slate-700 block mb-1.5">อาการผิดปกติที่ตรวจพบหลังสัมผัสสารเคมี:</span>
              <div v-if="record.symptoms && record.symptoms.length > 0" class="flex flex-wrap gap-1.5">
                <span
                  v-for="sym in record.symptoms"
                  :key="sym"
                  class="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium"
                >
                  ⚠️ {{ sym }}
                </span>
              </div>
              <p v-else class="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>ไม่พบอาการผิดปกติในระยะที่ทำการสำรวจ</span>
              </p>
            </div>
          </div>
        </div>

        <!-- SECTION 3: Blood Test Result & Protocol (2-Col Desktop) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <!-- Blood Test Swatch Card -->
          <div class="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>ตอนที่ 3: ผลตรวจเอนไซม์โคลีนเอสเตอเรสในเลือด</span>
              <span class="text-xs text-slate-500 font-normal">Reactive Paper Test</span>
            </h3>

            <div class="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div
                class="w-16 h-16 rounded-2xl shadow-inner border-2 border-white flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                :style="{ backgroundColor: getBloodSwatch(record.cholinesterase_result).color }"
              >
                แถบสี
              </div>
              <div class="space-y-1">
                <span class="text-xs text-slate-500 font-medium">ผลการตรวจด้วยกระดาษทดสอบ:</span>
                <div class="flex items-center space-x-2">
                  <span class="text-lg font-bold text-slate-900">{{ record.cholinesterase_result || 'ยังไม่ได้ตรวจ' }}</span>
                  <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold border', getBloodSwatch(record.cholinesterase_result).badge]">
                    {{ getBloodSwatch(record.cholinesterase_result).name }}
                  </span>
                </div>
                <p class="text-xs text-slate-600">
                  {{ getBloodSwatch(record.cholinesterase_result).advice }}
                </p>
              </div>
            </div>

            <!-- Standard Reference Swatches -->
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
              <span class="text-xs font-bold text-slate-600">เกณฑ์เปรียบเทียบมาตรฐาน 4 ระดับ (กรมวิทยาศาสตร์การแพทย์):</span>
              <div class="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div class="p-1.5 rounded-lg border border-slate-200 bg-amber-50">
                  <div class="w-3.5 h-3.5 rounded-full bg-amber-500 mx-auto mb-1"></div>
                  <span class="font-bold text-amber-900">ปกติ</span>
                </div>
                <div class="p-1.5 rounded-lg border border-slate-200 bg-lime-50">
                  <div class="w-3.5 h-3.5 rounded-full bg-lime-500 mx-auto mb-1"></div>
                  <span class="font-bold text-lime-900">ปลอดภัย</span>
                </div>
                <div class="p-1.5 rounded-lg border border-slate-200 bg-emerald-50">
                  <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 mx-auto mb-1"></div>
                  <span class="font-bold text-emerald-900">มีความเสี่ยง</span>
                </div>
                <div class="p-1.5 rounded-lg border border-slate-200 bg-emerald-950 text-white">
                  <div class="w-3.5 h-3.5 rounded-full bg-emerald-900 border border-white mx-auto mb-1"></div>
                  <span class="font-bold text-white">ไม่ปลอดภัย</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Official Clinical Recommendations -->
          <div class="bg-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center space-x-2 text-emerald-300 mb-2">
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                <h3 class="text-sm font-bold tracking-wide">แนวทางการดูแลและส่งต่อทางการแพทย์ (รพ.สต. / รพ.)</h3>
              </div>

              <div class="space-y-3 text-xs leading-relaxed text-emerald-100">
                <div v-if="record.cholinesterase_result === 'ไม่ปลอดภัย'" class="p-3 bg-rose-900/60 rounded-xl border border-rose-500/50 text-rose-100">
                  <strong class="text-white block mb-1">🚨 มาตรการฉุกเฉินระดับสีแดง:</strong>
                  หยุดสัมผัสและใช้สารเคมีทุกประเภททันที ออกใบส่งต่อ (Refer) พบแพทย์ ณ โรงพยาบาลประจำอำเภอเพื่อตรวจยืนยันทางห้องปฏิบัติการ (Serum Cholinesterase) พร้อมติดตามเฝ้าระวังอาการทางระบบประสาท
                </div>
                <div v-else-if="record.cholinesterase_result === 'มีความเสี่ยง'" class="p-3 bg-amber-900/60 rounded-xl border border-amber-500/50 text-amber-100">
                  <strong class="text-white block mb-1">⚠️ มาตรการเฝ้าระวังเข้มข้น:</strong>
                  เจ้าหน้าที่สาธารณสุขให้คำปรึกษาปรับเปลี่ยนพฤติกรรม สวมใส่อุปกรณ์ PPE ครบถ้วน (หน้ากาก ถุงมือยาง รองเท้าบูท) และนัดหมายเจาะเลือดตรวจซ้ำภายใน 2-4 สัปดาห์
                </div>
                <div v-else class="p-3 bg-emerald-900/60 rounded-xl border border-emerald-500/30 text-emerald-200">
                  <strong class="text-white block mb-1">✓ มาตรการส่งเสริมสุขภาพ:</strong>
                  แนะนำเทคนิคการผสมและการฉีดพ่นสารเคมีอย่างปลอดภัย หลีกเลี่ยงการพ่นเหนือลม และนัดหมายเข้ารับการตรวจคัดกรองประจำปีถัดไป
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-emerald-800 text-xs text-emerald-300 flex justify-between items-center">
              <span>ลงชื่อผู้ตรวจ: {{ record.interviewer_name || '-' }}</span>
              <span>ตำแหน่ง: เจ้าหน้าที่สาธารณสุข</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Follow-up Timeline -->
      <div v-show="activeSection === 'followup'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>บันทึกประวัติการติดตามผลและการดูแลต่อเนื่อง</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              บันทึกการตรวจเลือดซ้ำ การตรวจเยี่ยมติดตามอุปกรณ์ PPE และการส่งต่อแพทย์
            </p>
          </div>

          <button
            type="button"
            @click="isAddFollowUpOpen = true"
            class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>+ บันทึกติดตามผลใหม่</span>
          </button>
        </div>

        <!-- Timeline Container -->
        <div v-if="loadingFollowUps" class="py-12 text-center text-slate-400 text-xs">
          กำลังโหลดประวัติการติดตามผล...
        </div>

        <div v-else-if="followUpError" role="alert" class="p-8 text-rose-800">{{ followUpError }}</div>
        <div v-else-if="followUps.length === 0" class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-lg">
            📅
          </div>
          <p class="text-xs font-bold text-slate-700">ยังไม่มีบันทึกการติดตามผลสำหรับเกษตรกรรายนี้</p>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            เกษตรกรกลุ่มเสี่ยงควรได้รับการนัดเจาะเลือดซ้ำใน 2-4 สัปดาห์ หรือติดตามการสวมใส่อุปกรณ์ PPE
          </p>
          <button
            type="button"
            @click="isAddFollowUpOpen = true"
            class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            + บันทึกการติดตามผลครั้งแรก
          </button>
        </div>

        <div v-else class="relative border-l-2 border-amber-200 ml-4 pl-5 space-y-5 py-2">
          <div
            v-for="fu in followUps"
            :key="fu.id"
            class="relative space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 hover:border-amber-300 transition"
          >
            <!-- Timeline Node Indicator -->
            <div class="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs"></div>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-slate-900 text-sm">📅 วันที่: {{ fu.follow_up_date }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {{ fu.follow_up_type }}
                </span>
              </div>
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border self-start sm:self-auto',
                  fu.result === 'ปกติ/ปลอดภัยแล้ว' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                  fu.result === 'ส่งต่อเรียบร้อยแล้ว' ? 'bg-teal-50 text-teal-800 border-teal-300' :
                  fu.result === 'ไม่สามารถติดต่อได้' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                  'bg-rose-50 text-rose-800 border-rose-300'
                ]"
              >
                {{ fu.result }}
              </span>
            </div>

            <p class="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80 font-medium">
              {{ fu.notes || 'ไม่มีบันทึกเพิ่มเติม' }}
            </p>

            <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>ผู้บันทึก: <strong class="text-slate-600">{{ fu.responsible_person }}</strong></span>
              <span class="font-mono text-xs">{{ fu.created_at ? fu.created_at.slice(0, 10) : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between pt-4 border-t border-slate-200">
        <span class="text-xs text-slate-500">
          รหัสอ้างอิงเอกสาร: NBK-{{ record.id }}
        </span>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-100 font-bold text-slate-700 transition"
          >
            ปิด
          </button>
          <button
            type="button"
            @click="emit('edit', record)"
            class="px-5 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span>แก้ไขข้อมูล</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Modal for adding follow-up record -->
    <AddFollowUpModal
      :is-open="isAddFollowUpOpen"
      :record="record"
      @close="isAddFollowUpOpen = false"
      @saved="handleFollowUpSaved"
      @show-toast="(t, m, s) => emit('showToast', t, m, s)"
    />
  </div>
</template>
