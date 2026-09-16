<script setup lang="ts">
import { ref } from 'vue'
import type { CenterBreakdownItem, AssessmentRecord, ReportOCC02 } from '../../types'
// @ts-ignore - html2pdf.js bundle
import html2pdf from 'html2pdf.js'

const props = defineProps<{
  records: AssessmentRecord[]
  centerBreakdowns: CenterBreakdownItem[]
  occ02: ReportOCC02
  provinceName: string
  fiscalYear: string
}>()

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
          รายงานสรุปภาพรวมระดับอำเภอ/จังหวัด (OCC-นบ 02)
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
              <div class="text-left text-xs font-semibold text-slate-700">
                <p>แบบฟอร์มกระทรวงสาธารณสุข</p>
                <p>กลุ่มงานอาชีวอนามัย สสจ.</p>
              </div>
              <div class="w-14 h-14 mx-auto flex items-center justify-center">
                <svg class="w-12 h-12 text-teal-900" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M50 5 L55 25 L75 25 L60 38 L65 58 L50 45 L35 58 L40 38 L25 25 L45 25 Z" fill="#065f46" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#065f46" stroke-width="3" />
                  <text x="50" y="80" font-size="10" text-anchor="middle" font-weight="bold" fill="#065f46">สธ.</text>
                </svg>
              </div>
              <div class="text-right text-xs font-mono font-bold text-slate-900">
                <span class="px-2.5 py-1 border border-slate-800 rounded-md">แบบ OCC-นบ 02</span>
              </div>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              แบบสรุปผลการดำเนินงานจัดบริการอาชีวอนามัยระดับอำเภอ / จังหวัด
            </h1>
            <p class="text-sm font-semibold text-slate-700">
              สรุปภาพรวมการเฝ้าระวังและคัดกรองความเสี่ยงสุขภาพเกษตรกร ประจำปีงบประมาณ {{ fiscalYear }}
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
                    <th class="p-2 border-r border-slate-400 w-24">กลุ่มเสี่ยงสูง (คน)</th>
                    <th class="p-2 border-r border-slate-400 w-24">ตรวจเลือด (คน)</th>
                    <th class="p-2 border-r border-slate-400 w-24">ผลผิดปกติ (คน)</th>
                    <th class="p-2 w-24">ความครอบคลุม (%)</th>
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
                        class="px-2 py-0.5 rounded-full text-xs font-bold"
                        :class="c.coverage >= 80 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'"
                      >
                        {{ c.coverage }}%
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-900 text-center">
                  <tr>
                    <td class="p-2.5 border-r border-slate-400" colspan="2">รวมทั้งสิ้นในเขตอำเภอบ้านแพ้ว</td>
                    <td class="p-2.5 border-r border-slate-400 font-black">{{ records.length }}</td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-amber-950">
                      {{ records.filter(r => r.risk_level.includes('สูง')).length }}
                    </td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-teal-950">
                      {{ records.filter(r => Boolean(r.cholinesterase_result)).length }}
                    </td>
                    <td class="p-2.5 border-r border-slate-400 font-black text-rose-950">
                      {{ records.filter(r => r.cholinesterase_result === 'ไม่ปลอดภัย' || r.cholinesterase_result === 'มีความเสี่ยง').length }}
                    </td>
                    <td class="p-2.5 font-black text-emerald-950">
                      {{ occ02.blood_testing_coverage }}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Official Signatures -->
          <div class="pt-6 border-t-2 border-slate-900 space-y-4">
            <div class="grid grid-cols-2 gap-6 text-center text-xs sm:text-sm">
              <div class="p-4 rounded-lg border border-slate-300 bg-slate-50/70 space-y-2">
                <p class="font-bold text-slate-900">ผู้รวบรวมรายงานระดับอำเภอ</p>
                <div class="pt-8 pb-1">
                  <span class="inline-block border-b border-dotted border-slate-800 w-48"></span>
                </div>
                <p class="font-semibold text-slate-800">(ผู้รับผิดชอบงานอาชีวอนามัย สสอ.)</p>
                <p class="text-xs text-slate-600">สำนักงานสาธารณสุขอำเภอบ้านแพ้ว</p>
              </div>

              <div class="p-4 rounded-lg border border-slate-300 bg-slate-50/70 space-y-2">
                <p class="font-bold text-slate-900">นายแพทย์สาธารณสุขจังหวัด / ผู้มีอำนาจรับรอง</p>
                <div class="pt-8 pb-1">
                  <span class="inline-block border-b border-dotted border-slate-800 w-48"></span>
                </div>
                <p class="font-semibold text-slate-800">(นายแพทย์สาธารณสุขจังหวัดสมุทรสาคร)</p>
                <p class="text-xs text-slate-600">สำนักงานสาธารณสุขจังหวัดสมุทรสาคร</p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-300 flex justify-between items-center text-xs text-slate-500">
          <span>แบบรายงานราชการ OCC-นบ 02 • กรมควบคุมโรค กระทรวงสาธารณสุข</span>
          <span class="font-bold text-slate-700">(จบรายงาน)</span>
        </div>
      </div>
    </div>
  </div>
</template>
