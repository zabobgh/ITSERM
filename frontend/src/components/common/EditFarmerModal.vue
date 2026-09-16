<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AssessmentRecord, AssessmentSubmission } from '../../types'
import { HEALTH_CENTERS } from '../../constants/healthCenters'
import { updateAssessment } from '../../services/api'
import { calculateRisk, symptomsCatalog } from '../../services/mockService'

const props = defineProps<{
  record: AssessmentRecord | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', record: AssessmentRecord): void
}>()

const isSaving = ref(false)
const errorMessage = ref('')

// Form state
const form = ref<AssessmentSubmission>({
  citizen_id: '',
  fullname: '',
  gender: 'ชาย',
  age: 45,
  address: '',
  occupation: '1. เพาะปลูก (ทำเอง)',
  plant_type: '',
  eval_date: '',
  interviewer_name: '',
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

const symptomGroups = [
  { group: 1, title: 'กลุ่มอาการที่ 1', items: symptomsCatalog.g1 },
  { group: 2, title: 'กลุ่มอาการที่ 2', items: symptomsCatalog.g2 },
  { group: 3, title: 'กลุ่มอาการที่ 3', items: symptomsCatalog.g3 }
]

// Real-time calculated score
const liveScores = computed(() => {
  let scoreA = 0
  for (let i = 9; i <= 17; i++) {
    const k = `q${i}` as keyof typeof form.value.answers_a
    scoreA += (form.value.answers_a[k] || 1)
  }

  let scoreB = 0
  for (let i = 18; i <= 23; i++) {
    const k = `q${i}` as keyof typeof form.value.answers_b
    scoreB += (form.value.answers_b[k] || 1)
  }

  const totalScore = scoreA + scoreB

  const { highest: highestGroup, level: riskLevel, requireBlood } =
    calculateRisk(scoreA, scoreB, form.value.symptoms)

  return { scoreA, scoreB, totalScore, highestGroup, riskLevel, requireBlood }
})

watch(() => props.record, (rec) => {
  if (rec) {
    form.value = {
      citizen_id: rec.citizen_id,
      fullname: rec.fullname,
      gender: rec.gender,
      age: rec.age,
      address: rec.address,
      occupation: rec.occupation,
      plant_type: rec.plant_type,
      eval_date: rec.eval_date,
      interviewer_name: rec.interviewer_name,
      health_center: rec.health_center || 'รพ.สต.หลักสาม',
      answers_a: rec.answers_a ? { ...rec.answers_a } : { q9: 1, q10: 1, q11: 1, q12: 1, q13: 1, q14: 1, q15: 1, q16: 1, q17: 1 },
      answers_b: rec.answers_b ? { ...rec.answers_b } : { q18: 1, q19: 1, q20: 1, q21: 1, q22: 1, q23: 1 },
      symptoms: rec.symptoms ? [...rec.symptoms] : [],
      cholinesterase_result: rec.cholinesterase_result || '',
      chemical_names: rec.chemical_names ? [...rec.chemical_names] : []
    }
  }
}, { immediate: true })

function toggleSymptom(item: string) {
  const cur = form.value.symptoms || []
  const idx = cur.indexOf(item)
  if (idx >= 0) {
    cur.splice(idx, 1)
  } else {
    cur.push(item)
  }
}

async function handleSave() {
  if (!props.record) return
  if (!props.record.answers_a || !props.record.answers_b) {
    errorMessage.value = 'ไม่พบคำตอบเดิมครบถ้วน ไม่สามารถคำนวณและบันทึกทับผลเดิมได้'
    return
  }
  if (!form.value.fullname.trim()) {
    errorMessage.value = 'กรุณาระบุชื่อ-นามสกุลของเกษตรกร'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    const updated = await updateAssessment(props.record.id, form.value)
    emit('saved', updated)
    emit('close')
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการแก้ไขได้'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen && record"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
    v-modal-focus="() => emit('close')"
    @click.self="emit('close')"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden font-sans">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              แก้ไขข้อมูลแบบประเมิน นบก. 1-56
            </h3>
            <p class="text-xs text-slate-500">
              ผู้รับบริการ: <strong class="text-slate-800">{{ form.fullname }}</strong> (บัตร ปชช: {{ form.citizen_id }})
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-800">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-medium">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- 1. ข้อมูลทั่วไป -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. ข้อมูลทั่วไปของเกษตรกรและผู้ประเมิน
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="EditFarmerModal-form-fullname" class="block text-xs font-medium text-slate-600 mb-1">ชื่อ-นามสกุล *</label>
              <input id="EditFarmerModal-form-fullname"
                v-model="form.fullname"
                type="text"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-age" class="block text-xs font-medium text-slate-600 mb-1">อายุ (ปี)</label>
              <input id="EditFarmerModal-form-age"
                v-model.number="form.age"
                type="number"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-gender" class="block text-xs font-medium text-slate-600 mb-1">เพศ</label>
              <select id="EditFarmerModal-form-gender"
                v-model="form.gender"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label for="EditFarmerModal-form-address" class="block text-xs font-medium text-slate-600 mb-1">ที่อยู่ปัจจุบัน</label>
              <input id="EditFarmerModal-form-address"
                v-model="form.address"
                type="text"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-eval_date" class="block text-xs font-medium text-slate-600 mb-1">วันที่ประเมิน</label>
              <input id="EditFarmerModal-form-eval_date"
                v-model="form.eval_date"
                type="date"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-occupation" class="block text-xs font-medium text-slate-600 mb-1">ลักษณะงานเกษตร</label>
              <input id="EditFarmerModal-form-occupation"
                v-model="form.occupation"
                type="text"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-plant_type" class="block text-xs font-medium text-slate-600 mb-1">ชนิดพืชที่ปลูก</label>
              <input id="EditFarmerModal-form-plant_type"
                v-model="form.plant_type"
                type="text"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label for="EditFarmerModal-form-health_center" class="block text-xs font-medium text-slate-600 mb-1">หน่วยบริการ</label>
              <select id="EditFarmerModal-form-health_center"
                v-model="form.health_center"
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option v-for="c in HEALTH_CENTERS" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 2. ผลการตรวจเลือด Reactive Paper -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. ผลการตรวจสารเคมีในเลือด (Reactive Paper)
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label
              v-for="opt in [
                { val: 'ปกติ', color: '#f59e0b', desc: 'สีส้มเหลือง' },
                { val: 'ปลอดภัย', color: '#84cc16', desc: 'สีเหลืองเขียว' },
                { val: 'มีความเสี่ยง', color: '#10b981', desc: 'สีเขียวเหลือง' },
                { val: 'ไม่ปลอดภัย', color: '#047857', desc: 'สีเขียวขี้ม้า' }
              ]"
              :key="opt.val"
              :class="[
                'p-3 rounded-xl border cursor-pointer transition flex items-center space-x-2.5',
                form.cholinesterase_result === opt.val ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
              ]"
            >
              <input type="radio" v-model="form.cholinesterase_result" :value="opt.val" class="sr-only"/>
              <span class="w-4 h-4 rounded-full border border-black/10 shrink-0" :style="{ backgroundColor: opt.color }"></span>
              <div>
                <p class="font-bold text-xs text-slate-900 leading-tight">{{ opt.val }}</p>
                <p class="text-xs text-slate-400">{{ opt.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- 3. อาการผิดปกติ (Symptoms) -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            3. อาการผิดปกติที่พบ (คลิกเพื่อเลือกหรือยกเลิก)
          </h4>
          <div class="space-y-3">
            <div v-for="sg in symptomGroups" :key="sg.group" class="bg-white p-3 rounded-lg border border-slate-200">
              <p class="text-xs font-bold text-slate-700 mb-2">{{ sg.title }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in sg.items"
                  :key="item"
                  type="button"
                  @click="toggleSymptom(item)"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                    (form.symptoms || []).includes(item)
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  ]"
                >
                  <span v-if="(form.symptoms || []).includes(item)">✓ </span>{{ item }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- สรุปผลการคำนวณแบบสด (Live Matrix Calculation) -->
        <div class="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
          <div>
            <span class="text-xs text-emerald-800 font-semibold">ผลการประเมินความเสี่ยงที่คำนวณได้:</span>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-base font-black text-emerald-950">{{ liveScores.riskLevel }}</span>
              <span class="text-xs text-slate-600">(คะแนนรวม: {{ liveScores.totalScore }} คะแนน / กลุ่มอาการสูงสุด: {{ liveScores.highestGroup }})</span>
            </div>
          </div>
          <span
            :class="[
              'px-3 py-1 rounded-full text-xs font-bold',
              liveScores.requireBlood ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800'
            ]"
          >
            {{ liveScores.requireBlood ? 'ต้องเจาะเลือดตรวจ' : 'ความเสี่ยงต่ำ' }}
          </span>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="isSaving"
          class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
        >
          <span v-if="isSaving">กำลังบันทึก...</span>
          <span v-else>💾 บันทึกการเปลี่ยนแปลง</span>
        </button>
      </div>
    </div>
  </div>
</template>
