<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { CenterBreakdownItem, AssessmentRecord } from '../../types'

const props = defineProps<{
  records: AssessmentRecord[]
  centerBreakdowns: CenterBreakdownItem[]
  provinceName: string
  fiscalYear: string
  reportLogo?: string
}>()

const totalEvaluated = computed(() => props.records.length)

const totalHighRisk = computed(() => props.records.filter(r =>
  ['มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก'].includes(r.risk_level)
).length)

const totalBloodTested = computed(() => props.records.filter(r =>
  ['มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก'].includes(r.risk_level) &&
  ['ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย'].includes(r.cholinesterase_result)
).length)

const totalAbnormal = computed(() => props.records.filter(r =>
  ['มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก'].includes(r.risk_level) &&
  (r.cholinesterase_result === 'ไม่ปลอดภัย' || r.cholinesterase_result === 'มีความเสี่ยง')
).length)

const generatedDate = computed(() => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date()))

const isGeneratingPdf = ref(false)
const pdfContainer = ref<HTMLElement | null>(null)

async function downloadPdf() {
  if (!pdfContainer.value || isGeneratingPdf.value) return
  isGeneratingPdf.value = true
  await nextTick()

  try {
    await document.fonts?.ready
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])
    const sheets = pdfContainer.value.querySelectorAll<HTMLElement>('.a4-sheet')
    if (!sheets.length) return

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    for (let i = 0; i < sheets.length; i++) {
      const canvas = await html2canvas(sheets[i], {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      if (i > 0) pdf.addPage('a4', 'portrait')
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    }
    pdf.save(`แบบรายงาน_OCC-นบ02_จ.${props.provinceName}_ปี${props.fiscalYear}.pdf`)
  } catch (err) {
    console.error('PDF Generation Error:', err)
  } finally {
    isGeneratingPdf.value = false
  }
}

function printReport() {
  window.print()
}

defineExpose({ downloadPdf, printReport })
</script>

<template>
  <div class="space-y-4">
    <!-- Screen-Only Action Header -->
    <div class="no-print flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="font-bold text-slate-900 text-sm">แบบรายงาน Occ-นบ 02 • A4 แนวตั้ง • 2 หน้า (ตรงตามต้นฉบับกระทรวง 100%)</p>
          <p class="text-xs text-slate-500">แบบรายงานผลการดำเนินงานจัดบริการอาชีวอนามัยในหน่วยบริการปฐมภูมิของสำนักงานสาธารณสุขจังหวัด</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="printReport"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          พิมพ์รายงาน
        </button>
        <button
          type="button"
          @click="downloadPdf"
          :disabled="isGeneratingPdf"
          class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 shadow-xs transition disabled:opacity-50"
        >
          <svg v-if="!isGeneratingPdf" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <svg v-else class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF' }}
        </button>
      </div>
    </div>

    <!-- Preview Viewport -->
    <div class="report-preview-viewport" aria-label="ตัวอย่างเอกสาร OCC-นบ 02">
      <div ref="pdfContainer" :class="['report-pages text-slate-950 mx-auto', isGeneratingPdf ? 'pdf-export-mode' : 'space-y-6']">

        <!-- ==================== SHEET 1 (Page 6 of PDF) ==================== -->
        <section class="a4-sheet sheet-1" aria-label="เอกสาร OCC-นบ 02 แผ่นที่ 1">
          <div>
            <!-- Header Top Bar -->
            <div class="flex justify-between items-start mb-2">
              <div>
                <img
                  v-if="reportLogo"
                  :src="reportLogo"
                  alt="โลโก้รายงาน"
                  class="h-12 w-auto max-w-[140px] object-contain mb-1"
                />
              </div>
              <div class="text-right">
                <span class="font-bold text-sm tracking-wide text-slate-900">Occ-นบ 02</span>
              </div>
            </div>

            <!-- Title -->
            <div class="text-center mb-4">
              <h1 class="text-base font-bold text-slate-900 tracking-tight">
                แบบรายงานผลการดำเนินงานจัดบริการอาชีวอนามัยในหน่วยบริการปฐมภูมิของสำนักงานสาธารณสุขจังหวัด
              </h1>
              <div class="mt-2 text-xs flex justify-between items-center text-slate-800">
                <p>
                  ชื่อสำนักงานสาธารณสุขจังหวัด <span class="font-semibold underline decoration-dotted underline-offset-4 px-1">{{ provinceName || '........................................................' }}</span>
                </p>
                <p>
                  ประจำปีพ.ศ. <span class="font-semibold underline decoration-dotted underline-offset-4 px-1">{{ fiscalYear || '....................................' }}</span>
                </p>
              </div>
            </div>

            <!-- ส่วนที่ 1 ข้อมูลพื้นฐานเกี่ยวกับประชากรวัยทำงานในพื้นที่ของหน่วยบริการ -->
            <div class="mb-3">
              <h2 class="text-xs font-bold text-slate-900 mb-1">
                ส่วนที่ 1 ข้อมูลพื้นฐานเกี่ยวกับประชากรวัยทำงานในพื้นที่ของหน่วยบริการ
              </h2>
              <table class="report-table">
                <thead>
                  <tr>
                    <th class="col-num">ลำดับ</th>
                    <th class="col-desc">ข้อมูล</th>
                    <th class="col-unit">หน่วยนับ</th>
                    <th class="col-result">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center font-medium">1.</td>
                    <td>จำนวนรพ.สต.ทั้งหมดในจังหวัด</td>
                    <td class="text-center">แห่ง</td>
                    <td class="text-center font-bold tabular-nums">{{ centerBreakdowns.length || 19 }}</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนรพ.สต.ที่มีการจัดบริการอาชีวอนามัยให้แก่ แรงงานในชุมชน (รายเก่า)</td>
                    <td class="text-center">แห่ง</td>
                    <td class="text-center tabular-nums">{{ centerBreakdowns.length || 19 }}</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนรพ.สต.มีการจัดบริการอาชีวอนามัยให้แก่กลุ่มแรงงานในชุมชน(อาชีพอื่นๆ) (รายใหม่)</td>
                    <td class="text-center">แห่ง</td>
                    <td class="text-center tabular-nums">0</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนรพ.สต.มีการจัดบริการอาชีวอนามัยให้แก่เกษตรกร (เฝ้าระวังการสัมผัสสารกำจัดศัตรูพืช) (รายใหม่)</td>
                    <td class="text-center">แห่ง</td>
                    <td class="text-center tabular-nums">0</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนรพ.สต.มีจัดบริการคลินิกสุขภาพเกษตรกร (รายใหม่)</td>
                    <td class="text-center">แห่ง</td>
                    <td class="text-center tabular-nums">0</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">2.</td>
                    <td>จำนวนแรงงานในชุมชนภาคเกษตรกรรม ทั้งหมดในพื้นที่ (ข้อมูลที่ได้รับการรายงานจากรพ.สต.ในรายงาน Occ-นบ01)</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalEvaluated }}</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">3.</td>
                    <td>จำนวนแรงงานในชุมชน ที่ไม่อาชีพเกษตรกรรม ทั้งหมดในพื้นที่ (ข้อมูลที่ได้รับการรายงานจากรพ.สต.ในรายงาน Occ-นบ01)</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">4</td>
                    <td>จำนวนเกษตรกรที่เพาะปลูกแบบเกษตรอินทรีย์/ เกษตรทางเลือกที่มีอยู่ในพื้นที่ (ที่ได้รับการรายงานจากรพ.สต.)</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนเกษตรกรที่เพาะปลูกแบบเกษตรอินทรีย์/เกษตรทางเลือก (รายใหม่)</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- ส่วนที่ 2.การจัดบริการอาชีวอนามัยเพื่อการดูแลสุขภาพเกษตรกร (หน้า 1) -->
            <div>
              <h2 class="text-xs font-bold text-slate-900 mb-1">
                ส่วนที่ 2.การจัดบริการอาชีวอนามัยเพื่อการดูแลสุขภาพเกษตรกร
              </h2>
              <table class="report-table">
                <thead>
                  <tr>
                    <th class="col-num">ลำดับ</th>
                    <th class="col-desc">กิจกรรมที่ดำเนินการ</th>
                    <th class="col-unit">หน่วยนับ</th>
                    <th class="col-result">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center font-medium">5</td>
                    <td>จำนวนเกษตรกรที่ได้รับการประเมินความเสี่ยงในการทำงานของเกษตรกรจากการสัมผัสสารเคมีกำจัดศัตรูพืชด้วยแบบประเมินความเสี่ยงฯ ( นบก. 1-56 )</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalEvaluated }}</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">ผลการประเมินความเสี่ยงในการทำงานด้วยแบบนบก. 1-56 มีผลความเสี่ยงค่อนข้างสูงถึงสูงมาก รวม</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalHighRisk }}</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">6.</td>
                    <td>จำนวนเกษตรกรที่ได้รับการเจาะเลือดตรวจคัดกรองโดยใช้กระดาษทดสอบพิเศษรวมเท่ากับ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalBloodTested }}</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">ผลการตรวจพบว่ามีความเสี่ยงและไม่ปลอดภัยรวมเท่ากับ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalAbnormal }}</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">7.</td>
                    <td>จำนวนเกษตรกรที่มีอาการของโรคพิษสารกำจัดศัตรูพืช และได้รับการวินิจฉัยเบื้องต้น</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">8.</td>
                    <td>จำนวนเกษตรกรที่มีอาการของโรคพิษสารกำจัดศัตรูพืชรุนแรง ได้ส่งต่อเพื่อรับการรักษา</td>
                    <td class="text-center">คน</td>
                    <td class="text-center font-bold tabular-nums">{{ totalAbnormal }}</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">ผลการวินิจฉัยว่าป่วยด้วยโรคพิษจากสารเคมีกำจัดศัตรูพืชจากรพ.ที่รับการส่งต่อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">9.</td>
                    <td>จำนวนเกษตรกรไดัรับการประเมินอาการผิดปกติของระบบโครงร่างกระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินมีอาการผิดปกติของระบบโครงร่าง กระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินมีสภาพแวดล้อมการทำงานที่มีความเสี่ยงต่อการ เกิด อาการผิดปกติของระบบโครงร่าง กระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินแจ้งว่ามีอาการป่วยของระบบโครงร่าง กระดูกและกล้ามเนื้อที่เกี่ยวข้องจากการทำงาน</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">10.</td>
                    <td>จำนวนเกษตรกรที่ได้รับการวินิจฉัยโรคที่เกิดจากการบาดเจ็บหรือมีอาการปวดระบบโครงร่าง กระดูกและกล้ามเนื้อจากการประกอบอาชีพ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Page 1 Footer -->
          <footer class="pt-2 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-500 mt-2">
            <span>แบบรายงาน Occ-นบ 02 • จ.{{ provinceName }}</span>
            <span class="font-medium text-slate-700">หน้า 1 จาก 2</span>
          </footer>
        </section>


        <!-- ==================== SHEET 2 (Page 7 of PDF) ==================== -->
        <section class="a4-sheet sheet-2" aria-label="เอกสาร OCC-นบ 02 แผ่นที่ 2">
          <div>
            <!-- Sheet 2 Continuation Table -->
            <table class="report-table mb-3">
              <thead>
                <tr>
                  <th class="col-num">ลำดับ</th>
                  <th class="col-desc">กิจกรรมที่ดำเนินการ</th>
                  <th class="col-unit">หน่วยนับ</th>
                  <th class="col-result">ผล</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center font-medium">11.</td>
                  <td>จำนวนเกษตรกรที่ได้รับคำแนะนำเรื่องการป้องกันอันตรายจากการใช้สารกำจัดศัตรูพืช/การใช้และการเก็บสารเคมีให้ปลอดภัย /การทำงานให้ปลอดภัย</td>
                  <td class="text-center">คน</td>
                  <td class="text-center font-bold tabular-nums">{{ totalEvaluated }}</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">12</td>
                  <td>จำนวนครั้งการออกดำเนินการสอบสวนโรคในกลุ่มเกษตรกร</td>
                  <td class="text-center">ครั้ง</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">13.</td>
                  <td>จำนวนเกษตรกรที่ได้รับการคัดกรองโรคเบาหวาน</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่มีผลการคัดกรองมีความเสี่ยงต่อการเป็นเบาหวาน</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่ป่วยเป็นโรคเบาหวาน</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่ป่วยเป็นโรคเบาหวาน (รายใหม่)</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">14.</td>
                  <td>จำนวนเกษตรกรที่ได้รับการตรวจคัดกรองโรคความดันโลหิต</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่มีภาวะเสี่ยงต่อการป่วยเป็นโรคความดันโลหิตสูง</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่ป่วยด้วยโรคความดันโลหิตสูง</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">จำนวนเกษตรกรที่ป่วยด้วยโรคความดันโลหิตสูง (รายใหม่)</td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>

                <!-- งานจัดบริการเชิงรุก Header -->
                <tr class="row-section-header">
                  <td class="text-center font-bold" colspan="4">งานจัดบริการเชิงรุก</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">15.</td>
                  <td>
                    จำนวนเครือข่ายที่หน่วยบริการมีการดำเนินงานร่วมกันในพื้นที่เพื่อการดูแลสุขภาพเกษตรกรในชุมชน(เช่น อบต. / อบท. /เกษตรตำบล /กลุ่มอาชีพในการดำเนินงาน อาชีวอนามัยให้กับเกษตรกร ระบุเครือข่าย...................................
                  </td>
                  <td class="text-center">เครือข่าย</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">16</td>
                  <td>
                    จำนวนเครือข่ายที่หน่วยบริการดำเนินการพัฒนา/ถ่ายทอดความรู้ด้านอาชีวอนามัย และการเฝ้าระวังป้องกันโรคจากการประกอบอาชีพระบุเครือข่าย..............................
                  </td>
                  <td class="text-center">เครือข่าย</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="pl-6">
                    จำนวนผู้ที่หน่วยบริการดำเนินการพัฒนา/ถ่ายทอดความรู้ด้านอาชีวอนามัย และการเฝ้าระวังป้องกันโรคจากการประกอบอาชีพ(อสม./อส.อช.) ระบุ......................
                  </td>
                  <td class="text-center">คน</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
                <tr>
                  <td class="text-center font-medium">17.</td>
                  <td>
                    จำนวนครั้งในการสื่อสารข้อมูลสุขภาวะ ข้อมูลสภาพการทำงาน ข้อมูลการเจ็บป่วยให้แก่เกษตรกร/การรณรงค์ประชาสัมพันธ์ข้อมูล สถานการณ์โรคและภัยสุขภาพให้แก่กลุ่มอาชีพเกษตรกร
                  </td>
                  <td class="text-center">ครั้ง</td>
                  <td class="text-center tabular-nums">—</td>
                </tr>
              </tbody>
            </table>

            <!-- ส่วนที่ 3 การจัดบริการอาชีวอนามัยเพื่อดูแลกลุ่มอาชีพอื่นในชุมชน -->
            <div class="mb-3">
              <h2 class="text-xs font-bold text-slate-900 mb-1">
                ส่วนที่ 3 การจัดบริการอาชีวอนามัยเพื่อดูแลกลุ่มอาชีพอื่นในชุมชน
              </h2>
              <table class="report-table">
                <thead>
                  <tr>
                    <th class="col-num">ลำดับ</th>
                    <th class="col-desc">กิจกรรมที่ดำเนินการ</th>
                    <th class="col-unit">หน่วยนับ</th>
                    <th class="col-result">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center font-medium">18.</td>
                    <td>จำนวนแรงงานในชุมชน(ที่ไม่ใช่กลุ่มอาชีพเกษตรกร) ได้รับการการประเมินอาการผิดปกติของระบบโครงร่าง กระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินมีอาการผิดปกติของระบบโครงร่าง กระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินมีสภาพแวดล้อมการทำงานที่มีความเสี่ยงต่อการ เกิด อาการผิดปกติของระบบโครงร่าง กระดูกและกล้ามเนื้อ</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center">&nbsp;</td>
                    <td class="pl-6">จำนวนผู้รับการประเมินแจ้งว่ามีอาการป่วยของระบบโครงร่าง กระดูกและกล้ามเนื้อที่เกี่ยวข้องจากการทำงาน</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                  <tr>
                    <td class="text-center font-medium">19.</td>
                    <td>จำนวนแรงงานในชุมชน(ที่ไม่ใช่เกษตรกร) ได้รับการคำแนะนำในการดูแลสุขภาพ/การทำงานให้ปลอดภัย</td>
                    <td class="text-center">คน</td>
                    <td class="text-center tabular-nums">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- ข้อ 20 ปัญหา อุปสรรค & ข้อ 21 ข้อเสนอแนะเพื่อการพัฒนาต่อไป -->
            <div class="text-xs text-slate-900 space-y-2 mb-3">
              <div>
                <p class="font-bold">20 ปัญหา อุปสรรค</p>
                <div class="border-b border-dotted border-slate-500 h-4 w-full"></div>
                <div class="border-b border-dotted border-slate-500 h-4 w-full"></div>
              </div>
              <div>
                <p class="font-bold">21.ข้อเสนอแนะเพื่อการพัฒนาต่อไป</p>
                <div class="border-b border-dotted border-slate-500 h-4 w-full"></div>
                <div class="border-b border-dotted border-slate-500 h-4 w-full"></div>
                <div class="border-b border-dotted border-slate-500 h-4 w-full"></div>
              </div>
            </div>

            <!-- Dual Signatures (ผู้รวบรวมรายงาน & ผู้รับรอง) -->
            <div class="pt-2 border-t border-slate-300">
              <div class="grid grid-cols-2 gap-8 text-center text-xs leading-relaxed">
                <div class="flex flex-col justify-between space-y-1">
                  <div>
                    <p class="font-bold text-slate-900">ผู้รวบรวมรายงาน</p>
                    <div class="pt-4 pb-0.5">
                      <span>(ลงชื่อ)....................................................................</span>
                    </div>
                    <p class="font-bold text-slate-900">(....................................................................)</p>
                    <div class="min-h-[30px] flex items-center justify-center pt-0.5">
                      <p class="text-slate-800 text-[11px] leading-tight">(ผู้รับผิดชอบงานอาชีวเวชกรรมและอนามัยสิ่งแวดล้อม รพ.บ้านแพ้ว)</p>
                    </div>
                  </div>
                  <p class="text-slate-700 text-[11px] pt-1">วันที่ .......... เดือน ....................................... พ.ศ. {{ fiscalYear }}</p>
                </div>

                <div class="flex flex-col justify-between space-y-1">
                  <div>
                    <p class="font-bold text-slate-900">ผู้รับรอง</p>
                    <div class="pt-4 pb-0.5">
                      <span>(ลงชื่อ)....................................................................</span>
                    </div>
                    <p class="font-bold text-slate-900">(....................................................................)</p>
                    <div class="min-h-[30px] flex items-center justify-center pt-0.5">
                      <p class="text-slate-800 text-[11px] leading-tight">(หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว)</p>
                    </div>
                  </div>
                  <p class="text-slate-700 text-[11px] pt-1">วันที่ .......... เดือน ....................................... พ.ศ. {{ fiscalYear }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Page 2 Footer -->
          <footer class="pt-2 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-500 mt-2">
            <span>จัดทำเมื่อ {{ generatedDate }} • แบบรายงาน Occ-นบ 02</span>
            <span class="font-medium text-slate-700">หน้า 2 จาก 2 (จบรายงาน)</span>
          </footer>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
.a4-sheet {
  box-sizing: border-box;
  width: 794px;
  min-height: 1123px;
  padding: 26px 36px 20px 36px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  box-shadow: 0 16px 38px -22px rgba(15, 23, 42, 0.35);
  font-family: 'Sarabun', 'Noto Sans Thai', 'Prompt', sans-serif;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.report-preview-viewport {
  overflow-x: auto;
  padding: 4px 4px 20px;
  scrollbar-gutter: stable;
}

.report-pages {
  width: 794px;
  max-width: none;
}

/* Dedicated CSS when exporting via html2canvas/jsPDF */
.pdf-export-mode {
  width: 794px !important;
  max-width: 794px !important;
  padding: 0 !important;
  margin: 0 !important;
}

.pdf-export-mode .a4-sheet {
  width: 794px !important;
  min-height: 1123px !important;
  height: 1123px !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 26px 36px 20px 36px !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  background: #ffffff !important;
}

/* Report Table Styling */
.report-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-left: 1px solid #475569;
  border-top: 1px solid #475569;
  font-size: 11px;
  line-height: 1.35;
}

.report-table th,
.report-table td {
  border-right: 1px solid #475569;
  border-bottom: 1px solid #475569;
  padding: 4px 6px;
  vertical-align: middle;
}

.report-table thead th {
  background-color: #f1f5f9;
  color: #0f172a;
  font-weight: 700;
  text-align: center;
  padding-top: 5px;
  padding-bottom: 5px;
}

.col-num { width: 44px; text-align: center; }
.col-desc { text-align: left; }
.col-unit { width: 68px; text-align: center; }
.col-result { width: 75px; text-align: center; }

.row-section-header {
  background-color: #f8fafc;
  color: #0f172a;
}
.row-section-header td {
  font-weight: 700;
  padding-top: 4px;
  padding-bottom: 4px;
}

/* Native Browser Print (@media print) */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print {
    display: none !important;
  }
  .report-preview-viewport {
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }
  .report-pages {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .a4-sheet {
    width: 210mm !important;
    min-height: 297mm !important;
    height: 297mm !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 12mm 14mm 10mm 14mm !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
  .sheet-1 {
    page-break-after: always !important;
    break-after: page !important;
  }
  .sheet-2 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
</style>
