# คู่มือสถาปัตยกรรมและการพัฒนาระบบฟูลสแตก (FULLSTACK GUIDE)
### Occupational Health & Safety Screening System for Agricultural Workers (NBK. 1-56 & OCC Reports)

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบภายใต้หลักการ **Offline-First & On-Premise Resilience** เพื่อตอบสนองต่อข้อจำกัดของพื้นที่ชนบทและแปลงเกษตรกรรมที่สัญญาณอินเทอร์เน็ตอาจไม่เสถียร:

```
+-------------------------------------------------------------+
|                     Client Layer (Vue 3)                    |
|  - Composition API (<script setup>) + TypeScript           |
|  - Tailwind CSS Responsive Design (Mobile-First)            |
|  - Chart.js Data Visualizations                            |
+------------------------------+------------------------------+
                               | (HTTP / REST API)
+------------------------------v------------------------------+
|                     Backend Layer (Go 1.22+)                |
|  - Gin Web Framework (Lightweight, High Throughput)         |
|  - Embedded Static File Serving (Single Executable Mode)   |
|  - Risk Matrix Computation & OCC Aggregation Engine         |
+------------------------------+------------------------------+
                               | (Pure Go Database Driver)
+------------------------------v------------------------------+
|                  Storage Layer (SQLite in WAL Mode)         |
|  - modernc.org/sqlite (Zero CGO / Pure Go Engine)           |
|  - PRAGMA journal_mode = WAL;                               |
|  - Automated Seeding & Schema Migrations                    |
+-------------------------------------------------------------+
```

---

## 2. โครงสร้างฐานข้อมูลและการเปิดโหมด WAL (Database Layer)

ฐานข้อมูลใช้ **SQLite** ผ่าน Pure Go driver (`modernc.org/sqlite`) ทำให้ไม่ต้องพึ่งพา GCC หรือ MinGW บน Windows:

### การตั้งค่า Performance Pragmas ใน `database/db.go`
```sql
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging รองรับการอ่านพร้อมเขียน
PRAGMA synchronous = NORMAL;     -- ปรับปรุงความเร็ว I/O โดยยังคงความปลอดภัย
PRAGMA foreign_keys = ON;        -- บังคับใช้ความสัมพันธ์ตาราง (Cascade delete)
PRAGMA busy_timeout = 5000;      -- ป้องกัน Database Lock เมื่อมี concurrent writes
```

### โครงสร้างตารางหลัก
1. **`farmers`**: จัดเก็บข้อมูลประชากรเกษตรกร
   - `citizen_id` (PK, 13 หลัก)
   - `fullname`, `gender`, `age`, `address`, `occupation`, `plant_type`
2. **`assessments`**: จัดเก็บประวัติการประเมิน นบก. 1-56
   - `id` (PK)
   - `citizen_id` (FK เชื่อมต่อไปยัง `farmers`)
   - `score_a`, `score_b`, `total_score`
   - `highest_symptom_group` (0, 1, 2, 3)
   - `symptoms` (JSON text array)
   - `risk_level` (ต่ำ, ปานกลาง, ค่อนข้างสูง, สูง, สูงมาก)
   - `require_blood_test` (BOOLEAN 0/1)
   - `cholinesterase_result` (ปกติ, ปลอดภัย, มีความเสี่ยง, ไม่ปลอดภัย)
   - `chemical_names` (JSON text array)
   - `eval_date`, `interviewer_name`, `health_center`

---

## 3. ตรรกะการประเมิน Risk Matrix และการเจาะเลือด

ระบบประมวลผลความเสี่ยงสองระดับ (ทั้งฝั่ง Client เพื่อ Real-time UX และฝั่ง Server เพื่อความถูกต้องของข้อมูล):

### คะแนนพฤติกรรม (Behavior Score: 15 - 45 คะแนน)
- **ส่วน A (ข้อ 9-17)**: พฤติกรรมเสี่ยง
  $$\text{Score}_A = \sum_{i=9}^{17} \text{score}(q_i) \quad (\text{ไม่ใช่}=1, \text{บางครั้ง}=2, \text{ทุกครั้ง}=3)$$
- **ส่วน B (ข้อ 18-23)**: พฤติกรรมป้องกันความปลอดภัย (คะแนนกลับด้าน)
  $$\text{Score}_B = \sum_{i=18}^{23} \text{reversed\_score}(q_i) \quad (\text{ไม่ใช่}=3, \text{บางครั้ง}=2, \text{ทุกครั้ง}=1)$$

### การจำแนกกลุ่มอาการ (Symptom Groups: 0 - 3)
- **กลุ่ม 0**: ไม่มีอาการผิดปกติ
- **กลุ่ม 1**: ทางเดินหายใจและผิวหนัง (เช่น ไอ, แสบจมูก, คันผิวหนัง, ผื่นคัน)
- **กลุ่ม 2**: ประสาทส่วนปลายและทางเดินอาหาร (เช่น เวียนศีรษะ, ชา, คลื่นไส้ อาเจียน, ปวดท้อง)
- **กลุ่ม 3**: ประสาทส่วนกลางและอาการรุนแรง (เช่น ตาพร่ามัว, มือสั่น, ชัก, หมดสติ)

### เกณฑ์การเจาะเลือดเอนไซม์ (Cholinesterase Reactive Paper)
เกษตรกรที่ได้รับการตัดเกรดในระดับ:
- **มีความเสี่ยงค่อนข้างสูง**
- **มีความเสี่ยงสูง**
- **มีความเสี่ยงสูงมาก**

จะถูกระบุเป็น **"กลุ่มเป้าหมายที่ต้องได้รับการเจาะเลือดคัดกรอง (*)"** ทันที และจะถูกนับรวมในตัวชี้วัดของแบบรายงานราชการ **OCC-นบ01 (ข้อ 5 ↳ เสี่ยงค่อนข้างสูงขึ้นไป)**

---

## 4. รูปแบบการ Deploy และส่งมอบ (Deployment Modes)

### แบบที่ 1: ติดตั้งแบบ Single Binary สำหรับ รพ.สต. (แนะนำ)
คอมไพล์ Frontend รวมไว้กับเซิร์ฟเวอร์ Go:
```powershell
# 1. เข้าไปที่โฟลเดอร์ frontend แล้วสร้างโปรดักชันบิลด์
cd frontend
npm run build

# 2. คอมไพล์ Go ให้เชื่อมโยงกับ frontend/dist
cd ../backend
go build -ldflags="-s -w" -o nbk_system.exe main.go
```
- จะได้ไฟล์ `nbk_system.exe` ขนาดประมาณ 15-20 MB
- เจ้าหน้าที่เพียงดับเบิลคลิกเปิดไฟล์ ระบบจะเริ่มทำงานที่ `http://localhost:8080`
- สามารถคัดลอกโฟลเดอร์ไปใส่ Flash Drive ใช้งานได้ทันที

### แบบที่ 2: ติดตั้งบน Server ภายในเครือข่ายของ สสจ./สสอ. (Intranet)
- รันเซิร์ฟเวอร์ Backend ในโหมด Service หรือ Docker
- ตั้งค่า `PORT=80` หรือ reverse proxy ด้วย Nginx/Caddy
- เจ้าหน้าที่ อสม. และ รพ.สต. สามารถเชื่อมต่อผ่านแท็บเล็ตในวงแลนเดียวกันได้

---

## 5. มาตรการคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance)

ข้อมูลสุขภาพและเลขประจำตัวประชาชนจัดเป็น **ข้อมูลส่วนบุคคลที่มีความอ่อนไหว (Sensitive Personal Data)**:
1. **On-Premise Storage**: ข้อมูลทั้งหมดถูกจัดเก็บบนเครื่องแม่ข่ายของหน่วยบริการโดยตรง ไม่ส่งต่อไปยังคลาวด์สาธารณะภายนอก
2. **Access Control**: แนะนำให้จำกัดสิทธิ์การเข้าถึงโฟลเดอร์จัดเก็บฐานข้อมูล `nbk_records.db`
3. **Database Backup**: สามารถสำรองไฟล์ `nbk_records.db` ร่วมกับไฟล์ WAL (`nbk_records.db-wal`) ในขณะที่เซิร์ฟเวอร์กำลังทำงานได้โดยไม่ทำให้ฐานข้อมูลเสียหาย
