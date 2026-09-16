# คำแนะนำการนำระบบขึ้น GitHub Pages เพื่อทำ Demo ให้ผู้ใช้ทดสอบ

ระบบได้รับการติดตั้ง **LocalStorage Demo Mode Adapter** เรียบร้อยแล้ว เมื่อนำขึ้น GitHub Pages ระบบจะตรวจจับอัตโนมัติและสลับไปใช้ LocalStorage ในเบราว์เซอร์ พร้อมมี **ข้อมูลตัวอย่างเกษตรกร (Seed Data 5 ราย)** ครบทุกระดับความเสี่ยง (ปกติ, ปลอดภัย, เสี่ยง, ไม่ปลอดภัย) ให้ผู้ใช้ลองเล่นได้ทันที!

---

## วิธีที่ 1: อัปโหลดเฉพาะโฟลเดอร์ `dist` ขึ้น Branch `gh-pages` (วิธีมาตรฐานและง่ายที่สุด)

ไฟล์สำหรับแสดงผลทั้งหมดถูกคอมไพล์พร้อมแล้วในโฟลเดอร์:
`c:\Users\BOSS\Documents\ระบบคัดกรองสุขภาพเกษตรกร\nbk-occ-system\frontend\dist`

### ขั้นตอน:
1. สร้าง Repository ใหม่บน GitHub เช่น ชื่อ `nbk-occ-demo`
2. เปิด Command Prompt หรือ PowerShell ในโฟลเดอร์ `frontend/dist`
3. รันคำสั่งต่อไปนี้:

```bash
cd "c:\Users\BOSS\Documents\ระบบคัดกรองสุขภาพเกษตรกร\nbk-occ-system\frontend\dist"
git init
git add -A
git commit -m "Deploy NBK 1-56 demo to GitHub Pages"
git branch -M main
git remote add origin https://github.com/ชื่อผู้ใช้ของคุณ/nbk-occ-demo.git
git push -u origin main --force
```

4. ไปที่หน้า **Repository บน GitHub** ➔ คลิกเมนู **Settings** ➔ **Pages**
5. ในหัวข้อ **Branch**:
   - เลือก **main**
   - โฟลเดอร์เลือก **/ (root)**
   - กด **Save**
6. รอประมาณ 1-2 นาที คุณจะได้ URL ลิงก์ เช่น:
   `https://<your-username>.github.io/nbk-occ-demo/`

---

## วิธีที่ 2: ใช้ GitHub Actions Deploy อัตโนมัติ (สำหรับคนที่ต้องการ Push ทั้ง Codebase)

หากคุณ Push ทั้งโปรเจกต์ขึ้น GitHub สามารถสร้างไฟล์ `.github/workflows/deploy.yml` เพื่อให้ GitHub Build และ Deploy ให้ทุกครั้งที่ Push:

```yaml
name: Deploy Demo to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies & Build
        run: |
          cd nbk-occ-system/frontend
          npm install
          npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'nbk-occ-system/frontend/dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## ✨ ฟีเจอร์พิเศษสำหรับ GitHub Pages Demo

1. **Auto-fallback & Seed Data:**
   - เมื่อเปิดบน `github.io` ระบบจะโหลดข้อมูลตัวอย่างเกษตรกร 5 รายที่มีประวัติและผลตรวจเลือดแตกต่างกันขึ้นมาทันที
   - ผู้ใช้สามารถทดลอง **ค้นหา**, **กรองระดับความเสี่ยง**, **เปิดดูรายงาน OCC**, หรือ **ทดลองบันทึกเกษตรกรคนใหม่** ได้จริง 100%
2. **ปุ่ม "รีเซ็ต Demo":**
   - มีปุ่มสีส้มอ่อน **"รีเซ็ต Demo"** แสดงอยู่ด้านขวาบนของแถบเมนู
   - เมื่อผู้ใช้ทดลองเล่นจนข้อมูลเปลี่ยนไป สามารถกดปุ่มนี้เพื่อกู้คืนข้อมูลตัวอย่างเริ่มต้นกลับมาได้ในคลิกเดียว
3. **การทำงานแบบ Local:**
   - ข้อมูลบันทึกลงในเครื่องของผู้ใช้แต่ละคนอย่างปลอดภัย ไม่ชนกัน และไม่ต้องพึ่งพาเซิร์ฟเวอร์ภายนอก
