---
name: Farmer Risk Management System (นบก. 1-56)
description: Clinical and occupational health dashboard & wizard for Thai agricultural health risk assessment
colors:
  primary: "#059669"
  primary-hover: "#047857"
  primary-light: "#ecfdf5"
  neutral-bg: "#f8fafc"
  surface: "#ffffff"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#94a3b8"
  border: "#e2e8f0"
  risk-normal: "#f59e0b"
  risk-safe: "#84cc16"
  risk-warning: "#10b981"
  risk-danger: "#e11d48"
typography:
  display:
    fontFamily: "'Prompt', 'Noto Sans Thai', sans-serif"
    fontWeight: 700
  body:
    fontFamily: "'Prompt', 'Noto Sans Thai', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
---

# DESIGN.md

## Overview
ระบบถูกออกแบบภายใต้หลักการ **Operate Mode** สำหรับบุคลากรทางการแพทย์ในคลินิกอาชีวอนามัย เน้นความชัดเจนของข้อมูล (Scanability), สัดส่วนพื้นที่ที่กว้างและอ่านสบายตา (Comfortable Ergonomic Spacing), ความแม่นยำทางคลินิก และการลดความล้าของสายตาเมื่อใช้งานเป็นเวลานาน

## Colors
- **Medical / Public Health Emerald**: `#059669` (Emerald-600) สื่อถึงสุขอนามัยและความปลอดภัย
- **Surface & Backgrounds**: พื้นหลังสีกระดาษการแพทย์ `#f8fafc` (Slate-50) ช่วยให้การ์ดสีขาว `#ffffff` ลอยเด่นขึ้นอย่างนุ่มนวล
- **Risk Indicator Palette (Reactive Paper Color System)**:
  - ปกติ: สีส้มเหลือง (`#f59e0b`)
  - ปลอดภัย: สีเหลืองเขียว (`#84cc16`)
  - เสี่ยง / เจาะซ้ำ: สีเขียวเหลือง (`#10b981`)
  - ไม่ปลอดภัย / พบแพทย์: สีเขียวขี้ม้าปนแดงเตือน (`#1e3a24` / `#e11d48`)

## Typography
- ใช้ฟอนต์มาตรฐานภาษาไทย **'Prompt'** ร่วมกับ **'Noto Sans Thai'**
- ขนาดข้อความระดับคลินิกที่ชัดเจน (Inputs: 14-16px, Labels: 14-15px, Headings: 18-24px) หลีกเลี่ยงตัวอักษรขนาดจิ๋วที่ทำให้ผู้กรอกข้อมูลต้องเพ่งสายตา

## Layout
- รองรับหน้าจอคอมพิวเตอร์และโน้ตบุ๊กคลินิก (1366px - 1920px)
- แบบประเมิน Wizard มีความกว้างที่เหมาะสม (`max-w-5xl lg:max-w-6xl`) เกลี่ยองค์ประกอบในรูปแบบ Multi-column Grid (2-3 คอลัมน์) เพื่อใช้พื้นที่แนวนอนอย่างสมดุล ไม่ทิ้งช่องว่างเปล่าขนาดใหญ่
- ช่องกรอกข้อมูล (Inputs/Selects) มีความสูงมาตรฐาน 44-48px ให้คลิกและแตะสัมผัสได้อย่างแม่นยำ

## Elevation & Depth
- ใช้เงาละมุน (Soft multi-layered ambient shadows: `shadow-xs`, `shadow-sm`)
- เส้นขอบคมชัดบางเบา `border border-slate-200/90` ช่วยแยกสัดส่วนการ์ดโดยไม่ต้องใช้สีทึบหนา

## Shapes
- ขอบมนทันสมัยสไตล์เครื่องมือแพทย์ยุคใหม่ (`rounded-xl` และ `rounded-2xl`)

## Components
- **Stepper Progress Bar**: แถบนำทางแสดงความคืบหน้าระดับบน พร้อมปุ่มลัดสลับขั้นตอน
- **Interactive 2D Risk Matrix Grid**: ตารางเมทริกซ์ 3x4 แสดงพิกัดความเสี่ยงของเกษตรกรทันที
- **Reactive Paper Swatches**: การ์ดแสดงผลตรวจเลือดพร้อมแถบสีจริงตามกระดาษทดสอบ

## Do's and Don'ts
- **DO**: ใช้ระยะห่างและขนาดตัวอักษรที่อ่านง่าย สบายตา ชัดเจนสำหรับเจ้าหน้าที่ทุกวัย
- **DO**: ใช้ตารางหลายคอลัมน์ในการจัดวางช่องกรอกที่เกี่ยวข้องกัน เพื่อใช้พื้นที่หน้าจอให้คุ้มค่า
- **DON'T**: ไม่บีบแบบฟอร์มให้แคบเป็นแถบเล็กๆ ตรงกลางหน้าจอ (`max-w-3xl`) ในหน้าจอขนาดใหญ่
- **DON'T**: ไม่ใช้ตัวอักษร `text-xs` (12px) กับช่องกรอกข้อมูลและป้ายกำกับหลัก
