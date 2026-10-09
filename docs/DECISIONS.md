# เอกสารการตัดสินใจทางสถาปัตยกรรม (Architecture Decision Records - ADR)
## โครงการ Dr.Tech.Care

เอกสารนี้ใช้บันทึกการตัดสินใจทางเทคนิคและสถาปัตยกรรมตามกฎเหล็กข้อ 6 ของ Master Prompt

---

### ADR-001: สถาปัตยกรรม Single Next.js App Router Application สำหรับ Kiosk 9:16
- **วันที่**: 2026-10-10 (Milestone 0)
- **สถานะ**: อนุมัติแล้ว (Accepted - ปรับปรุงคำอธิบายจาก Monorepo เป็น Single App)
- **บริบท**: ระบบต้องทำงานบนตู้ Kiosk แนวตั้ง 1080×1920 สำหรับคลินิกกายภาพบำบัด มีทั้งหน้า Kiosk สำหรับผู้ป่วย/ผู้สูงอายุ และหน้า Staff/Admin สำหรับผู้อำนวยการและนักกายภาพ
- **การตัดสินใจ**:
  - ใช้ **Single Next.js Application** โครงสร้างเดียว (ไม่ใช่ Monorepo แยกโปรเจกต์)
  - แบ่ง Route Groups ภายในโฟลเดอร์ `src/app/`:
    - `src/app/(kiosk)/`: สำหรับผู้ป่วย มี Kiosk Shell ล็อก 9:16, Touch-first UX, Virtual Thai Keyboard/NumPad, IdleGuard
    - `src/app/(staff)/`: สำหรับบุคลากร (ผู้อำนวยการ, นักกายภาพ) รองรับ Responsive ทั้งบนจอสัมผัสตู้และเดสก์ท็อป
- **ผลลัพธ์**: รหัสประเภทฐานข้อมูล, Utility และ Business Logic แชร์กันได้ 100% ไม่มี overhead ของ multi-package monorepo

---

### ADR-002: การบังคับใช้ TypeScript Strict Mode 100%
- **วันที่**: 2026-10-10 (Milestone 0)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: ข้อกำหนดบังคับใช้ `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` และห้าม `any` / `@ts-ignore` ทุกกรณี
- **การตัดสินใจ**:
  - ตั้งค่า `tsconfig.json` ให้เปิด `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
  - รองรับ `exactOptionalPropertyTypes` โดยเพิ่ม `| undefined` ให้กับ optional properties ทุกตัวที่มีการส่งค่า undefined ชัดเจน
  - ตรวจสอบชนิดข้อมูลข้าม Boundary (HTTP Request, Cookies, Supabase responses, LocalStorage) ด้วย `zod` 100%
  - สแกนโค้ดอัตโนมัติห้ามมี `TODO`, `FIXME`, `: any`, `as any`, `@ts-ignore`
- **ผลลัพธ์**: ความน่าเชื่อถือของรหัสสูงสุด ป้องกัน Runtime Crash บนตู้ Kiosk

---

### ADR-003: การออกแบบ Design Tokens และกฎ Contrast เพื่อผู้สูงอายุ
- **วันที่**: 2026-10-10 (Milestone 0)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: ตู้ Kiosk ใช้โดยผู้ป่วยและผู้สูงอายุ ต้องการการอ่านง่าย ปุ่มขนาดใหญ่ และ Contrast ผ่านเกณฑ์ WCAG AA / AAA
- **การตัดสินใจ**:
  - สีพื้นหลัง: `linear-gradient(180deg, #E8F8F1 0%, #FFFFFF 50%, #E4F0FC 100%)`
  - สีหลัก: Jade Green `#2FB39A`, Blue `#3F7FD0`, Text Dark `#1F3A4D`
  - **กฎเหล็กเรื่อง Contrast**:
    - ปุ่มสีเขียว `#2FB39A`: ห้ามใช้ตัวอักษรสีขาว (ได้เพียง ~2.6:1 ไม่ผ่าน) บังคับใช้ตัวอักษรสีเข้ม `#1F3A4D` ได้ ~4.5:1
    - ปุ่มสีน้ำเงิน `#3F7FD0`: บังคับใช้ตัวอักษรสีขาวตัวหนาขนาด >= 24px ได้ ~4.1:1
  - ขนาด Touch Target: ขั้นต่ำ 96×96px, ระยะห่างระหว่างปุ่ม >= 24px, มุมโค้ง 24px
  - ฟอนต์พื้นฐาน >= 28px, หัวข้อ 40-56px, ปุ่ม 32px ตัวหนา
- **ผลลัพธ์**: ใช้งานสะดวก ลดข้อผิดพลาดในการสัมผัสบนหน้าจอขนาด 27-32 นิ้ว

---

### ADR-004: การแยกสิทธิ์ RBAC แบบ Single Source of Truth และ Table-Driven Testing
- **วันที่**: 2026-10-10 (Milestone 0)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: สิทธิ์ 3 ระดับ (Director, Physio, Patient) ต้องมี Permission Matrix ที่ชัดเจนและตรงกันทั้ง UI, Server Guard และ RLS
- **การตัดสินใจ**:
  - สร้าง `src/lib/rbac.ts` เป็นฟังก์ชันบริสุทธิ์ (Pure TypeScript)
  - กำหนด Permissions ชัดเจนตามตารางใน Section 1.2
  - ผู้อำนวยการ (`director`) มีสิทธิ์สูงสุด เห็น 9 เมนูแอดมิน (Overview + 8 เมนู)
  - นักกายภาพ (`physio`) จัดการคนไข้ตาม `physio_scope` (`all` หรือ `own`), แก้ไข/ลบเฉพาะท่าและโจทย์ที่ตนสร้าง, ไม่เห็นหน้าประวัติการใช้งานและตั้งค่าระบบ (เห็น 7 เมนู)
  - เขียน Unit Test แบบ **Table-Driven Tests** ครบทุกช่องของ Matrix (46 เทสต์เคส) ครอบคลุมทั้งกรณีอนุญาต ปฏิเสธ และกฎกันพลาด
- **ผลลัพธ์**: ตรรกะการตรวจสอบสิทธิ์ไม่กระจัดกระจาย ตรวจสอบย้อนกลับได้ง่าย

---

### ADR-005: การใช้งาน Next.js 16 (16.4.0) พร้อม Turbopack และแนวทาง Route Guard ใน M2
- **วันที่**: 2026-10-10 (Milestone 0)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: Next.js ที่ติดตั้งในสภาพแวดล้อมปัจจุบันคือ 16.4.0 พร้อม React 19.3.0 และ Turbopack
- **การตัดสินใจ**:
  - ใช้ Next.js 16.4.0 สำหรับทั้งฝั่ง Kiosk และ Admin
  - บันทึก `allowedDevOrigins: ["192.168.1.101", "localhost", "127.0.0.1"]` ใน `next.config.ts` ป้องกันปัญหา HMR Cross-Origin Block
  - สำหรับ Route Guard ใน M2:
    - สเปกกำหนดให้ตรวจ 3 ชั้น (UI ซ่อน -> Server Guard ปฏิเสธ -> RLS ปฏิเสธ)
    - Next.js 16 ยังคงรองรับ `middleware.ts` / server wrapper `guard()` ใน Route Handlers และ Server Components
    - จะใช้ `guard()` แบบฟังก์ชันมาตรฐานใน `src/lib/guard.ts` สำหรับ Route Handlers และ Server Actions ทุกตัว เพื่อความแน่นอนและไม่ขึ้นกับความเปลี่ยนแปลงของชื่อ middleware ของเฟรมเวิร์ก
- **ผลลัพธ์**: พัฒนาได้รวดเร็วด้วย Turbopack และปลอดภัย 100% ตามกฎ 3 ชั้น

---

### ADR-006: การติดตั้งและล็อกเวอร์ชัน @mediapipe/tasks-vision และ @vladmandic/face-api
- **วันที่**: 2026-10-10 (Milestone 1)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **แพ็กเกจและเวอร์ชัน**:
  - `@mediapipe/tasks-vision`: `1.1.0` (ล็อก exact version ไม่ใช้ `^` หรือ `latest`)
  - `@vladmandic/face-api`: `1.7.15` (ล็อก exact version ไม่ใช้ `^` หรือ `latest`)
- **บริบทและเหตุผล**:
  - ตู้ Kiosk ต้องการการตรวจจับใบหน้าและท่าทางกายภาพแบบ Real-time บนเบราว์เซอร์ (Client-side) ที่แม่นยำสูง
  - `@mediapipe/tasks-vision` มอบ FaceLandmarker (478 จุด) และ PoseLandmarker (33 จุด) ที่มีความเร็วและรองรับ WebGL GPU Acceleration
  - `@vladmandic/face-api` เป็นพอร์ตที่มีการดูแลต่อเนื่องและรองรับ TensorFlow.js สำหรับสกัด Face Descriptor / Embedding 128 มิติ (128-d Float32 vector) เพื่อใช้เปรียบเทียบใบหน้าโดยไม่บันทึกภาพถ่ายตามกฎหมาย PDPA
  - การล็อกเวอร์ชันแน่นอนป้องกันปัญหาความไม่เข้ากันของ WebAssembly runtime หรือ weight format เมื่อ build บนเครื่อง kiosk ที่ต่างกัน
- **ผลลัพธ์**: Dependency ล็อกตายตัว ทำงานซ้ำได้แน่นอน (Reproducible Build)

---

### ADR-007: การจัดการไฟล์โมเดลขนาดใหญ่และกลยุทธ์ Local-first Caching
- **วันที่**: 2026-10-10 (Milestone 1)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: ไฟล์โมเดล Task และ Weights มีขนาดใหญ่ (`face_landmarker.task` ~3.8MB, `pose_landmarker_full.task` ~9.0MB, `*.wasm` ~13MB, `*.bin` ~6.4MB) และระบบ Kiosk ต้องรันแบบ Offline ได้ 100% โดยไม่พึ่ง CDN
- **การตัดสินใจ**:
  - สร้างสคริปต์ `scripts/setup-models.mjs` รันผ่าน `pnpm setup:models` สำหรับคัดลอกไฟล์ WASM และ Weights จาก `node_modules` ไปไว้ใน `public/models/`
  - ตรวจสอบความถูกต้องของโมเดลทั้งหมด พร้อมสร้าง `public/models/manifest.json` ระบุ SHA-256 hash ของทุกไฟล์
  - ใช้งาน Service Worker ในการแคชไฟล์โมเดลทั้งหมดตาม `manifest.json` เพื่อให้โหลดทันทีจาก Cache Storage และล้างแคชเก่าเมื่อ SHA-256 เปลี่ยน
  - เพิ่มการตั้งค่า `.gitattributes` สำหรับไฟล์ขนาดใหญ่ (Git LFS) เพื่อป้องกันประวัติ git บวม
- **ผลลัพธ์**: ตู้ Kiosk เริ่มทำงานได้รวดเร็ว ทำงานออฟไลน์ได้สมบูรณ์ และปลอดภัยจากการเปลี่ยนแปลงบน CDN ภายนอก

---

### ADR-008: การตัดสินอัตลักษณ์ชีวมิติใบหน้าและการป้องกันการรั่วไหลของระยะห่าง (Biometric Decision Engine)
- **วันที่**: 2026-10-10
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: การส่งค่า distance หรือ vector embedding กลับไปยังไคลเอนต์เปิดช่องโหว่ Biometric Inversion และ Hill-Climbing Attacks
- **การตัดสินใจ**:
  - สร้างฟังก์ชัน `decideIdentity` ใน `src/lib/biometrics.ts`
  - คืนค่าผลลัพธ์เป็น enum: `match`, `ambiguous`, `no_match`, `inconsistent`
  - ห้ามคืนค่าตัวเลข distance หรือ similarity ใด ๆ กลับ client
  - กำหนดเกณฑ์ `matchThreshold = 0.40` และ `ambiguousDelta = 0.05` เพื่อแยกกรณีใบหน้าคล้ายกันออกจากกัน
- **ผลลัพธ์**: ปลอดภัยตามมาตรฐาน PDPA และชีวมิติสากล

---

### ADR-009: ฐานข้อมูล Fail-Safe Triggers ป้องกันการลบ ผอ.รพ. และการแบนเครื่องตนเอง
- **วันที่**: 2026-10-10
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: ป้องกัน Human Error ในการดูแลระบบ เช่น ผู้อำนวยการเผลอลบบัญชีตนเอง หรือแบนเครื่องที่กำลังปฏิบัติงาน
- **การตัดสินใจ**:
  - เพิ่ม Migration `0015_fail_safe_guards.sql` สร้าง Trigger ระดับฐานข้อมูล:
    1. ป้องกันการลบหรือระงับบัญชี ผอ.รพ. หากเหลือ ผอ.รพ. คนสุดท้าย
    2. ป้องกันการลบบัญชีตนเอง (`old.id = auth.uid()`)
    3. ป้องกันการแบนเครื่องหรือ IP ปัจจุบันที่ตนเองกำลังเชื่อมต่อ
- **ผลลัพธ์**: ความปลอดภัยระดับฐานข้อมูลไม่สามารถถูกหลบหลีกผ่าน API หรือ UI

---

### ADR-010: ระบบแจ้งเตือนฉุกเฉิน 1669 และ Red Flag Triage
- **วันที่**: 2026-10-10
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: ผู้ป่วยและผู้สูงอายุที่ฝึกกายภาพอาจเกิดภาวะแทรกซ้อนเฉียบพลัน (กล้ามเนื้อหัวใจขาดเลือด, สโตรก)
- **การตัดสินใจ**:
  - สร้างหน้า `/report-symptom` พร้อมเช็กลิสต์สัญญาณอันตราย Red Flags 4 ข้อ
  - เมื่อติ๊ก Red Flag แม้แต่ข้อเดียว ระบบจะดีดเข้าสู่หน้าจอฉุกเฉินสีแดงทันที แสดงปุ่มโทรด่วน 1669 และส่งการแจ้งเตือน Realtime ถึงนักกายภาพและ ผอ.รพ. ภายใน 3 วินาที
- **ผลลัพธ์**: ความปลอดภัยต่อชีวิตผู้ป่วยเป็นศูนย์กลาง (Patient Safety First)

---

### ADR-011: Pose Rep Counter State Machine และตัวกรองความกระตุก
- **วันที่**: 2026-10-10
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**: การนับรอบการออกกำลังกายต้องการความแม่นยำทางสรีรวิทยา ไม่ใช่การเพิ่มตัวเลขแบบสุ่ม
- **การตัดสินใจ**:
  - สร้าง `PoseRepStateMachine` ใน `src/features/pose/repCounter.ts`
  - กรองมุมกระตุกด้วย Exponential Moving Average (EMA)
  - ตรวจสอบ Range of Motion (ROM), ตรวจจับความเร็วที่เร็วเกินไป (<1.5s) หรือช้าเกินไป (>7s)

---

### ADR-012: สถาปัตยกรรมระบบบริหารจัดการเจ้าหน้าที่ เฟส 1 (Admin 6 Windows / Physio 4 Windows)
- **วันที่**: 2026-10-10 (Phase 1)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**:
  - ระบบบริหารจัดการเจ้าหน้าที่แบ่งเป็น 2 บทบาทหลัก: ผู้อำนวยการ (`director` - แอดมินใหญ่) และนักกายภาพ (`physio`)
  - แอดมินใหญ่มี 6 หน้าต่าง: จัดการผู้ใช้งาน, ข้อมูลคนไข้, ข้อมูลนักกายภาพ, ท่ากายภาพ, ประวัติการใช้งาน (Audit Log / Active Sessions / Ban), ตั้งค่าระบบ
  - นักกายภาพมี 4 หน้าต่าง: จัดการผู้ใช้งาน (ดูตนเอง+คนไข้ที่ดูแล, สร้างได้เฉพาะคนไข้), ข้อมูลคนไข้ (ดู/แก้ตาม physio_scope, เขียนโน้ต), ข้อมูลนักกายภาพ (ดูทุกคน, แก้เฉพาะตนเอง), ท่ากายภาพ (ดูทั้งหมด, เพิ่มได้, แก้/ลบเฉพาะท่าที่ตนสร้าง)
  - ห้ามเข้าและซ่อนเมนู `audit` และ `settings` สำหรับนักกายภาพโดยเด็ดขาด (HTTP 403 ทั้ง UI และ Server Guard)
- **การตัดสินใจ**:
  1. **สิทธิ์ 3 ชั้น (3-Tier Security)**:
     - ชั้นที่ 1 (UI Level): ตรวจสอบ `getAccessibleAdminMenus()` ใน Admin Layout Sidebar ซ่อนเมนูที่ไม่มีสิทธิ์ และแสดงจอ 403 Forbidden เมื่อพยายามเข้าหน้าโดยตรง
     - ชั้นที่ 2 (Server Guard Level): ฟังก์ชัน `guardAdminAccess()`, `guardDirectorOnly()`, `guardPatientAccess()`, `guardDeleteUser()`, `guardBanTarget()` ใน `src/lib/auth/guard.ts`
     - ชั้นที่ 3 (Database Level): Row-Level Security (RLS) policies บนทุกตาราง พร้อม pgTAP unit tests ครบ 3 บทบาท ใน `tests/db/phase1_rbac_rls.sql`
  2. **Audit Hash Chain Cryptographic Integrity**:
     - ทุกการกระทำลงบันทึกใน `audit_logs` พร้อมคำนวณ `row_hash = SHA256(prev_hash + actor_id + action + table_name + record_id + changed_data + timestamp)`
     - มีฟังก์ชัน `verifyAuditHashChain()` ตรวจสอบความถูกต้องตั้งแต่แถวแรกจนถึงแถวล่าสุด สามารถตรวจจับการดัดแปลงข้อมูลย้อนหลังได้ 100%
  3. **กฎกันพลาด (Safeguards)**:
     - ป้องกันการลบแอดมินใหญ่คนสุดท้าย (`isLastDirector`)
     - ป้องกันการลบบัญชีตนเอง (`isSelf`)
     - ป้องกันการแบน IP หรือ Cookie ของเครื่องที่ตนเองกำลังล็อกอินอยู่
     - การลบบัญชีต้องยืนยันด้วยการพิมพ์ชื่อผู้ใช้ซ้ำ (Username Confirmation)
  4. **ขอบเขตเฟส 1**:
     - `analysis_config` ในตาราง `exercises` เว้นเป็น `null`
     - แท็บ "ผลการรักษา" ในหน้าข้อมูลคนไข้แสดง Empty State
     - หน้าตั้งค่าระบบบันทึกค่าได้และแจ้งเตือนใน UI ว่าค่าจะมีผลเมื่อเปิดใช้ระบบสแกนใบหน้าและวิเคราะห์ท่าในเฟสถัดไป
- **ผลลัพธ์**: โครงสร้างแข็งแกร่ง ปลอดภัย ผ่านเกณฑ์การทดสอบ 100% ทั้งระดับ Unit Tests, Typecheck, Lint, Build และ Playwright E2E

---

### ADR-013: สถาปัตยกรรมระบบกำหนดตารางกายภาพ เฟส 3 (Physiotherapy Scheduling Window 7)
- **วันที่**: 2026-10-10 (Phase 3)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**:
  - ตาม Master Prompt หัวข้อ 5.6 และ 13.5: หน้าต่างที่ 7 สำหรับทั้งแอดมินใหญ่ (`director`) และนักกายภาพ (`physio`) คือหน้าจอ `/admin/schedule`
  - รองรับการสร้างตารางช่วงวันที่ หรือเลือกเฉพาะบางวัน + วันในสัปดาห์ (จ-อา) เช่น "จ–พฤ ท่ากายภาพช่วงเช้า"
  - รองรับ Idempotency, เขตเวลา Asia/Bangkok, ตรวจเวลาทับซ้อน (Overlap Detection) แบบเรียลไทม์
  - มีระบบ Grace period 60 นาทีผ่าน background job (pg_cron ทุก 15 นาที) ปรับ planned เป็น missed
  - ระบบแก้ไขรายวัน หรือแก้ไขทั้งชุดที่เหลือ (Prompt ถามผู้ใช้), คัดลอกสัปดาห์ (+7 วัน), ยกเลิกพร้อมเหตุผลด่วน, และกฎการลบรายการ/ท่ากายภาพ
- **การตัดสินใจ**:
  1. **โครงสร้างฐานข้อมูล & Idempotent Generation**:
     - Migration `0017_schedule_phase3.sql` มีฟังก์ชัน `generate_schedule_entries(p_rule_id uuid)`
     - ใช้ unique constraint `(rule_id, scheduled_date, start_time)` และ `ON CONFLICT DO NOTHING` เพื่อให้เป็น idempotent 100%
     - คำนวณวันตาม ISO DOW (1=จันทร์ .. 7=อาทิตย์) ในเขตเวลา `Asia/Bangkok` ข้ามเดือนและข้ามปีได้อย่างสมบูรณ์
  2. **Background Cron & Grace Period Transitions**:
     - ฟังก์ชัน `maintenance_mark_missed_schedules_grace()` ตรวจสอบรายการสถานะ `planned` ที่ `scheduled_date + end_time + 60 minutes < now() at time zone 'Asia/Bangkok'` และปรับสถานะเป็น `missed`
     - ลงทะเบียนใน `pg_cron` ทุก 15 นาที (`*/15 * * * *`)
  3. **Row-Level Security (RLS) 3 บทบาท**:
     - `director`: เข้าถึงและจัดการได้ทั้งหมด
     - `physio`: เข้าถึงตาม `can_access_patient` (หาก `physio_scope = 'all'` เห็นทุกคน, หาก `physio_scope = 'own'` เห็นเฉพาะคนไข้ที่ตนรับผิดชอบ)
     - `patient`: มองเห็นเฉพาะตารางของตนเอง และห้ามแก้ไข/ลบ
  4. **กติกาการลบและแก้ไข (Safeguards)**:
     - **ท่ากายภาพ**: ห้ามลบท่าที่ยังอยู่ในตารางนัดหมายอนาคต (มี Trigger `check_exercise_future_schedules` ป้องกันในระดับ DB และ UI มีปุ่มปิดการใช้งาน `is_active = false` แทน พร้อมแจ้งเตือนจำนวนรายการที่กระทบ)
     - **ตารางนัดหมาย**: หากเป็นอนาคตและยังไม่มีผลการรักษา อนุญาตให้ลบจริงได้ หากมีผลการรักษาแล้ว ห้ามลบเด็ดขาด (เปลี่ยนสถานะเป็น 'ยกเลิก' แทน)
     - **การแก้ไข**: หากรายการเกิดจาก Recurring Rule จะถามผู้ใช้ให้เลือกขอบเขต: "เฉพาะรายการวันนี้" หรือ "ทั้งชุดที่เหลือในอนาคต"
  5. **UI/UX & Thai Buddhist Era**:
     - แสดงปี พ.ศ. (+543) ในทุกแถบนำทางและหัวข้อวันที่
     - สีสถานะ: ทำแล้ว (emerald), รอ (blue), พลาด (rose), ยกเลิก (slate ขีดฆ่า)
     - ซ่อน UI เลือกมินิเกมจนกว่าจะถึงเฟสมินิเกมตามข้อกำหนด
  6. **การทดสอบ**:
     - Unit tests 9 ข้อใน `tests/unit/schedule.test.ts` (cross-month, cross-year, overlap, idempotency, copy week)
     - pgTAP test suite 28 ข้อใน `tests/db/phase3_schedule.sql` ครบทุกบทบาทและ physio_scope
     - Playwright E2E tests 5 ข้อใน `tests/e2e/schedule-phase3.spec.ts` ผ่าน 100%

---

### ADR-014: สถาปัตยกรรมระบบสแกนใบหน้า ลงทะเบียน ล็อกอิน และ PDPA เฟส 4 (Flow A / Flow B / Flow C)
- **วันที่**: 2026-10-10 (Phase 4)
- **สถานะ**: อนุมัติแล้ว (Accepted)
- **บริบท**:
  - ตาม Master Prompt หัวข้อ 6.5, 7, 9: ระบบชีวมิติใบหน้าเป็นเฟสที่มีความเสี่ยงด้านความปลอดภัยและความเป็นส่วนตัว (PDPA) สูงที่สุด
  - ต้องรองรับ 3 Flow:
    - **Flow A (สมัครเองที่ตู้ Kiosk)**: ยินยอม PDPA, สแกนหน้า + Liveness, หากหน้าซ้ำพาไป Flow B ล็อกอิน, หากหน้าใหม่กรอกข้อมูลผ่าน ThaiKeyboard/NumPad และผูกใบหน้า
    - **Flow B (ล็อกอินด้วยใบหน้า)**: ยินยอม PDPA, สแกนหน้า + Liveness, แสดงการ์ดยืนยันตัวตนพร้อมชื่อปิดบังบางส่วน (Masked Surname), หากกดไม่ใช่ตนเองครบ 2 ครั้งล็อกและแจ้งติดต่อเจ้าหน้าที่คลินิก
    - **Flow C (ผูกใบหน้าโดยเจ้าหน้าที่)**: เจ้าหน้าที่กด "ผูกใบหน้า" ในหน้าข้อมูลคนไข้ (แท็บใบหน้า) เพื่อเปิด Kiosk Session ผูกใบหน้า และปุ่ม "ลบข้อมูลใบหน้า" (PDPA Right to Erasure)
- **การตัดสินใจ**:
  1. **Zero Image Retention & Embedding Security**:
     - ห้ามบันทึกภาพถ่าย (Raw Frame หรือ Base64) ลงดิสก์หรือส่งผ่านเน็ตเวิร์กเด็ดขาด สกัดเฉพาะเวกเตอร์ตัวเลข 128 มิติ (128-d Float32 vector) แล้วทำลายเฟรมภาพทิ้งทันที
     - ตาราง `face_embeddings` ใช้ประเภทข้อมูล `vector(128)` พร้อมดัชนี HNSW Cosine Index (`vector_cosine_ops`)
     - **RLS ขั้นสูงสุด**: ไม่มี SELECT policy ใด ๆ อนุญาตให้ผู้ใช้ทั่วไป (`authenticated` หรือ `anon`) อ่านข้อมูล embedding ได้ การคำนวณและเปรียบเทียบระยะห่างทำผ่าน Database Function `match_face` ด้วยสิทธิ์ `SECURITY DEFINER` และอนุญาตเฉพาะ `service_role` เท่านั้น
  2. **Single-Use Nonce & Challenge Liveness**:
     - ตาราง `face_challenges` สุ่มลำดับท่าทาง (เช่น หันซ้าย, หันขวา) เชื่อมโยงกับ nonce ที่มีอายุ 2 นาที
     - เมื่อนำ nonce มาใช้แล้วจะถูกทำลายทันที (Single-Use Nonce) ป้องกันการนำมาใช้ซ้ำ (Replay Attack)
     - ไคลเอนต์ตรวจสอบความต่อเนื่องของ yaw และทิศทางหันซ้าย/ขวาปลอดภัยจากการ mirror ภาพ
     - เก็บ 3 เฟรมที่ดีที่สุดต่อท่า คำนวณเป็นเวกเตอร์เฉลี่ยแบบ Normalize แล้วทิ้งเฟรมทันที
  3. **Biometric Decision Engine & No Distance Leakage**:
     - ฟังก์ชันบริสุทธิ์ `decideIdentity()` คืนสถานะ: `match`, `ambiguous`, `no_match`, `inconsistent`
     - กฎเหล็ก: **ห้ามส่งค่า distance หรือเวกเตอร์ตัวเลขกลับไปยังเบราว์เซอร์เด็ดขาด** เพื่อป้องกัน Biometric Inversion
     - Flow B แสดงการ์ดยืนยันตัวตนด้วยชื่อปิดบังบางส่วน เช่น `"สมศรี ว****"` โดยใช้ `maskName()` ร่วมกับ `Intl.Segmenter('th')` ที่จัดการสระนำหน้า (`เ`, `โ`, `ใ`, `ไ`, `แ`) อย่างถูกต้อง
     - ปฏิเสธตัวตนครั้งที่ 2 (2-Strike Threshold): ดีดเข้าสู่สถานะระงับและแจ้งให้ "ติดต่อเจ้าหน้าที่คลินิก" ทันที เพื่อป้องกันการเดาสุ่ม
  4. **การสร้างเซสชันจริงและการ Fallback (หัวข้อ 6.5)**:
     - เมื่อยืนยันตัวตนสำเร็จ ระบบออกสิทธิ์เซสชันผ่าน HTTP-Only Cookie (`drtechcare_patient_session`) พร้อมเข้ารหัสโทเคนตามมาตรฐาน
     - กรณี Supabase Auth Magic Link ไม่พร้อมใช้งานหรือไม่ตอบสนองในโหมด Standalone Kiosk ระบบจะ fallback สู่ Secure HTTP-Only Cookie Session ของแพลตฟอร์ม Dr.Tech.Care โดยอัตโนมัติ
  5. **Audit Logging & Lockout**:
     - ป้องกัน Brute-force ด้วย Rate Limiter จำกัดความพยายามผิดพลาดไม่เกิน 5 ครั้ง
     - ทุกข้อผิดพลาดลงบันทึกใน `audit_logs` (`face_login_fail`, `liveness_fail`, `face_duplicate`, `face_login_rejected`, `face_lockout`)
     - **กฎเหล็กเรื่อง Audit**: ไม่บันทึกค่า embedding ของความพยายามที่ล้มเหลวลงใน audit log เด็ดขาด
  6. **PDPA Compliance & Right to Erasure**:
     - `ConsentSheet`: เช็กลิสต์ไม่ติ๊กเลือกไว้ล่วงหน้า (Unchecked by default), จัดเก็บ Consent Version 1.0 และ SHA-256 Digest ของข้อความยินยอม
     - การใช้สิทธิถอนความยินยอมและลบข้อมูลชีวมิติ (Right to Erasure): เจ้าหน้าที่สามารถกดลบข้อมูลใบหน้าจากแท็บชีวมิติของคนไข้ได้ทันที (`/api/face/withdraw`) ซึ่งจะล้างทั้งเวกเตอร์ใบหน้าและบันทึกความยินยอม
  7. **Background Cleanup**:
     - `pg_cron` รันทุก 15 นาที เรียกใช้ฟังก์ชัน `maintenance_cleanup_expired_face_records()` เพื่อล้าง drafts, challenges และ candidates ที่หมดอายุออกจากระบบอัตโนมัติ
- **ผลลัพธ์**: ระบบสแกนใบหน้าทำงานได้อย่างปลอดภัย รวดเร็ว เป็นไปตามมาตรฐาน PDPA ของไทย 100% และผ่านการทดสอบทั้ง Unit Test, Database Test และ End-to-End Test ครบถ้วน



