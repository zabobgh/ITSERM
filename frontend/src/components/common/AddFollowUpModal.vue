<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { AssessmentRecord, FollowUpRecord } from '../../types'
import { createFollowUp } from '../../services/api'

const props = defineProps<{
  isOpen: boolean
  record: AssessmentRecord | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', followUp: FollowUpRecord): void
  (e: 'showToast', title: string, message: string, isSuccess?: boolean): void
}>()

// Calculate default follow-up date (2 weeks from today)
function getDefaultFollowUpDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

const form = reactive({
  follow_up_date: getDefaultFollowUpDate(),
  responsible_person: 'เจ้าหน้าที่สาธารณสุข',
  follow_up_type: 'นัดตรวจเลือดซ้ำ 2-4 สัปดาห์' as FollowUpRecord['follow_up_type'],
  result: 'ยังมีความเสี่ยง/รอผลตรวจ' as FollowUpRecord['result'],
  notes: ''
})

const errors = reactive({
  follow_up_date: '',
  responsible_person: '',
  notes: ''
})

const isSubmitting = ref(false)

watch(() => props.record, (newRec) => {
  if (newRec) {
    form.follow_up_date = getDefaultFollowUpDate()
    form.responsible_person = newRec.interviewer_name || 'เจ้าหน้าที่สาธารณสุข'
    form.follow_up_type = newRec.cholinesterase_result === 'ไม่ปลอดภัย' 
      ? 'ส่งต่อพบแพทย์ รพ.' 
      : 'นัดตรวจเลือดซ้ำ 2-4 สัปดาห์'
    form.result = 'ยังมีความเสี่ยง/รอผลตรวจ'
    form.notes = newRec.cholinesterase_result === 'ไม่ปลอดภัย'
      ? 'ผลตรวจเลือดไม่ปลอดภัย ส่งต่อ รพ. เพื่อตรวจยืนยันและรับการรักษา'
      : 'นัดตรวจเอนไซม์โคลีนเอสเตอเรสซ้ำ และติดตามการปรับพฤติกรรมความปลอดภัย'
  }
})

function validate(): boolean {
  let valid = true
  errors.follow_up_date = ''
  errors.responsible_person = ''
  errors.notes = ''

  if (!form.follow_up_date) {
    errors.follow_up_date = 'กรุณาระบุวันที่นัดติดตามผล'
    valid = false
  }

  if (!form.responsible_person.trim()) {
    errors.responsible_person = 'กรุณาระบุชื่อเจ้าหน้าที่ผู้รับผิดชอบ'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return
  if (!props.record) return

  isSubmitting.value = true
  try {
    const newRecord = await createFollowUp({
      citizen_id: props.record.citizen_id,
      assessment_id: props.record.id,
      follow_up_date: form.follow_up_date,
      responsible_person: form.responsible_person,
      follow_up_type: form.follow_up_type,
      result: form.result,
      notes: form.notes
    })
    emit('showToast', 'บันทึกสำเร็จ', 'บันทึกข้อมูลการติดตามผลเรียบร้อยแล้ว', true)
    emit('saved', newRecord)
    emit('close')
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกการติดตามผล'
    emit('showToast', 'ข้อผิดพลาด', errorMsg, false)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div 
    v-if="isOpen && record" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-5 my-8">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base">
            📅
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">บันทึกการติดตามผลเกษตรกร</h3>
            <p class="text-xs text-slate-500 font-mono">{{ record.fullname }} ({{ record.risk_level }})</p>
          </div>
        </div>
        <button 
          @click="emit('close')" 
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 text-sm font-bold"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs">
        <!-- Date & Responsible Person -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-800 mb-1">
              วันที่นัดติดตามผล <span class="text-rose-500">*</span>
            </label>
            <input 
              type="date" 
              v-model="form.follow_up_date"
              class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
            >
            <p v-if="errors.follow_up_date" class="text-rose-600 mt-1 font-medium">{{ errors.follow_up_date }}</p>
          </div>

          <div>
            <label class="block font-semibold text-slate-800 mb-1">
              เจ้าหน้าที่ผู้รับผิดชอบ <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              v-model="form.responsible_person"
              placeholder="ชื่อ - สกุล เจ้าหน้าที่"
              class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
            >
            <p v-if="errors.responsible_person" class="text-rose-600 mt-1 font-medium">{{ errors.responsible_person }}</p>
          </div>
        </div>

        <!-- Follow-up Type -->
        <div>
          <label class="block font-semibold text-slate-800 mb-1">
            ประเภทการติดตามผล <span class="text-rose-500">*</span>
          </label>
          <select 
            v-model="form.follow_up_type"
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="นัดตรวจเลือดซ้ำ 2-4 สัปดาห์">นัดตรวจเลือดซ้ำ 2-4 สัปดาห์ (Cholinesterase Test)</option>
            <option value="ติดตามการสวมใส่อุปกรณ์ PPE">ติดตามการสวมใส่อุปกรณ์ PPE และการล้างทำความสะอาด</option>
            <option value="ส่งต่อพบแพทย์ รพ.">ส่งต่อพบแพทย์ รพ. เพื่อตรวจยืนยันทางห้องปฏิบัติการ</option>
            <option value="ติดตามอาการพิษเฉียบพลัน">ติดตามอาการพิษเฉียบพลัน/ระคายเคือง</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>

        <!-- Status / Result -->
        <div>
          <label class="block font-semibold text-slate-800 mb-1">
            สถานะ / ผลการติดตาม <span class="text-rose-500">*</span>
          </label>
          <select 
            v-model="form.result"
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="ยังมีความเสี่ยง/รอผลตรวจ">ยังมีความเสี่ยง / รอนัดตรวจซ้ำ</option>
            <option value="ปกติ/ปลอดภัยแล้ว">ปกติ / ปลอดภัยแล้ว (ผลเลือดเป็นปกติ)</option>
            <option value="ส่งต่อเรียบร้อยแล้ว">ส่งต่อพบแพทย์เรียบร้อยแล้ว</option>
            <option value="ไม่สามารถติดต่อได้">ไม่สามารถติดต่อได้</option>
          </select>
        </div>

        <!-- Notes -->
        <div>
          <label class="block font-semibold text-slate-800 mb-1">บันทึกเพิ่มเติม / แผนการดูแล</label>
          <textarea 
            v-model="form.notes"
            rows="3"
            placeholder="รายละเอียดการให้คำแนะนำ ผลการตรวจเยี่ยม หรือข้อสังเกตเพิ่มเติม..."
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
          ></textarea>
        </div>

        <!-- Action buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button 
            type="button" 
            @click="emit('close')"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
          >
            ยกเลิก
          </button>
          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <span>{{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการติดตาม' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
