<script setup lang="ts">
import { computed } from 'vue'
import type { AssessmentRecord } from '../../types'

const props = defineProps<{
  isOpen: boolean
  record: AssessmentRecord | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'viewDetail', record: AssessmentRecord): void
  (e: 'addFollowUp', record: AssessmentRecord): void
}>()

function formatId(id: string): string {
  if (!id || id.length !== 13) return id || ''
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12, 13)}`
}

const riskInfo = computed(() => {
  if (!props.record) return { label: '', color: '', bg: '', border: '', icon: '', desc: '', advice: '' }
  const r = props.record.risk_level
  switch (r) {
    case 'มีความเสี่ยงต่ำ':
      return {
        label: 'มีความเสี่ยงต่ำ (ปลอดภัย)',
        color: 'text-emerald-800',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        icon: '🟢',
        desc: 'พฤติกรรมมีความปลอดภัย สัมผัสสารเคมีระดับต่ำ ไม่มีอาการเตือนอันตราย',
        advice: 'ตรวจคัดกรองติดตามสุขภาพประจำปี แนะนำรักษาพฤติกรรมความปลอดภัยต่อเนื่อง'
      }
    case 'มีความเสี่ยงปานกลาง':
      return {
        label: 'มีความเสี่ยงปานกลาง',
        color: 'text-amber-800',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        icon: '🟡',
        desc: 'เริ่มมีพฤติกรรมเสี่ยงหรือมีอาการระคายเคืองเบื้องต้น (กลุ่ม 1)',
        advice: 'ให้สุขศึกษาการใช้อุปกรณ์ป้องกันอันตรายส่วนบุคคล (PPE) และสังเกตอาการ'
      }
    case 'มีความเสี่ยงค่อนข้างสูง':
      return {
        label: 'มีความเสี่ยงค่อนข้างสูง',
        color: 'text-orange-800',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        icon: '🟠',
        desc: 'มีพฤติกรรมเสี่ยงสูง หรือมีอาการของระบบทางเดินอาหาร/ประสาท (กลุ่ม 2)',
        advice: 'จำเป็นต้องตรวจคัดกรองระดับเอนไซม์ในเลือด (Reactive Paper) และปรับลดการสัมผัส'
      }
    case 'มีความเสี่ยงสูง':
      return {
        label: 'มีความเสี่ยงสูง',
        color: 'text-rose-800',
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        icon: '🔴',
        desc: 'มีความเสี่ยงอันตราย สัมผัสสารเคมีอย่างต่อเนื่อง หรือมีอาการกลุ่ม 3 (กล้ามเนื้อเกร็ง/มือสั่น)',
        advice: 'ต้องตรวจเลือดทันที พักงานพ่นสารเคมี และนัดตรวจติดตามประเมินซ้ำ'
      }
    case 'มีความเสี่ยงสูงมาก':
      return {
        label: 'มีความเสี่ยงสูงมาก (อันตรายวิกฤต)',
        color: 'text-red-900',
        bg: 'bg-red-50',
        border: 'border-red-400',
        icon: '⛔',
        desc: 'พฤติกรรมเสี่ยงขั้นวิกฤต ร่วมกับมีอาการพิษทางระบบประสาทรุนแรง',
        advice: 'หยุดสัมผัสสารเคมีโดยเด็ดขาด ส่งต่อแพทย์ รพ. ตรวจวินิจฉัยและเจาะเลือดทางห้องปฏิบัติการทันที'
      }
    default:
      return {
        label: r,
        color: 'text-slate-800',
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        icon: '⚪',
        desc: '',
        advice: ''
      }
  }
})

// Identified risk factors from the questionnaire
const detectedRiskFactors = computed(() => {
  if (!props.record) return []
  const factors: string[] = []
  const rec = props.record

  if (rec.chemical_names && rec.chemical_names.length > 0) {
    factors.push(`ใช้สารเคมีกำจัดศัตรูพืช: ${rec.chemical_names.join(', ')}`)
  }

  if (rec.answers_a) {
    if (rec.answers_a.q9 === 3) factors.push('ใช้สารเคมีกำจัดแมลงทุกครั้งที่ทำงาน')
    if (rec.answers_a.q10 === 3) factors.push('ใช้สารเคมีกำจัดวัชพืชทุกครั้งที่ฉีดพ่น')
    if (rec.answers_a.q11 >= 2) factors.push('อุปกรณ์/ถังบรรจุสารเคมีมีรอยรั่วซึม')
    if (rec.answers_a.q12 >= 2) factors.push('ได้รับสัมผัสสารเคมีกำจัดศัตรูพืชขณะทำงาน')
    if (rec.answers_a.q13 >= 2) factors.push('เสื้อผ้าเปียกชุ่มสารเคมีระหว่างปฏิบัติงาน')
    if (rec.answers_a.q15 >= 2) factors.push('สูบบุหรี่หรือยาเส้นขณะทำงานกับสารเคมี')
    if (rec.answers_a.q16 >= 2) factors.push('รับประทานอาหารหรือดื่มน้ำในบริเวณฉีดพ่น')
    if (rec.answers_a.q17 >= 2) factors.push('ดื่มเครื่องดื่มแอลกอฮอล์ในบริเวณทำงาน')
  }

  if (rec.answers_b) {
    if (rec.answers_b.q19 >= 2) factors.push('ไม่สวมถุงมือยางป้องกันสารเคมีอย่างสม่ำเสมอ')
    if (rec.answers_b.q20 >= 2) factors.push('ไม่สวมรองเท้าบู๊ทป้องกันสารเคมี')
    if (rec.answers_b.q21 >= 2) factors.push('ไม่ล้างมือก่อนพักรับประทานอาหาร/ดื่มน้ำ')
  }

  if (rec.symptoms && rec.symptoms.length > 0) {
    factors.push(`มีอาการผิดปกติ: ${rec.symptoms.join(', ')}`)
  }

  if (rec.cholinesterase_result === 'มีความเสี่ยง' || rec.cholinesterase_result === 'ไม่ปลอดภัย') {
    factors.push(`ผลตรวจเลือดเอนไซม์ตกค้าง: ${rec.cholinesterase_result}`)
  }

  return factors
})

function printReport() {
  window.print()
}
</script>

<template>
  <div 
    v-if="isOpen && record" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-5 my-8">
      <!-- Header: Success Tag & Close -->
      <div class="flex items-start justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">ผลการประเมินความเสี่ยง นบก. 1-56</h3>
            <p class="text-xs text-slate-500 font-mono">วันที่ประเมิน: {{ record.eval_date }} • {{ record.health_center }}</p>
          </div>
        </div>
        <button 
          @click="emit('close')" 
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 text-sm font-bold"
          aria-label="ปิดหน้าต่างสรุปผล"
        >
          ✕
        </button>
      </div>

      <!-- Farmer Identity Banner -->
      <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-slate-900 text-sm block">{{ record.fullname }}</span>
          <span class="text-slate-500 font-mono">{{ formatId(record.citizen_id) }} (อายุ {{ record.age }} ปี)</span>
        </div>
        <div class="text-right">
          <span class="text-slate-600 font-medium block">{{ record.plant_type }}</span>
          <span class="text-slate-400 text-[11px]">{{ record.occupation }}</span>
        </div>
      </div>

      <!-- Prominent Risk Level Badge & Recommendation -->
      <div :class="['p-4 rounded-2xl border space-y-2', riskInfo.bg, riskInfo.border]">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-lg">{{ riskInfo.icon }}</span>
            <span :class="['font-black text-sm sm:text-base', riskInfo.color]">
              {{ riskInfo.label }}
            </span>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/80 border border-slate-200 text-slate-800">
            คะแนนพฤติกรรม: {{ record.total_score }} / 45
          </span>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed font-medium">
          {{ riskInfo.desc }}
        </p>
        <div class="pt-2 border-t border-slate-200/60 flex items-start space-x-1.5 text-xs">
          <strong class="text-slate-900 flex-shrink-0">คำแนะนำ:</strong>
          <span class="text-slate-700">{{ riskInfo.advice }}</span>
        </div>
      </div>

      <!-- Scores & Blood Test Grid -->
      <div class="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <span class="text-slate-500 block text-[11px]">พฤติกรรมเสี่ยง (A)</span>
          <strong class="text-amber-800 text-sm font-bold">{{ record.score_a }} / 27</strong>
        </div>
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <span class="text-slate-500 block text-[11px]">พฤติกรรมป้องกัน (B)</span>
          <strong class="text-teal-800 text-sm font-bold">{{ record.score_b }} / 18</strong>
        </div>
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <span class="text-slate-500 block text-[11px]">ผลเลือด Reactive</span>
          <strong :class="['text-xs font-bold block mt-0.5', 
            record.cholinesterase_result === 'ไม่ปลอดภัย' ? 'text-rose-700' :
            record.cholinesterase_result === 'มีความเสี่ยง' ? 'text-amber-700' : 'text-emerald-700'
          ]">
            {{ record.cholinesterase_result || 'ยังไม่ได้ตรวจ' }}
          </strong>
        </div>
      </div>

      <div v-if="detectedRiskFactors.length > 0" class="space-y-1.5">
        <h4 class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>ปัจจัยเสี่ยงสำคัญที่ตรวจพบ:</span>
        </h4>
        <ul class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 max-h-36 overflow-y-auto">
          <li v-for="(factor, idx) in detectedRiskFactors" :key="idx" class="flex items-start space-x-1.5">
            <span class="text-slate-400 font-bold">•</span>
            <span>{{ factor }}</span>
          </li>
        </ul>
      </div>
      <div v-else class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
        <span class="text-base">✓</span>
        <span>ไม่พบพฤติกรรมเสี่ยงหรืออาการผิดปกติที่มีนัยสำคัญทางคลินิก</span>
      </div>

      <!-- Next Actions -->
      <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <button 
          type="button" 
          @click="emit('close')"
          class="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition order-2 sm:order-1"
        >
          ปิดหน้าต่าง
        </button>
        <div class="flex items-center space-x-2 w-full sm:w-auto order-1 sm:order-2">
          <button 
            type="button"
            @click="printReport"
            class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
            title="พิมพ์ผลการประเมิน"
          >
            <span>🖨️ พิมพ์</span>
          </button>
          <button 
            type="button"
            @click="emit('addFollowUp', record)"
            class="flex-1 sm:flex-initial px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1"
          >
            <span>📅 นัดติดตามผล</span>
          </button>
          <button 
            type="button"
            @click="emit('viewDetail', record)"
            class="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1"
          >
            <span>ดูประวัติละเอียด</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
