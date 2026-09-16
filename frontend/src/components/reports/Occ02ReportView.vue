<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CenterBreakdownItem, AssessmentRecord, ReportOCC02 } from '../../types'
// @ts-ignore - html2pdf.js bundle
import html2pdf from 'html2pdf.js'

const props = defineProps<{
  records: AssessmentRecord[]
  centerBreakdowns: CenterBreakdownItem[]
  occ02: ReportOCC02
  provinceName: string
  fiscalYear: string
  reportLogo?: string
}>()

const totalHighRisk = computed(() => {
  return props.records.filter(r => 
    r.risk_level === 'มีความเสี่ยงค่อนข้างสูง' || 
    r.risk_level === 'มีความเสี่ยงสูง' || 
    r.risk_level === 'มีความเสี่ยงสูงมาก'
  ).length
})

const totalBloodTested = computed(() => {
  return props.records.filter(r => 
    ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)
  ).length
})

const totalAbnormal = computed(() => {
  return props.records.filter(r => 
    r.cholinesterase_result === 'ไม่ปลอดภัย' || r.cholinesterase_result === 'มีความเสี่ยง'
  ).length
})

const totalCoveragePct = computed(() => {
  if (totalHighRisk.value === 0) return '0.0%'
  return `${((totalBloodTested.value / totalHighRisk.value) * 100).toFixed(1)}%`
})

const isGeneratingPdf = ref(false)
const pdfContainer = ref<HTMLElement | null>(null)

async function downloadPdf() {
  if (!pdfContainer.value) return
  isGeneratingPdf.value = true

  const opt = {
    margin: 6,
    filename: `แบบรายงาน_OCC-นบ02_จ.${props.provinceName}_ปี${props.fiscalYear}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
    pagebreak: { mode: ['css', 'legacy'] }
  }

  try {
    await html2pdf().set(opt).from(pdfContainer.value).save()
  } catch (err) {
    console.error('PDF Generation Error:', err)
  } finally {
    isGeneratingPdf.value = false
  }
}

defineExpose({
  downloadPdf
})
</script>

<template>
  <div class="space-y-4">
    <!-- Action Bar for OCC-02 -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-100/80 rounded-2xl border border-slate-200 no-print">
      <div class="flex items-center space-x-2">
        <span class="inline-block w-3 h-3 rounded-full bg-teal-600 animate-pulse"></span>
        <span class="text-xs sm:text-sm font-bold text-slate-800">
          รายงานสรุปภาพรวมระดับอำเภอ (OCC-นบ 02 ตาม Requirement ผู้ใช้งานและโครงสร้างระบบปัจจุบัน)
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <button 
          type="button"
          @click="downloadPdf"
          :disabled="isGeneratingPdf"
          class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 shadow-xs cursor-pointer"
        >
          <svg v-if="!isGeneratingPdf" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <svg v-else class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ isGeneratingPdf ? 'กำลังประมวลผล PDF...' : '📥 ดาวน์โหลดเอกสาร PDF (OCC-02)' }}</span>
        </button>
      </div>
    </div>

    <!-- PDF Printable Sheet: Landscape A4 Mode -->
    <div ref="pdfContainer" class="text-slate-900 font-sarabun">
      <div class="a4-sheet bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-slate-300 min-h-[900px] flex flex-col justify-between">
        <div>
          <!-- Official Header -->
          <div class="text-center space-y-2 border-b-2 border-slate-900 pb-4 mb-5">
            <div class="flex justify-between items-start">
              <div class="text-left text-xs font-semibold text-slate-700 w-44 shrink-0">
                <!-- Header left spacing -->
              </div>
              <div class="h-16 flex items-center justify-center min-w-[80px] flex-1">
                <img 
                  v-if="reportLogo" 
                  :src="reportLogo" 
                  alt="โลโก้รายงาน" 
                  class="max-h-16 max-w-[140px] object-contain mx-auto" 
                />
              </div>
              <div class="text-right text-xs font-mono font-bold text-slate-900 w-44 shrink-0">
                <span class="inline-block whitespace-nowrap px-2.5 py-1 border border-slate-800 rounded-md">แบบรายงาน OCC-นบ 02</span>
              </div>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              แบบสรุปผลการดำเนินงานจัดบริการอาชีวอนามัยระดับอำเภอ (OCC-นบ 02)
            </h1>
            <p class="text-sm font-semibold text-slate-700">
              สรุปภาพรวมการเฝ้าระวังและคัดกรองความเสี่ยงสุขภาพเกษตรกร ประจำปีงบประมาณ {{ fiscalYear }}
            </p>
            <p class="text-xs text-slate-600 font-normal mt-0.5">
              (รายงานสรุปตาม Requirement ผู้ใช้งานและโครงสร้างระบบปัจจุบัน)
            </p>

            <div class="flex items-center justify-center gap-6 text-sm font-medium text-slate-800 pt-1">
              <p>จังหวัด: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-2">{{ provinceName }}</span></p>
              <p>อำเภอ: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-2">บ้านแพ้ว</span></p>
            </div>
          </div>

          <!-- District Summary Table -->
          <div class="space-y-3 mb-6">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">
              ตารางสรุปผลงานรายหน่วยบริการปฐมภูมิในสังกัดอำเภอบ้านแพ้ว (รพ.สต.)
            </h3>

            <div class="overflow-x-auto border-2 border-slate-900 rounded-lg">
              <table class="w-full text-left text-xs sm:text-sm border-collapse">
                <thead class="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-900 text-center">
                  <tr>
                    <th class="p-2 border-r border-slate-400 w-10">ที่</th>
                    <th class="p-2 border-r border-slate-400 text-left">ชื่อหน่วยบริการ (รพ.สต.)</th>
                    <th class="p-2 border-r border-slate-400 w-24">คัดกรองสะสม (คน)</th>
                    <th class="p-2 border-r border-slate-400 w-28">กลุ่มเสี่ยงสูงที่ต้องเจาะเลือด (คน)</th>
                    <th class="p-2 border-r border-slate-400 w-24">ตรวจเลือดจริง (คน)</th>
                    <th class="p-2 border-r border-slate-400 w-24">ผลผิดปกติ (คน)</th>
                    <th class="p-2 w-28">ร้อยละการตรวจเลือด (%)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-300 text-slate-800">
                  <tr 
                    v-for="(c, idx) in centerBreakdowns" 
                    :key="c.center"
                    :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'"
                  >
                    <td class="p-2 text-center border-r border-slate-300 font-mono">{{ idx + 1 }}</td>
                    <td class="p-2 border-r border-slate-300 font-semibold">{{ c.center }}</td>
                    <td class="p-2 text-center border-r border-slate-300 font-bold text-slate-900">{{ c.evaluated }}</td>
                    <td class="p-2 text-center border-r border-slate-300 text-amber-900 font-bold">{{ c.highRisk }}</td>
                    <td class="p-2 text-center border-r border-slate-300 text-teal-900 font-bold">{{ c.bloodTested }}</td>
                    <td class="p-2 text-center border-r border-slate-300 text-rose-900 font-bold">{{ c.unsafe }}</td>
                    <td class="p-2 text-center font-bold">
                      <span 
                        v-if="c.highRisk > 0"
                        class="px-2 py-0.5 rounded-full text-xs font-bold"
                        :class="c.coverage >= 80 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'"
                      >
                        {{ c.coverage.toFixed(1) }}%
                      </span>
                      <span v-else class="text-xs text-slate-400 font-normal">
                        ไม่มีผู้เข้าเกณฑ์
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-900 text-center">
                  <tr>
                    <td class="p-2.5 border-r border-slate-400" colspan="2">รวมทั้งสิ้นในเขตอำเภอบ้านแพ้ว</td>
                    <td class="p-2.5 border-r border-slate-400 font-black">{{ records.length }}</td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-amber-950">
                      {{ totalHighRisk }}
                    </td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-teal-950">
                      {{ totalBloodTested }}
                    </td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-rose-950">
                      {{ totalAbnormal }}
                    </td>
                    <td class="p-2.5 font-black text-emerald-950">
                      {{ totalCoveragePct }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Section: Dual Signatures -->
          <div class="pt-6 border-t-2 border-slate-900 space-y-4 break-inside-avoid">
            <div class="grid grid-cols-2 gap-6 text-center text-xs sm:text-sm">
              <div class="p-4 rounded-lg border border-slate-300 bg-slate-50/70 space-y-2 break-inside-avoid">
                <p class="font-bold text-slate-900">ผู้รวบรวมรายงาน</p>
                <div class="pt-8 pb-1">
                  <span class="inline-block border-b border-dotted border-slate-800 w-48"></span>
                </div>
                <p class="font-semibold text-slate-800">(.........................................................)</p>
                <p class="text-xs text-slate-700 font-medium">(ผู้รับผิดชอบงานอาชีวเวชกรรมและอนามัยสิ่งแวดล้อม รพ.บ้านแพ้ว)</p>
                <p class="text-xs text-slate-500">วันที่ .......... เดือน .................... พ.ศ. {{ fiscalYear }}</p>
              </div>

              <div class="p-4 rounded-lg border border-slate-300 bg-slate-50/70 space-y-2 break-inside-avoid">
                <p class="font-bold text-slate-900">ผู้รับรอง</p>
                <div class="pt-8 pb-1">
                  <span class="inline-block border-b border-dotted border-slate-800 w-48"></span>
                </div>
                <p class="font-semibold text-slate-800">(.........................................................)</p>
                <p class="text-xs text-slate-700 font-medium">(หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว)</p>
                <p class="text-xs text-slate-500">วันที่ .......... เดือน .................... พ.ศ. {{ fiscalYear }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-300 flex justify-between items-center text-xs text-slate-500">
          <span>แบบรายงาน OCC-นบ 02</span>
          <span class="font-bold text-slate-700">(จบรายงาน)</span>
        </div>
      </div>
    </div>
  </div>
</template>
