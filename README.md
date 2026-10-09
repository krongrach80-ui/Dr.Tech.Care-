# 🏥 Dr.Tech.Care — ตู้ Kiosk กายภาพบำบัดอัจฉริยะ (Smart Kiosk)

> **ระบบจริงสำหรับแข่งขันและใช้งานทางการแพทย์ (Production-Ready Architecture)**  
> ตู้ Kiosk แนวตั้งอัตราส่วน 9:16 (ออกแบบที่ 1080×1920) สำหรับคลินิกกายภาพบำบัด ออกแบบ UI/UX เพื่อผู้สูงอายุโดยเฉพาะในสไตล์ **Strong Care** พร้อมระบบจัดการข้อมูลทางคลินิกครบวงจร

---

## 📌 ข้อมูลเกี่ยวกับโครงการ (About Project)

**Dr.Tech.Care** เป็นระบบตู้ Kiosk อัจฉริยะที่ผสมผสานเทคโนโลยี Computer Vision บนอุปกรณ์ (On-device Face Biometrics), การตรวจจับท่าทางกายภาพบำบัด, เกมฝึกสมองชะลอภาวะสมองเสื่อม, และแดชบอร์ดบุคลากรทางการแพทย์แบบเรียลไทม์ เชื่อมโยงฐานข้อมูลเป็นหนึ่งเดียว (Unified Clinical Database)

### 💡 วัตถุประสงค์หลัก
1. **ลดภาระบุคลากรทางการแพทย์**: คนไข้สามารถยืนยันตัวตนผ่านใบหน้า และเข้าสู่ภารกิจกายภาพประจำวันได้เองที่ตู้ Kiosk
2. **ออกแบบเพื่อผู้สูงอายุ (Elderly-Friendly UI/UX)**:
   - โทนสีละมุนตา `#F4FBF7` ลดแสงสะท้อน
   - ปุ่มหลัก `#1E8A4C` และปุ่มรอง `#6FD67F` ขนาดใหญ่พิเศษ (ความสูง >= 72px) สัมผัสง่าย
   - ตัวอักษรสีเข้ม `#0B2B2B` คอนทราสต์สูงพิเศษ ฟอนต์ `Noto Sans Thai` สระและวรรณยุกต์ไม่ขาดวิ่น
   - เว้นระยะห่าง (Spacing) โปร่งสบาย ไม่เบียดแน่น ป้องกันการกดผิด (Fat-finger protection)
3. **ความปลอดภัยและสิทธิข้อมูลส่วนบุคคล (PDPA Compliant)**:
   - **Zero Biometric Image on Server**: ไม่จัดเก็บภาพถ่ายหรือวิดีโอใบหน้าลงในเซิร์ฟเวอร์ แปลงเป็นเวกเตอร์ตัวเลขคณิตศาสตร์ 128 มิติ (Vector Embedding) ทันทีบนอุปกรณ์
   - **Audit Log Hash Chain**: เก็บล็อกการเข้าถึงด้วย SHA-256 Hash Chain ป้องกันการดัดแปลงย้อนหลัง
   - **Masking PII**: ซ่อนนามสกุลผู้ป่วยตามหลัก PDPA โดยคำนวณ Grapheme ภาษาไทยอย่างถูกต้อง

---

## 🚀 คุณสมบัติเด่น (Key Features)

### 1. ฝั่งตู้ Kiosk คนไข้ (Patient Kiosk — 9:16)
- **Idle State & Standby Camera**: กล้องตรวจจับคนไข้มานั่งหน้าตู้ เปลี่ยนเป็นกระจกเงาส่องหน้า (Camera Mirror) อัตโนมัติ
- **สแกนใบหน้าเข้าสู่ระบบ (Flow B)**: สแกนใบหน้าจับคู่เวกเตอร์ด้วยอัลกอริทึม Cosine Similarity ภายใน < 500ms
- **สมัครบัญชีใหม่หน้าตู้ (Flow A)**: มีหน้าต่างยินยอม PDPA, สแกนใบหน้า 3 มิติ (มองตรง ➔ หันซ้าย ➔ หันขวา) เพื่อป้องกันภาพหลอก (Liveness Check), พร้อมคีย์บอร์ดสัมผัสภาษาไทยและปุ่มตัวเลขขนาดใหญ่
- **Daily Checklist & Tasks**:
  - **ภารกิจที่ 1 (กายภาพบำบัด)**: นับรอบการยกแขน/บริหารข้อต่อ (Repetition Counter)
  - **ภารกิจที่ 2 (เกมฝึกสมอง)**: มินิเกมกระตุ้นความจำและสมาธิ
- **สรุปผลการฝึก**: แสดงผลคะแนน สถิติรายวัน และข้อความแนะนำจากนักกายภาพบำบัดประจำตัว

### 2. ฝั่งพอร์ทัลบุคลากร (Staff Portal & Dashboard)
- **ระบบแบ่งสิทธิ์ตามบทบาท (Role-Based Access Control - RBAC)**:
  - 👑 **ผู้อำนวยการโรงพยาบาล (Director)**: เข้าถึง **9 เมนู** (Overview, รายชื่อคนไข้, ตารางนัดหมาย, คลังท่ากายภาพ, คลังเกมฝึกสมอง, บันทึกอาการ, จัดการเจ้าหน้าที่, ประวัติการเข้าถึง Audit Log, ตั้งค่าระบบ)
  - 🩺 **นักกายภาพบำบัด (Physiotherapist)**: เข้าถึง **7 เมนู** (ไม่เห็น Audit Log และตั้งค่าระบบ)
- **เชื่อมโยงข้อมูลเรียลไทม์**: ข้อมูลการฝึกที่หน้าตู้ Kiosk ซิงก์ขึ้นแดชบอร์ดนักกายภาพทันที

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16.4](https://nextjs.org/) (App Router, Turbopack) |
| **UI Library & Language** | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) (Strict: 100%) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Custom Design Tokens |
| **Icons & Typography** | [Lucide React](https://lucide.dev/), `Noto Sans Thai` (Google Fonts) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 16, pgvector 128-d, Row Level Security) |
| **Testing** | [Vitest](https://vitest.dev/), React Testing Library, [Playwright](https://playwright.dev/) |
| **Package Manager** | [pnpm](https://pnpm.io/) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
drtechcare/
├── src/
│   ├── app/
│   │   ├── page.tsx               # หน้าหลักตู้ Kiosk (Interactive State Machine 10 ขั้นตอน)
│   │   ├── layout.tsx             # Root Layout พร้อม Noto Sans Thai และ viewport 9:16
│   │   ├── globals.css            # ธีม Strong Care tokens (#F4FBF7, #1E8A4C, #6FD67F, #0B2B2B)
│   │   └── staff/
│   │       ├── login/page.tsx     # ประตูเข้าสู่ระบบบุคลากร (Quick Fill สิทธิ์ ผอ./นักกายภาพ)
│   │       └── overview/page.tsx  # แดชบอร์ดสรุปผลและเมนูตามสิทธิ์ RBAC
│   ├── components/
│   │   └── kiosk/
│   │       ├── KioskShell.tsx     # กรอบจำลองตู้ 9:16 พร้อม Screen WakeLock API
│   │       ├── BigButton.tsx      # ปุ่มสัมผัสขนาดใหญ่ผ่านมาตรฐาน Contrast WCAG AAA
│   │       ├── CameraMirror.tsx   # กระจกส่องหน้ากล้อง Live WebCam พร้อม Fallback
│   │       ├── ThaiKeyboard.tsx   # แป้นพิมพ์ภาษาไทยหน้าตู้ Kiosk
│   │       ├── NumPad.tsx         # แป้นตัวเลขขนาดใหญ่
│   │       └── StaffTrigger.tsx   # ปุ่มทางเข้าบุคลากร
│   ├── lib/
│   │   ├── thai.ts                # จัดรูปแบบวันที่ พ.ศ. และ Masking นามสกุลด้วย Grapheme
│   │   ├── rbac.ts                # เมทริกซ์สิทธิ์ Director (9 เมนู) vs Physio (7 เมนู)
│   │   └── kiosk.ts               # ระบบรีเซ็ตสถานะตู้ Kiosk และเคลียร์ Session
│   └── messages/
│       └── th.json                # ข้อความภาษาไทยทั้งระบบ (Single Source of Truth)
├── supabase/
│   ├── migrations/                # 14 ไฟล์ไมเกรชันฐานข้อมูล (pgvector, audit hash chain, RLS)
│   └── seed.sql                   # ข้อมูลตั้งต้น บัญชีทดสอบ ท่ากายภาพ และแบบฝึกสมอง
├── tests/
│   └── unit/                      # 63 Automated Unit Tests (RBAC, Components, Thai Utilities)
└── README.md                      # เอกสารคู่มือโครงการ
```

---

## ⚡ การติดตั้งและรันโครงการ (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
pnpm install
```

### 2. รันโหมด Development
```bash
pnpm dev
```
เปิดเบราว์เซอร์ไปที่ **`http://localhost:3000`** (หรือ `http://127.0.0.1:3000`)

### 3. ตรวจสอบคุณภาพโค้ด (Quality Check)
```bash
pnpm check
```
คำสั่งนี้จะรันการตรวจสอบ 4 ขั้นตอน:
- ✅ **Typecheck**: `tsc --noEmit` (TypeScript Strict 100%)
- ✅ **Lint**: ESLint 9 (0 errors, 0 warnings)
- ✅ **Unit Tests**: Vitest 63 tests ผ่านครบ 100%
- ✅ **Build**: Next.js Turbopack Production Build

---

## 🔒 นโยบายความปลอดภัยและสิทธิผู้ป่วย (Security & Compliance)
- **พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)**: ผู้ใช้ต้องกดยินยอมก่อนการบันทึกข้อมูลใบหน้า
- **Append-only Audit Log**: ทุกคำสั่งที่สำคัญจะถูกบันทึกลงในตาราง `audit_logs` พร้อมค่า SHA-256 เชื่อมโยงเป็น Hash Chain
- **Role-Based Navigation**: สิทธิ์ `physio` ถูกจำกัดไม่ให้เข้าถึงเมนู `audit` และ `settings` ทั้งในระดับ UI และ RLS Policy

---

## 👨‍💻 จัดทำโดย
ทีมวิศวกรรมพัฒนา **Dr.Tech.Care** สำหรับการประกวดและใช้งานจริงในคลินิกกายภาพบำบัด
