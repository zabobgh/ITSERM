# ระบบบริหารจัดการแบบประเมินความเสี่ยงเกษตรกร (นบก. 1-56) และรายงาน OCC
### Occupational Health & Safety Screening System for Agricultural Workers (NBK. 1-56 & OCC Reports)

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-emerald?style=for-the-badge&logo=github)](https://zabobgh.github.io/ITSERM/)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.22+-00add8?style=for-the-badge&logo=go)](https://golang.org/)
[![Vitest](https://img.shields.io/badge/Tests-85%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)

ระบบเว็บแอปพลิเคชันฟูลสแตกมาตรฐานบริการอาชีวอนามัยและเวชกรรมสิ่งแวดล้อม เพื่อสนับสนุนการปฏิบัติงานของเจ้าหน้าที่สาธารณสุข (รพ.สต., โรงพยาบาลชุมชน, สสอ., สสจ.) และ อาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.) ในการคัดกรองและเฝ้าระวังความเสี่ยงสุขภาพของเกษตรกรจากการใช้สารเคมีกำจัดศัตรูพืช การตรวจคัดกรองระดับเอนไซม์โคลีนเอสเตอเรสในเลือด (Reactive Paper) และการประมวลผลออกรายงานราชการ **แบบ OCC-นบ 01** และ **แบบ OCC-นบ 02** อัตโนมัติ

🔗 **ทดลองใช้งานระบบจริง (Live Web Application):** [https://zabobgh.github.io/ITSERM/](https://zabobgh.github.io/ITSERM/)

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend** | **Vue 3** (Composition API, `<script setup>`) | คอมโพเนนต์โมดูลาร์ น้ำหนักเบา เร็ว และจัดการ State ราบรื่น |
| **Language** | **TypeScript 5** | Strict Typing ตรวจจับข้อผิดพลาดข้อมูลเวชระเบียนตั้งแต่ระดับคอมไพล์ |
| **Styling** | **Tailwind CSS** | ดีไซน์แบบ Mobile-First ตอบสนองทุกขนาดหน้าจอ (สมาร์ตโฟน, แท็บเล็ต, เดสก์ท็อป) |
| **Export & Print** | **jsPDF + html2canvas** | สร้างไฟล์เอกสาร PDF ราชการ A4 คมชัดสูง จัดหน้าต่อเนื่อง 2 หน้าจบพอดี |
| **Visualization** | **Chart.js** | แดชบอร์ดสรุปผล Matrix ความเสี่ยง 5 ระดับ และผลตรวจแถบสี Reactive Paper |
| **Backend** | **Go (Golang 1.22+)** + **Gin** | Single Binary ขนาดเล็ก กินทรัพยากรต่ำมาก ประมวลผล API รวดเร็ว |
| **Database** | **SQLite (modernc.org/sqlite - Pure Go)** | ไร้ CGO ติดตั้งง่าย เปิดโหมด WAL พร้อมใช้งานทั้งออนไลน์และออฟไลน์ |
| **Testing** | **Vitest** | ครอบคลุม Unit & Regression Tests รวม 85 รายการทดสอบ (ผ่าน 100%) |

---

## ✨ คุณสมบัติเด่นของระบบ (Key Features)

### 1. Mobile-First Screening Wizard (แบบประเมิน นบก. 1-56 คัดกรอง 5 ขั้นตอน)
* **ออกแบบเฉพาะสำหรับลงพื้นที่แปลงเกษตร**: รองรับการใช้งานมือเดียวบนมือถือ มีแถบนำทาง (Step Progress Bar) และปุ่มคำสั่งด้านล่าง (Sticky Action Bar)
* **ระบบค้นหาประวัติเดิม (Citizen ID Lookup)**: พิมพ์เลขบัตรประชาชนครบ 13 หลัก ระบบค้นหาและดึงข้อมูลเดิมมาเติมให้อัตโนมัติ
* **ปุ่มสัมผัสขนาดใหญ่ (Touch Cards & Pills)**: ลดความผิดพลาดและพิมพ์ง่ายขณะสวมถุงมือหรือลงพื้นที่
* **คำนวณคะแนนและตัดเกรดความเสี่ยงแบบ Real-time**:
  * ส่วน A (ข้อ 9–17): พฤติกรรมเสี่ยง คิดคะแนนตรง (1, 2, 3 คะแนน)
  * ส่วน B (ข้อ 18–23): พฤติกรรมป้องกันความปลอดภัย คิดคะแนนสเกลกลับด้านอัตโนมัติ (ไม่ใช่ = 3, บางครั้ง = 2, ทุกครั้ง = 1)
  * ประมวลผลร่วมกับ 3 กลุ่มอาการผิดปกติ ตัดเกรดความเสี่ยง 5 ระดับตามเกณฑ์มาตรฐาน กรมควบคุมโรค
  * ปลดล็อกขั้นตอนเจาะเลือดตรวจเอนไซม์อัตโนมัติเมื่อเข้าเกณฑ์กลุ่มเสี่ยงสูง

### 2. ระบบบันทึกผลการเจาะเลือดคัดกรอง (Cholinesterase Screening)
* **คัดกรองข้อห้ามก่อนเจาะเลือด**: ระยะเวลาสัมผัสสารเคมีล่าสุด
* **Quick Chemical Tags**: ปุ่มลัดเลือกสารเคมีที่ใช้บ่อย เช่น คลอร์ไพริฟอส, ไกลโฟเสต, อะบาเมกติน, ไซเพอร์เมทริน, พาราควอต
* **บันทึกแถบสี Reactive Paper 4 ระดับ**:
  * 🟠 แถบสีส้มเหลือง (ปกติ)
  * 🟡 แถบสีเหลืองอมเขียว (ปลอดภัย)
  * 🟢 แถบสีเขียวอมเหลือง (มีความเสี่ยง - นัดตรวจซ้ำ 2–4 สัปดาห์)
  * 🔴 แถบสีเขียวเข้ม (ไม่ปลอดภัย - ส่งต่อพบแพทย์ รพ. ชุมชน ทันที)

### 3. ระบบรายงานราชการอาชีวอนามัย (OCC Reports & Official PDF)
* **แบบรายงาน OCC-นบ 01 (ระดับ รพ.สต./หน่วยบริการปฐมภูมิ)**:
  * จัดเลย์เอาต์ตามแบบฟอร์มกระทรวงสาธารณสุข ออกแบบมาตรฐาน **2 หน้ากระดาษ A4 ต่อเนื่อง จบรายงานพอดี ไม่มีหน้าว่าง**
  * หน้า 1: ข้อมูลพื้นฐานเกษตรกร และผลประเมินความเสี่ยงตามแบบ นบก. 1-56 (ข้อ 5.1, 5.2)
  * หน้า 2: ผลตรวจคัดกรอง Reactive Paper (ข้อ 6.1, 6.2) และการจัดการทางการแพทย์/ส่งต่อ (ข้อ 7.1–7.3)
  * **ส่วนที่ 3 กล่องลงนามทางการ 2 ฝ่าย**: ผู้รวบรวมรายงาน (รพ.บ้านแพ้ว) และผู้รับรอง (หัวหน้างานป้องกันโรค รพ.บ้านแพ้ว) ปรับความสูงกระชับ ไม่โดนตัดขาด
* **แบบรายงาน OCC-นบ 02 (ระดับอำเภอ/สสจ.)**:
  * ตารางสรุปภาพรวมเปรียบเทียบระหว่าง รพ.สต. ทุกแห่งในพื้นที่รับผิดชอบ
  * แสดงอัตราความครอบคลุมการคัดกรอง (Coverage %) แบบแม่นยำ
* **ระบบปรับแต่งและส่งออกเอกสาร**:
  * รองรับการอัปโหลด **ตราสัญลักษณ์/โลโก้หน่วยบริการ** (PNG/JPG/WebP) พร้อมบันทึกใน LocalStorage อัตโนมัติ
  * รองรับการดาวน์โหลดไฟล์ **PDF มาตรฐาน A4 (jsPDF/html2canvas)** คมชัดสูง
  * รองรับการสั่งพิมพ์ผ่านเบราว์เซอร์ (`Ctrl + P` / `@media print`) ไร้ส่วนเกินของหน้าจอ
  * ส่งออกข้อมูลในรูปแบบ **Excel (CSV UTF-8 BOM)** ภาษาไทยถูกต้อง ไม่เป็นภาษาต่างดาว

### 4. แดชบอร์ดวิเคราะห์ผลแบบเรียลไทม์ (Interactive Dashboard)
* **อัตราความครอบคลุมการตรวจเลือดในกลุ่มเสี่ยงสูง**: แสดงผลเปอร์เซ็นต์ถูกต้องตามตัวชี้วัดจริง ไม่เกิน 100% พร้อมแถบแสดงผลแบบ Responsive
* **แผนภูมิโดนัทสัดส่วนความเสี่ยง (Risk Matrix Donut Chart)**: แยก 5 ระดับสีมาตรฐาน
* **แผนภูมิแท่งผลตรวจเลือด (Cholinesterase Distribution Bar Chart)**: แยก 4 ระดับแถบสี
* **ระบบติดตามผล (Follow-up Tracking)**: แจ้งเตือนเคสที่ต้องตรวจเลือดซ้ำ หรือเคสที่ต้องติดตามการใช้อุปกรณ์ PPE

### 5. ทะเบียนเกษตรกรและประวัติการประเมิน (Registry & History)
* ค้นหาและคัดกรองรวดเร็วตามชื่อ-นามสกุล, เลขบัตรประชาชน 13 หลัก, หน่วยบริการ และระดับความเสี่ยง
* แสดงป๊อปอัปรายละเอียดผลการประเมินรายบุคคล (Detail Modal)
* บันทึกข้อมูลและประวัติการติดตามผล

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory Structure)

```
ระบบบริหารจัดการแบบประเมินความเสี่ยงเกษตรกร/
├── assets/                    # Production Static Assets สำหรับ GitHub Pages
├── backend/                   # Go REST API Server
│   ├── database/              # SQLite Database Initializer & Pragmas
│   ├── handlers/              # API Handlers (Assessments, Reports, Followups)
│   ├── models/                # Data Models & Business Logic
│   ├── main.go                # จุดเริ่มต้น Go Server
│   └── nbk_records.db         # ฐานข้อมูล SQLite (สร้างอัตโนมัติพร้อม WAL mode)
├── frontend/                  # Vue 3 Frontend Source Code
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/     # DashboardTab.vue (สถิติ, Chart.js, KPI)
│   │   │   ├── wizard/        # WizardTab.vue (ฟอร์มคัดกรอง 5 สเต็ป)
│   │   │   ├── registry/      # RegistryTab.vue, DetailModal.vue, FollowUpModal.vue
│   │   │   └── reports/       # OccReportTab.vue, Occ01ReportView.vue, Occ02ReportView.vue
│   │   ├── services/          # api.ts (REST client) & mockService.ts (Offline mock)
│   │   ├── types/             # TypeScript Type Definitions
│   │   ├── App.vue            # Root Shell & Tab Navigation
│   │   └── main.ts            # Entry point
│   ├── tests/                 # Vitest Automated Test Suites (85 tests)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── index.html                 # Entry point สำหรับเว็บ (GitHub Pages)
├── start_server.bat           # สคริปต์คลิกเดียวเพื่อรันระบบบน Windows
├── FULLSTACK_GUIDE.md         # คู่มือสถาปัตยกรรมและเทคนิคเชิงลึก
├── DEPLOY_GITHUB_PAGES.md     # คู่มือการติดตั้งและ Deploy บน GitHub Pages
└── README.md                  # คู่มือโครงการฉบับนี้
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Getting Started)

### ข้อกำหนดของระบบ (Prerequisites)
* **Node.js**: เวอร์ชัน 18.0 ขึ้นไป
* **Go (Golang)**: เวอร์ชัน 1.22 ขึ้นไป (กรณีรัน Backend)

---

### โหมดที่ 1: รันเฉพาะ Frontend (โหมดจำลองออฟไลน์ / Mock Mode)
หากต้องการทดสอบหรือใช้งานบนเครื่องโดยไม่ต้องรัน Go Server ระบบจะสลับมาใช้ Local Storage Mocking อัตโนมัติ:

```bash
cd frontend
npm install
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

---

### โหมดที่ 2: รันแบบ Fullstack (Vue 3 + Go REST API + SQLite)

1. **เริ่มต้นรัน Backend (Go + SQLite)**:
   ```bash
   cd backend
   go run main.go
   # Backend จะพร้อมทำงานที่ http://localhost:8080
   ```

2. **เริ่มต้นรัน Frontend (Vite Dev Server)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend จะพร้อมทำงานที่ http://localhost:5173
   ```

3. **หรือใช้งานผ่านไฟล์ Batch บน Windows**:
   ดับเบิลคลิกไฟล์ `start_server.bat` เพื่อเริ่มต้นทั้งระบบโดยอัตโนมัติ

---

### โหมดที่ 3: คอมไพล์เป็นโปรแกรมเดี่ยวสำหรับติดตั้งใน รพ.สต. (Standalone .exe)

สำหรับหน่วยบริการปฐมภูมิที่ต้องการติดตั้งใช้งานบนเครื่องคอมพิวเตอร์โดยตรง:

```bash
# 1. สร้าง Production Bundle ของ Frontend
cd frontend
npm run build

# 2. คอมไพล์ Go Server รวมเป็น Single Executable
cd ../backend
go build -ldflags="-s -w" -o nbk_system.exe main.go
```
เมื่อดับเบิลคลิก `nbk_system.exe` ระบบจะเริ่มทำงานพร้อมสร้างฐานข้อมูล SQLite ให้อัตโนมัติทันที

---

## 🧪 การทดสอบระบบ (Automated Tests)

ระบบมีชุดทดสอบครอบคลุมทั้งตรรกะคำนวณคะแนน, Risk Matrix, การสร้างรายงาน OCC, และการกู้คืนเมื่อ API ขัดข้อง:

```bash
cd frontend
npm test
```

ผลการทดสอบ:
```
 ✓ tests/occ-reports.test.ts (13 tests)
 ✓ tests/regression.test.ts (69 tests)
 ✓ tests/api-failure.test.ts (3 tests)

 Test Files  3 passed (3)
      Tests  85 passed (85)
```

---

## 📐 เกณฑ์วิเคราะห์ระดับความเสี่ยง (Risk Matrix Criteria)

อ้างอิงเกณฑ์ประเมินความเสี่ยง นบก. 1-56 ของ **สำนักโรคจากการประกอบอาชีพและสิ่งแวดล้อม กรมควบคุมโรค กระทรวงสาธารณสุข**:

| ระดับกลุ่มอาการ (ในรอบ 1 เดือน) | คะแนนพฤติกรรม 15–24 แต้ม | คะแนนพฤติกรรม 25–30 แต้ม | คะแนนพฤติกรรม 31–45 แต้ม |
| :--- | :---: | :---: | :---: |
| **ไม่มีอาการผิดปกติ** | มีความเสี่ยงต่ำ | มีความเสี่ยงปานกลาง | มีความเสี่ยงค่อนข้างสูง* |
| **กลุ่มอาการที่ 1** (ทางเดินหายใจ/ผิวหนัง) | มีความเสี่ยงปานกลาง | มีความเสี่ยงค่อนข้างสูง* | มีความเสี่ยงสูง* |
| **กลุ่มอาการที่ 2** (ประสาทส่วนปลาย/ทางเดินอาหาร) | มีความเสี่ยงค่อนข้างสูง* | มีความเสี่ยงสูง* | มีความเสี่ยงสูง* |
| **กลุ่มอาการที่ 3** (ประสาทส่วนกลาง/รุนแรง) | มีความเสี่ยงสูง* | มีความเสี่ยงสูง* | มีความเสี่ยงสูงมาก* |

> 🩸 **หมายเหตุ:** สัญลักษณ์ `*` คือกลุ่มเสี่ยงที่ **ต้องได้รับการส่งตรวจคัดกรองระดับเอนไซม์โคลีนเอสเตอเรสในเลือด (Reactive Paper)**

---

## 📄 ลิขสิทธิ์และการเผยแพร่ (License)
ระบบนี้พัฒนาขึ้นเพื่อสนับสนุนงานด้านอาชีวอนามัยและเวชกรรมสิ่งแวดล้อมสำหรับหน่วยบริการสาธารณสุขและชุมชนเกษตรกรรม
