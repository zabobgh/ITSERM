<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import type { AssessmentRecord, ToastInfo } from './types'
import DashboardTab from './components/dashboard/DashboardTab.vue'
import WizardTab from './components/wizard/WizardTab.vue'
import RegistryTab from './components/registry/RegistryTab.vue'
const OccReportTab = defineAsyncComponent(() => import('./components/reports/OccReportTab.vue'))
import DetailModal from './components/common/DetailModal.vue'
import EditFarmerModal from './components/common/EditFarmerModal.vue'
import AssessmentResultModal from './components/common/AssessmentResultModal.vue'
import AddFollowUpModal from './components/common/AddFollowUpModal.vue'

import { resetDemoData, isStaticDemoEnvironment } from './services/api'

const currentTab = ref<'dashboard' | 'wizard' | 'registry' | 'occ'>('dashboard')
const isDemo = ref(false)
const isMobileMenuOpen = ref(false)

const tabMetadata = computed(() => {
  switch (currentTab.value) {
    case 'dashboard':
      return {
        title: 'ภาพรวมระบบคัดกรองสุขภาพเกษตรกร',
        subtitle: 'วิเคราะห์แนวโน้ม สถิติกลุ่มเสี่ยง และผลตรวจสารเคมีตกค้างในเลือด (Reactive Paper)',
        badge: 'แดชบอร์ดสรุปผล'
      }
    case 'wizard':
      return {
        title: 'แบบประเมินความเสี่ยง นบก. 1-56',
        subtitle: 'ซักประวัติพฤติกรรม สารเคมี อาการผิดปกติ และคำนวณระดับความเสี่ยงตามมาตรฐาน สธ.',
        badge: 'ระบบซักประวัติ 5 ขั้นตอน'
      }
    case 'registry':
      return {
        title: 'ทะเบียนประวัติเกษตรกร',
        subtitle: 'ฐานข้อมูลประวัติการประเมินและการตรวจ ค้นหา กรองข้อมูล และส่งออกไฟล์ Excel (CSV)',
        badge: 'ฐานข้อมูลผู้รับบริการ'
      }
    case 'occ':
      return {
        title: 'แบบรายงานราชการ OCC-นบ',
        subtitle: 'รายงานสรุปผลการจัดบริการอาชีวอนามัย OCC-นบ01 (รพ.สต.) และ OCC-นบ02 (สสจ.)',
        badge: 'รายงานราชการ กรมควบคุมโรค'
      }
  }
})

// Current Thai Date Formatted
const todayThai = computed(() => {
  const d = new Date()
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
})

function handleResetDemo() {
  if (confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
    resetDemoData()
    if (dashboardRef.value) dashboardRef.value.refresh()
    if (registryRef.value) registryRef.value.refresh()
    if (occRef.value) occRef.value.refresh()
    showToast('รีเซ็ตสำเร็จ', 'ข้อมูลตัวอย่างกลับสู่ค่าเริ่มต้นแล้ว', true)
  }
}

// Detail & Edit modal state
const isModalOpen = ref(false)
const selectedRecord = ref<AssessmentRecord | null>(null)
const isEditModalOpen = ref(false)
const editingRecord = ref<AssessmentRecord | null>(null)

// Assessment Result Modal state
const isResultModalOpen = ref(false)
const latestResultRecord = ref<AssessmentRecord | null>(null)

// Global Add Follow-Up Modal state
const isGlobalFollowUpOpen = ref(false)
const globalFollowUpRecord = ref<AssessmentRecord | null>(null)

// Toast notification state
const toasts = ref<ToastInfo[]>([])
let nextToastId = 1

// Child component refs for refreshing data
const dashboardRef = ref<InstanceType<typeof DashboardTab> | null>(null)
const registryRef = ref<InstanceType<typeof RegistryTab> | null>(null)
const occRef = ref<InstanceType<typeof OccReportTab> | null>(null)
const wizardRef = ref<InstanceType<typeof WizardTab> | null>(null)

function showToast(title: string, message: string, isSuccess = true) {
  const id = nextToastId++
  toasts.value.push({
    id,
    title,
    message,
    type: isSuccess ? 'success' : 'error'
  })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4500)
}

function switchTab(tab: 'dashboard' | 'wizard' | 'registry' | 'occ') {
  currentTab.value = tab
  isMobileMenuOpen.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDetailModal(record: AssessmentRecord) {
  selectedRecord.value = record
  isModalOpen.value = true
}

function closeDetailModal() {
  isModalOpen.value = false
  selectedRecord.value = null
}

function handleEditFromDetail(record: AssessmentRecord) {
  closeDetailModal()
  editingRecord.value = record
  isEditModalOpen.value = true
}

function handleGlobalRecordUpdated(updated: AssessmentRecord) {
  showToast('แก้ไขสำเร็จ', `อัปเดตข้อมูลของ ${updated.fullname} เรียบร้อยแล้ว`, true)
  if (dashboardRef.value) dashboardRef.value.refresh()
  if (registryRef.value) registryRef.value.refresh()
  if (occRef.value) occRef.value.refresh()
  openDetailModal(updated)
}

function handleAssessmentSaved(record: AssessmentRecord) {
  if (dashboardRef.value) dashboardRef.value.refresh()
  if (registryRef.value) registryRef.value.refresh()
  if (occRef.value) occRef.value.refresh()

  // Open Assessment Result Modal for clear immediate feedback
  latestResultRecord.value = record
  isResultModalOpen.value = true
}

function handleViewDetailsFromResult(record: AssessmentRecord) {
  isResultModalOpen.value = false
  openDetailModal(record)
}

function handleFollowUpFromResult(record: AssessmentRecord) {
  isResultModalOpen.value = false
  handleRecordFollowUp(record)
}

function handleFilterRegistryFromDashboard(criteria: { riskLevel?: string; bloodResult?: string; followUpOnly?: boolean }) {
  switchTab('registry')
  setTimeout(() => {
    if (registryRef.value) {
      registryRef.value.applyExternalFilter(criteria)
    }
  }, 50)
}

function handleRecordFollowUp(record: AssessmentRecord) {
  globalFollowUpRecord.value = record
  isGlobalFollowUpOpen.value = true
}

function handleGlobalFollowUpSaved() {
  if (dashboardRef.value) dashboardRef.value.refresh()
  if (registryRef.value) registryRef.value.refresh()
  showToast('บันทึกสำเร็จ', 'บันทึกข้อมูลการติดตามผลเรียบร้อยแล้ว', true)
}

function startNewAssessment() {
  if (wizardRef.value) {
    wizardRef.value.discardDraft()
  }
  isMobileMenuOpen.value = false
  switchTab('wizard')
}

// Global Keyboard Accelerators
function handleGlobalKeydown(e: KeyboardEvent) {
  // Close drawer or modal on Escape
  if (e.key === 'Escape') {
    if (isMobileMenuOpen.value) {
      isMobileMenuOpen.value = false
      return
    }
    if (isModalOpen.value) {
      closeDetailModal()
      return
    }
  }

  // If focused inside input/textarea/select, don't trigger tab shortcuts
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return

  if (e.key === '1') switchTab('dashboard')
  else if (e.key === '2') switchTab('wizard')
  else if (e.key === '3') switchTab('registry')
  else if (e.key === '4') switchTab('occ')
  else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) startNewAssessment()
}

onMounted(() => {
  isDemo.value = isStaticDemoEnvironment()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="min-h-screen flex bg-slate-50 text-slate-800 font-sans antialiased">
    <!-- ========================================================================= -->
    <!-- DESKTOP LEFT SIDEBAR (Standard 260px-280px, sticky full height, no-print) -->
    <!-- ========================================================================= -->
    <aside
      class="hidden md:flex flex-col w-72 lg:w-80 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 select-none z-30 no-print"
      aria-label="เมนูนำทางหลักด้านซ้าย"
    >
      <!-- 1. Brand & Organization Header -->
      <div class="p-4 lg:p-5 border-b border-slate-100 flex items-center space-x-3.5 cursor-pointer group" @click="switchTab('dashboard')">
        <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs ring-1 ring-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5">
            <h1 class="text-base font-bold text-slate-900 truncate leading-tight tracking-tight">
              ระบบคัดกรองเกษตรกร
            </h1>
          </div>
          <p class="text-xs text-slate-500 font-medium truncate mt-0.5">
            นบก. 1-56 & OCC-นบ
          </p>
          <div class="mt-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              สธ. / กรมควบคุมโรค
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Primary Call To Action (New Assessment) -->
      <div class="p-3.5 lg:p-4">
        <button
          type="button"
          @click="switchTab('wizard')"
          class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2.5 active:scale-[0.99] cursor-pointer"
        >
          <svg class="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="tracking-wide">เริ่มทำแบบประเมิน</span>
          <kbd class="hidden xl:inline-block px-1.5 py-0.5 text-xs font-mono bg-white/20 text-white rounded">N</kbd>
        </button>
      </div>

      <!-- 3. Navigation Links (Primary Workspace Sections) -->
      <nav class="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar" aria-label="แถบนำทางหลัก">
        <button
          type="button"
          @click="switchTab('dashboard')"
          :aria-current="currentTab === 'dashboard' ? 'page' : undefined"
          :class="[
            'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition group cursor-pointer',
            currentTab === 'dashboard'
              ? 'bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-300/80'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
          ]"
        >
          <svg 
            :class="['w-5 h-5 transition shrink-0', currentTab === 'dashboard' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600']" 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span>ภาพรวมแดชบอร์ด</span>
        </button>

        <button
          type="button"
          @click="switchTab('wizard')"
          :aria-current="currentTab === 'wizard' ? 'page' : undefined"
          :class="[
            'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition group cursor-pointer',
            currentTab === 'wizard'
              ? 'bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-300/80'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
          ]"
        >
          <svg 
            :class="['w-5 h-5 transition shrink-0', currentTab === 'wizard' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600']" 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
          <span>ทำแบบประเมินความเสี่ยง</span>
        </button>

        <button
          type="button"
          @click="switchTab('registry')"
          :aria-current="currentTab === 'registry' ? 'page' : undefined"
          :class="[
            'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition group cursor-pointer',
            currentTab === 'registry'
              ? 'bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-300/80'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
          ]"
        >
          <svg 
            :class="['w-5 h-5 transition shrink-0', currentTab === 'registry' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600']" 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <span>ทะเบียนประเมินและผลเลือด</span>
        </button>

        <button
          type="button"
          @click="switchTab('occ')"
          :aria-current="currentTab === 'occ' ? 'page' : undefined"
          :class="[
            'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition group cursor-pointer',
            currentTab === 'occ'
              ? 'bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-300/80'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
          ]"
        >
          <svg 
            :class="['w-5 h-5 transition shrink-0', currentTab === 'occ' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600']" 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>รายงานราชการ OCC-นบ</span>
        </button>

        <!-- Service Context Widget -->
        <div class="pt-4 pb-1">
          <div class="px-2 pb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            พื้นที่ปฏิบัติงาน
          </div>
          <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <div class="flex items-center space-x-1.5 text-slate-800 font-semibold">
              <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>อ.บ้านแพ้ว จ.สมุทรสาคร</span>
            </div>
            <p class="text-xs text-slate-500 pl-5">
              เครือข่าย 19 รพ.สต. + 1 โรงพยาบาล
            </p>
          </div>
        </div>
      </nav>

      <!-- 4. Sidebar Footer (System Status, Demo Reset, Help) -->
      <div class="p-3 lg:p-4 border-t border-slate-100 bg-slate-50/70 space-y-2 mt-auto">
        <!-- Status Indicator -->
        <div class="flex items-center justify-between text-xs">
          <span class="inline-flex items-center space-x-1.5 text-slate-600">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-medium">{{ isDemo ? 'Demo (LocalStorage)' : 'ระบบพร้อมใช้งาน' }}</span>
          </span>
          <button
            v-if="isDemo"
            type="button"
            @click="handleResetDemo"
            class="text-xs font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
            title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น"
          >
            รีเซ็ตตัวอย่าง
          </button>
        </div>

        <!-- Shortcuts Quick Hint -->
        <div class="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
          <span>คีย์ลัด: 1-4 สลับหน้า | N ใหม่</span>
          <span class="font-mono font-medium">v1.2</span>
        </div>
      </div>
    </aside>

    <!-- ========================================================================= -->
    <!-- MOBILE DRAWER SLIDE-OVER (Backdrop + Left Slide Drawer, no-print) -->
    <!-- ========================================================================= -->
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-50 md:hidden flex no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
      v-modal-focus="() => { isMobileMenuOpen = false }"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        @click="isMobileMenuOpen = false"
      ></div>

      <!-- Drawer Content -->
      <div class="relative flex flex-col w-4/5 max-w-xs bg-white h-full shadow-2xl z-10">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h2 id="mobile-navigation-title" class="text-sm font-bold text-slate-900 leading-tight">ระบบคัดกรองเกษตรกร</h2>
              <p class="text-xs text-slate-500">นบก. 1-56 & OCC-นบ</p>
            </div>
          </div>
          <button
            type="button"
            @click="isMobileMenuOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="ปิดเมนู"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-3">
          <button
            type="button"
            @click="startNewAssessment"
            class="w-full inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>ประเมินรายใหม่ (นบก. 1-56)</span>
          </button>
        </div>

        <nav class="flex-1 px-3 space-y-1 overflow-y-auto">
          <button
            type="button"
            @click="switchTab('dashboard')"
            :aria-current="currentTab === 'dashboard' ? 'page' : undefined"
            :class="[
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition',
              currentTab === 'dashboard'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            ]"
          >
            <svg class="w-4 h-4" :class="currentTab === 'dashboard' ? 'text-white' : 'text-emerald-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span>แดชบอร์ดภาพรวม</span>
          </button>

          <button
            type="button"
            @click="switchTab('wizard')"
            :aria-current="currentTab === 'wizard' ? 'page' : undefined"
            :class="[
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition',
              currentTab === 'wizard'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            ]"
          >
            <svg class="w-4 h-4" :class="currentTab === 'wizard' ? 'text-white' : 'text-emerald-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            <span>แบบประเมิน นบก. 1-56</span>
          </button>

          <button
            type="button"
            @click="switchTab('registry')"
            :aria-current="currentTab === 'registry' ? 'page' : undefined"
            :class="[
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition',
              currentTab === 'registry'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            ]"
          >
            <svg class="w-4 h-4" :class="currentTab === 'registry' ? 'text-white' : 'text-emerald-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <span>ทะเบียนเกษตรกร</span>
          </button>

          <button
            type="button"
            @click="switchTab('occ')"
            :aria-current="currentTab === 'occ' ? 'page' : undefined"
            :class="[
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition',
              currentTab === 'occ'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            ]"
          >
            <svg class="w-4 h-4" :class="currentTab === 'occ' ? 'text-white' : 'text-emerald-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>รายงานราชการ OCC-นบ</span>
          </button>
        </nav>

        <div class="p-4 border-t border-slate-100 bg-slate-50 text-xs">
          <div v-if="isDemo" class="flex items-center justify-between mb-2">
            <span class="text-amber-800 font-medium text-xs">โหมดทดสอบ Demo</span>
            <button @click="handleResetDemo" class="text-xs text-amber-900 font-bold underline">รีเซ็ตข้อมูล</button>
          </div>
          <p class="text-xs text-slate-400">สธ. / กรมควบคุมโรค กระทรวงสาธารณสุข</p>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- RIGHT MAIN WORKSPACE (Contextual Header + Tab Contents + Bottom Nav)      -->
    <!-- ========================================================================= -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Top Contextual Header Bar (Sticky) -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-20 no-print transition-all shadow-xs">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 lg:h-18">
            <!-- Left: Mobile Toggle & Page Context Title -->
            <div class="flex items-center space-x-3 min-w-0">
              <!-- Mobile Hamburger Button -->
              <button
                type="button"
                @click="isMobileMenuOpen = true"
                class="md:hidden p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                aria-label="เปิดเมนูนำทาง"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>

              <div>
                <div class="flex items-center space-x-2.5">
                  <h2 class="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate leading-tight tracking-tight">
                    {{ tabMetadata.title }}
                  </h2>
                  <span class="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    {{ tabMetadata.badge }}
                  </span>
                </div>
                <p class="hidden sm:block text-xs sm:text-sm text-slate-600 font-medium truncate mt-0.5">
                  {{ tabMetadata.subtitle }}
                </p>
              </div>
            </div>

            <!-- Right: Date, Reset Demo, and Action Button -->
            <div class="flex items-center space-x-2.5">
              <!-- Date display -->
              <div class="hidden xl:flex items-center space-x-1.5 text-xs sm:text-sm text-slate-600 font-medium px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>{{ todayThai }}</span>
              </div>

              <!-- Demo Reset Button -->
              <button
                v-if="isDemo"
                type="button"
                @click="handleResetDemo"
                class="inline-flex items-center space-x-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
                title="รีเซ็ตข้อมูลเกษตรกรตัวอย่างทั้งหมด"
              >
                <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span class="hidden sm:inline">รีเซ็ต Demo</span>
              </button>

              <!-- Quick action button (Only visible in header if not already on wizard) -->
              <button
                v-if="currentTab !== 'wizard'"
                type="button"
                @click="startNewAssessment"
                class="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition transform active:scale-95 cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span class="hidden sm:inline">ประเมินรายใหม่</span>
                <span class="sm:hidden">ประเมิน</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-7 pb-24 md:pb-12 max-w-[1440px] w-full mx-auto">
        <DashboardTab
          ref="dashboardRef"
          v-show="currentTab === 'dashboard'"
          :active="currentTab === 'dashboard'"
          @viewDetail="openDetailModal"
          @newAssessment="startNewAssessment"
          @filterRegistry="handleFilterRegistryFromDashboard"
          @recordFollowUp="handleRecordFollowUp"
        />

        <WizardTab
          ref="wizardRef"
          v-show="currentTab === 'wizard'"
          @saved="handleAssessmentSaved"
          @showToast="showToast"
        />

        <RegistryTab
          ref="registryRef"
          v-show="currentTab === 'registry'"
          :active="currentTab === 'registry'"
          @viewDetail="openDetailModal"
          @recordFollowUp="handleRecordFollowUp"
          @showToast="showToast"
        />

        <OccReportTab
          ref="occRef"
          v-show="currentTab === 'occ'"
          :active="currentTab === 'occ'"
        />
      </main>
    </div>

    <!-- ========================================================================= -->
    <!-- DETAIL RECORD MODAL                                                       -->
    <!-- ========================================================================= -->
    <DetailModal
      :is-open="isModalOpen"
      :record="selectedRecord"
      @close="closeDetailModal"
      @edit="handleEditFromDetail"
      @showToast="showToast"
    />

    <EditFarmerModal
      :is-open="isEditModalOpen"
      :record="editingRecord"
      @close="isEditModalOpen = false"
      @saved="handleGlobalRecordUpdated"
    />

    <!-- ========================================================================= -->
    <!-- ASSESSMENT RESULT MODAL (Immediate post-assessment action feedback)       -->
    <!-- ========================================================================= -->
    <AssessmentResultModal
      :is-open="isResultModalOpen"
      :record="latestResultRecord"
      @close="isResultModalOpen = false"
      @viewDetails="handleViewDetailsFromResult"
      @addFollowUp="handleFollowUpFromResult"
    />

    <!-- ========================================================================= -->
    <!-- GLOBAL ADD FOLLOW-UP MODAL (From Dashboard priority list or Registry)     -->
    <!-- ========================================================================= -->
    <AddFollowUpModal
      :is-open="isGlobalFollowUpOpen"
      :record="globalFollowUpRecord"
      @close="isGlobalFollowUpOpen = false"
      @saved="handleGlobalFollowUpSaved"
    />

    <!-- ========================================================================= -->
    <!-- TOAST NOTIFICATION CONTAINER                                              -->
    <!-- ========================================================================= -->
    <div
      class="fixed top-20 right-4 sm:right-6 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full no-print"
      role="region"
      aria-live="polite"
      aria-label="การแจ้งเตือนของระบบ"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'bg-white rounded-xl shadow-lg ring-1 p-3.5 flex items-start space-x-3 transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto',
          toast.type === 'success'
            ? 'ring-emerald-200/80 bg-gradient-to-r from-emerald-50/40 to-white'
            : 'ring-rose-200/80 bg-gradient-to-r from-rose-50/40 to-white'
        ]"
      >
        <div
          :class="[
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
            toast.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          ]"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-xs text-slate-900 leading-snug">{{ toast.title }}</h4>
          <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">{{ toast.message }}</p>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MOBILE BOTTOM NAVIGATION (Thumb-friendly quick bar for small screens)     -->
    <!-- ========================================================================= -->
    <nav
      v-if="currentTab !== 'wizard'"
      class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-3 z-40 flex items-center justify-around no-print shadow-md"
      aria-label="การนำทางบนมือถือ"
    >
      <button
        type="button"
        @click="switchTab('dashboard')"
        :aria-current="currentTab === 'dashboard' ? 'page' : undefined"
        :class="[
          'flex flex-col items-center py-1 px-3 rounded-xl text-xs font-semibold transition',
          currentTab === 'dashboard' ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <span class="mt-0.5">แดชบอร์ด</span>
      </button>

      <button
        type="button"
        @click="switchTab('wizard')"
        class="flex flex-col items-center py-1 px-3 rounded-xl text-xs font-semibold transition text-slate-500 hover:text-slate-800"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
        <span class="mt-0.5">ประเมิน</span>
      </button>

      <button
        type="button"
        @click="switchTab('registry')"
        :aria-current="currentTab === 'registry' ? 'page' : undefined"
        :class="[
          'flex flex-col items-center py-1 px-3 rounded-xl text-xs font-semibold transition',
          currentTab === 'registry' ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <span class="mt-0.5">ทะเบียน</span>
      </button>

      <button
        type="button"
        @click="switchTab('occ')"
        :aria-current="currentTab === 'occ' ? 'page' : undefined"
        :class="[
          'flex flex-col items-center py-1 px-3 rounded-xl text-xs font-semibold transition',
          currentTab === 'occ' ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span class="mt-0.5">รายงาน</span>
      </button>
    </nav>
  </div>
</template>


