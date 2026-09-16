<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { OCC01DetailedStats } from '../../types'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const props = defineProps<{
  stats: OCC01DetailedStats
  healthCenter: string
  provinceName: string
  fiscalYear: string
  reportingPeriod: '6month' | '12month'
  reportLogo?: string
}>()

const isGeneratingPdf = ref(false)
const pdfContainer = ref<HTMLElement | null>(null)

async function downloadPdf() {
  if (!pdfContainer.value) return
  isGeneratingPdf.value = true
  await nextTick()

  try {
    const sheets = pdfContainer.value.querySelectorAll<HTMLElement>('.a4-sheet')
    if (!sheets || sheets.length === 0) return

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i]
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      if (i > 0) {
        pdf.addPage('a4', 'portrait')
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    }

    pdf.save(`แบบรายงาน_OCC-นบ01_${props.healthCenter}_ปี${props.fiscalYear}.pdf`)
  } catch (err) {
    console.error('PDF Generation Error:', err)
  } finally {
    isGeneratingPdf.value = false
  }
}

function printReport() {
  window.print()
}

defineExpose({
  downloadPdf,
  printReport
})
</script>

<template>
  <div class="space-y-5">
    <!-- Document Status Banner for OCC-01 (Screen only) -->
    <div class="flex items-center justify-between p-3.5 sm:p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 no-print text-xs sm:text-sm">
      <div class="flex items-center space-x-2.5">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
        <span class="font-bold text-emerald-950">
          ตัวอย่างเอกสารราชการ A4 (มาตรฐาน 2 หน้าต่อเนื่อง จบรายงานพอดี)
        </span>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          type="button"
          @click="printReport"
          class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          <span>พิมพ์</span>
        </button>
        <button 
          type="button"
          @click="downloadPdf"
          :disabled="isGeneratingPdf"
          class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
        >
          <svg v-if="!isGeneratingPdf" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>{{ isGeneratingPdf ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF' }}</span>
        </button>
      </div>
    </div>

    <!-- PDF Printable Container: 2 Continuous A4 Sheets -->
    <div 
      ref="pdfContainer" 
      :class="[
        'text-slate-900 font-sarabun mx-auto transition-all',
        isGeneratingPdf ? 'pdf-export-mode' : 'space-y-8 max-w-4xl'
      ]"
    >
      
      <!-- =================================================================== -->
      <!-- A4 SHEET 1 (หน้า 1): ข้อมูลทั่วไป และ ข้อ 5 การประเมินความเสี่ยง นบก. 1-56 -->
      <!-- =================================================================== -->
      <div class="a4-sheet bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-300 flex flex-col justify-between relative overflow-hidden">
        <div>
          <!-- Header Official -->
          <div class="text-center space-y-1.5 border-b-2 border-slate-900 pb-3 mb-4">
            <div class="flex justify-between items-start">
              <div class="text-left text-xs font-semibold text-slate-700 w-32 shrink-0">
                <!-- Header left spacing -->
              </div>
              <div class="h-14 flex items-center justify-center min-w-[70px] flex-1">
                <img 
                  v-if="reportLogo" 
                  :src="reportLogo" 
                  alt="โลโก้รายงาน" 
                  class="max-h-14 max-w-[130px] object-contain mx-auto" 
                />
              </div>
              <div class="text-right text-xs font-mono font-bold text-slate-900 w-32 shrink-0">
                <span class="inline-block whitespace-nowrap px-2.5 py-1 border border-slate-800 rounded-md">แบบ OCC-นบ 01</span>
              </div>
            </div>

            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
              แบบรายงานผลการดำเนินงานจัดบริการอาชีวอนามัยในหน่วยบริการปฐมภูมิ
            </h1>
            <p class="text-xs sm:text-sm font-semibold text-slate-700">
              (การเฝ้าระวังและคัดกรองความเสี่ยงสุขภาพเกษตรกรจากการใช้สารเคมีกำจัดศัตรูพืช)
            </p>

            <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs sm:text-sm font-medium text-slate-800 pt-1">
              <p>หน่วยบริการ: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-1.5">{{ healthCenter }}</span></p>
              <p>อำเภอ: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-1.5">บ้านแพ้ว</span></p>
              <p>จังหวัด: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-1.5">{{ provinceName }}</span></p>
              <p>ปีงบประมาณ: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-1.5">{{ fiscalYear }}</span></p>
              <p>รอบระยะเวลา: <span class="font-bold border-b border-dotted border-slate-800 pb-0.5 px-1.5">{{ reportingPeriod === '6month' ? 'รอบ 6 เดือน (1 ต.ค. - 31 มี.ค.)' : 'รอบ 12 เดือน (1 ต.ค. - 30 ก.ย.)' }}</span></p>
            </div>
          </div>

          <!-- Section 1 -->
          <div class="space-y-2 mb-4">
            <h2 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-800"></span>
              <span>ส่วนที่ 1: ข้อมูลพื้นฐานเกษตรกรในเขตพื้นที่รับผิดชอบ</span>
            </h2>
            <div class="grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div class="p-3 rounded-xl border border-slate-300 bg-slate-50 flex justify-between items-center">
                <span class="text-slate-700 font-medium">1. เกษตรกรที่ขึ้นทะเบียนทั้งหมด (เป้าหมาย):</span>
                <span class="text-base font-bold text-slate-900">350 คน</span>
              </div>
              <div class="p-3 rounded-xl border border-slate-300 bg-slate-50 flex justify-between items-center">
                <span class="text-slate-700 font-medium">2. เกษตรกรที่ได้รับการคัดกรองสะสมจริง:</span>
                <span class="text-base font-bold text-emerald-900">{{ stats.total }} คน</span>
              </div>
            </div>
          </div>

          <!-- Section 2 Part A: Item 5 Risk Screening -->
          <div class="space-y-2">
            <h2 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-800"></span>
              <span>ส่วนที่ 2: ผลการประเมินความเสี่ยงสุขภาพเกษตรกร (นบก. 1-56)</span>
            </h2>

            <table class="w-full text-left text-xs sm:text-[13px] border-2 border-slate-900 border-collapse leading-tight">
              <thead class="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-900 text-center">
                <tr>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-12">ข้อ</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 text-left">กิจกรรมและตัวชี้วัดการประเมิน</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-20">หน่วยนับ</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-24">ผลงานจริง</th>
                  <th class="py-1.5 px-2 w-24">ร้อยละ (%)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-300 text-slate-800">
                <tr class="bg-emerald-50/70 font-bold text-emerald-950">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-mono">5</td>
                  <td class="py-1.5 px-2 border-r border-slate-300" colspan="4">
                    การประเมินความเสี่ยงจากการสัมผัสสารเคมีกำจัดศัตรูพืช ด้วยแบบ นบก. 1-56
                  </td>
                </tr>
                <tr>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-500">5.1</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-4 font-semibold">จำนวนเกษตรกรที่ได้รับการประเมินความเสี่ยงทั้งหมด</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-bold text-emerald-900">{{ stats.total }}</td>
                  <td class="py-1.5 px-2 text-center font-bold">100.0%</td>
                </tr>
                <tr class="bg-slate-50/60">
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">1) ระดับมีความเสี่ยงต่ำ (คะแนนรวม ≤ 24 ไม่มีอาการ)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.lowRisk }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.lowRiskPct }}</td>
                </tr>
                <tr>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">2) ระดับมีความเสี่ยงปานกลาง (คะแนนรวม 25-30)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.medRisk }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.medRiskPct }}</td>
                </tr>
                <tr class="bg-slate-50/60">
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">3) ระดับมีความเสี่ยงค่อนข้างสูง (มีอาการทางร่างกายระดับ 2)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.highRisk }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.highRiskPct }}</td>
                </tr>
                <tr>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">4) ระดับมีความเสี่ยงสูง และ มีความเสี่ยงสูงมาก (อาการระดับ 3)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.veryHighRisk }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.veryHighRiskPct }}</td>
                </tr>
                <tr class="bg-amber-50 font-bold border-t-2 border-slate-800">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-amber-900 font-mono">5.2</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-4 text-amber-950">
                    รวมเกษตรกรกลุ่มเสี่ยงสูง (ข้อ 3 + ข้อ 4) ที่ต้องส่งเจาะเลือดเอนไซม์
                  </td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-700">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-black text-amber-900">{{ stats.totalHighGroup }}</td>
                  <td class="py-1.5 px-2 text-center font-black text-amber-900">{{ stats.totalHighGroupPct }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer Page 1 -->
        <div class="pt-3 border-t border-slate-300 flex justify-between items-center text-xs text-slate-500">
          <span>แบบรายงาน OCC-นบ 01</span>
          <span class="font-bold text-slate-700">(หน้า 1 จาก 2 — มีต่อหน้า 2)</span>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- A4 SHEET 2 (หน้า 2): ข้อ 6 ตรวจเลือด, ข้อ 7-9 ส่งต่อ และกล่องลงนามรับรอง -->
      <!-- =================================================================== -->
      <div class="a4-sheet bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-300 flex flex-col justify-between relative overflow-hidden">
        <div>
          <!-- Header Page 2 -->
          <div class="text-center space-y-1 border-b-2 border-slate-900 pb-2 mb-3">
            <div class="flex justify-between items-center text-xs text-slate-700">
              <span class="inline-block whitespace-nowrap font-bold text-slate-800">แบบ OCC-นบ 01 (ต่อ)</span>
              <span>หน่วยบริการ: <strong>{{ healthCenter }}</strong> | ปีงบประมาณ <strong>{{ fiscalYear }}</strong></span>
            </div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">
              การตรวจคัดกรองระดับเอนไซม์และการจัดการทางการแพทย์
            </h2>
          </div>

          <!-- Section 2 Part B: Item 6 Blood Screen -->
          <div class="space-y-2 mb-3">
            <h3 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <span class="w-2 h-2 rounded-full bg-teal-800"></span>
              <span>ข้อ 6: การตรวจคัดกรองระดับเอนไซม์โคลีนเอสเตอเรส (Reactive Paper)</span>
            </h3>

            <table class="w-full text-left text-xs sm:text-[13px] border-2 border-slate-900 border-collapse leading-tight">
              <thead class="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-900 text-center">
                <tr>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-12">ข้อ</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 text-left">กิจกรรมและผลตรวจทางห้องปฏิบัติการ</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-20">หน่วยนับ</th>
                  <th class="py-1.5 px-2 border-r border-slate-400 w-24">ผลงานจริง</th>
                  <th class="py-1.5 px-2 w-24">ร้อยละ (%)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-300 text-slate-800">
                <tr class="bg-teal-50/70 font-bold text-teal-950">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-mono">6</td>
                  <td class="py-1.5 px-2 border-r border-slate-300" colspan="4">
                    การเจาะเลือดตรวจคัดกรองด้วยกระดาษทดสอบ (Reactive Paper)
                  </td>
                </tr>
                <tr>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-500">6.1</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-3 font-semibold">จำนวนเกษตรกรที่ได้รับการเจาะเลือดตรวจคัดกรองจริง (จากกลุ่มเสี่ยงสูงที่ต้องส่งเจาะเลือด {{ stats.totalHighGroup }} คน)</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-bold text-teal-900">{{ stats.bloodTested }}</td>
                  <td class="py-1.5 px-2 text-center font-bold">{{ stats.bloodTestedPct }}</td>
                </tr>
                <tr class="bg-slate-50/60">
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">1) ผลตรวจ "ปกติ" (แถบสีส้มเหลือง)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.normal }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.normalPct }}</td>
                </tr>
                <tr>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">2) ผลตรวจ "ปลอดภัย" (แถบสีเหลืองอมเขียว)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-medium">{{ stats.safe }}</td>
                  <td class="py-1 px-2 text-center font-medium">{{ stats.safePct }}</td>
                </tr>
                <tr class="bg-slate-50/60">
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-amber-900 font-semibold">3) ผลตรวจ "มีความเสี่ยง" (แถบสีเขียวอมเหลือง)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-bold text-amber-800">{{ stats.atRisk }}</td>
                  <td class="py-1 px-2 text-center font-bold text-amber-800">{{ stats.atRiskPct }}</td>
                </tr>
                <tr>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-400">-</td>
                  <td class="py-1 px-2 border-r border-slate-300 pl-6 text-rose-900 font-semibold">4) ผลตรวจ "ไม่ปลอดภัย" (แถบสีเขียวเข้ม)</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 text-slate-500">คน</td>
                  <td class="py-1 px-2 text-center border-r border-slate-300 font-bold text-rose-800">{{ stats.unsafe }}</td>
                  <td class="py-1 px-2 text-center font-bold text-rose-800">{{ stats.unsafePct }}</td>
                </tr>
                <tr class="bg-rose-50 font-bold border-t-2 border-slate-800">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-rose-900 font-mono">6.2</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-3 text-rose-950">
                    รวมเกษตรกรผลตรวจเลือดผิดปกติ ("มีความเสี่ยง" + "ไม่ปลอดภัย")
                  </td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-700">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-black text-rose-900">{{ stats.abnormalBlood }}</td>
                  <td class="py-1.5 px-2 text-center font-black text-rose-900">{{ stats.abnormalBloodPct }}</td>
                </tr>

                <!-- Item 7-9 Interventions -->
                <tr class="bg-slate-100 font-bold text-slate-900">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-mono">7</td>
                  <td class="py-1.5 px-2 border-r border-slate-300" colspan="4">
                    การส่งต่อพบแพทย์ และมาตรการด้านอาชีวอนามัย
                  </td>
                </tr>
                <tr>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-500">7.1</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-3 text-slate-800">
                    จำนวนเกษตรกรผลเลือด "ไม่ปลอดภัย" ที่ส่งต่อพบแพทย์ รพ. เพื่อตรวจยืนยันแล็บ
                  </td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-bold text-rose-800">{{ stats.referred }}</td>
                  <td class="py-1.5 px-2 text-center font-semibold">{{ stats.unsafe > 0 ? '100.0%' : '-' }}</td>
                </tr>
                <tr class="bg-slate-50/60">
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-500">7.2</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-3 text-slate-800">
                    จำนวนเกษตรกรผลเลือด "มีความเสี่ยง" ที่นัดเจาะเลือดซ้ำภายใน 2-4 สัปดาห์
                  </td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-bold text-amber-800">{{ stats.retestNeeded }}</td>
                  <td class="py-1.5 px-2 text-center font-semibold">{{ stats.atRisk > 0 ? '100.0%' : '-' }}</td>
                </tr>
                <tr>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 text-slate-500">7.3</td>
                  <td class="py-1.5 px-2 border-r border-slate-300 pl-3 text-slate-800">
                    จำนวนเกษตรกรที่ได้รับคำแนะนำปรับเปลี่ยนพฤติกรรมและการสวมอุปกรณ์ PPE
                  </td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300">คน</td>
                  <td class="py-1.5 px-2 text-center border-r border-slate-300 font-bold text-emerald-900">{{ stats.advised }}</td>
                  <td class="py-1.5 px-2 text-center font-bold text-emerald-900">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section 3: Dual Signatures (compacted to guarantee perfect fit on Page 2) -->
          <div class="pt-2 border-t-2 border-slate-900 space-y-1.5">
            <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wide">ส่วนที่ 3: การรับรองรายงานทางการ</h2>
            <div class="grid grid-cols-2 gap-4 text-center text-xs leading-normal">
              <div class="p-2.5 rounded-xl border border-slate-300 bg-slate-50/80 space-y-1">
                <p class="font-bold text-slate-900 text-xs">ผู้รวบรวมรายงาน</p>
                <div class="pt-3 pb-0.5">
                  <span class="inline-block border-b border-dotted border-slate-800 w-44"></span>
                </div>
                <p class="font-semibold text-slate-800 text-[11px]">(.........................................................)</p>
                <p class="text-[11px] text-slate-700 font-medium">(ผู้รับผิดชอบงานอาชีวเวชกรรมและอนามัยสิ่งแวดล้อม รพ.บ้านแพ้ว)</p>
                <p class="text-[11px] text-slate-500">วันที่ .......... เดือน .................... พ.ศ. {{ fiscalYear }}</p>
              </div>

              <div class="p-2.5 rounded-xl border border-slate-300 bg-slate-50/80 space-y-1">
                <p class="font-bold text-slate-900 text-xs">ผู้รับรอง</p>
                <div class="pt-3 pb-0.5">
                  <span class="inline-block border-b border-dotted border-slate-800 w-44"></span>
                </div>
                <p class="font-semibold text-slate-800 text-[11px]">(.........................................................)</p>
                <p class="text-[11px] text-slate-700 font-medium">(หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว)</p>
                <p class="text-[11px] text-slate-500">วันที่ .......... เดือน .................... พ.ศ. {{ fiscalYear }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sheet 2 Footer Note & Pagination -->
        <div class="pt-2.5 border-t border-slate-300 flex justify-between items-center text-xs text-slate-600">
          <span class="font-medium">แบบรายงาน OCC-นบ 01</span>
          <span class="font-bold text-slate-800">(หน้า 2 จาก 2 — จบรายงาน)</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.a4-sheet {
  box-sizing: border-box;
}

/* Dedicated CSS when exporting via html2canvas/jsPDF to guarantee pixel-perfect A4 fit */
.pdf-export-mode {
  width: 794px !important;
  max-width: 794px !important;
  margin: 0 auto !important;
  padding: 0 !important;
  background: #ffffff !important;
}

.pdf-export-mode .a4-sheet {
  width: 794px !important;
  min-height: 1123px !important;
  box-sizing: border-box !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 24px 36px 18px 36px !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  background: #ffffff !important;
}

.pdf-export-mode .a4-sheet:first-child {
  page-break-after: always !important;
  break-after: page !important;
}

.pdf-export-mode .a4-sheet:last-child {
  page-break-after: auto !important;
  break-after: auto !important;
}

/* Native Browser Print (@media print) */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    background: #ffffff !important;
  }
  .a4-sheet {
    width: 210mm !important;
    min-height: 297mm !important;
    box-sizing: border-box !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 12mm 16mm 10mm 16mm !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
  .a4-sheet:first-child {
    page-break-after: always !important;
    break-after: page !important;
  }
  .a4-sheet:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
</style>
