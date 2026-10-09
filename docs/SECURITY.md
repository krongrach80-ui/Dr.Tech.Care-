# สถาปัตยกรรมความปลอดภัยและข้อจำกัดทางเทคนิค (Security Architecture & Constraints)
**โครงการ: Dr.Tech.Care**

---

## 1. ภัยคุกคามและการป้องกันระบบตรวจจับการมีชีวิต (Liveness Constraints)
1. **Presentation Attack Detection (PAD):**
   - **การใช้ภาพถ่าย 2D (Printed Photo Attack):** ป้องกันด้วยการบังคับให้ผู้ใช้หันศีรษะตามลำดับมุม Yaw ที่สุ่มขึ้นสด (มองตรง -> ซ้าย/ขวา -> ขวา/ซ้าย) ภาพนิ่ง 2D ไม่สามารถเปลี่ยนมุม Yaw ได้
   - **การใช้วิดีโออัดซ้ำ (Video Replay Attack):** ป้องกันด้วย Server Challenge Nonce ที่มีอายุ 60 วินาที และลำดับท่าสุ่มที่ผู้โจมตีไม่สามารถคาดเดาคลิปวิดีโอล่วงหน้าได้
   - **ข้อจำกัดทางเทคนิค (Known Limitations):**
     - ตู้ Kiosk ที่ใช้กล้อง RGB เชิงเดี่ยว (Monocular RGB) โดยไม่มีกล้องอินฟราเรด (IR) หรือเซนเซอร์ Time-of-Flight (ToF) อาจมีข้อจำกัดในการแยกแยะหน้ากากยางซิลิโคน 3D (Silicon 3D Mask)
     - ในกรณีที่ระบบตรวจพบความผิดปกติ เช่น มุม Yaw เปลี่ยนแปลงเร็วผิดปกติ (`too_fast`) หรือแสงสว่างไม่พอ ระบบจะตัดสิทธิ์และแนะนำให้ไปสแกนที่เคาน์เตอร์เจ้าหน้าที่ทันที

## 2. ความปลอดภัยทางเครือข่ายและเว็บ (Web Security Hardening)
- **Content Security Policy (CSP):** บังคับ `default-src 'self'`, `frame-ancestors 'none'`, และอนุญาต `'wasm-unsafe-eval'` เฉพาะที่จำเป็นสำหรับการประมวลผล MediaPipe WASM ภายในเครื่อง
- **Headers ป้องกันการโจมตี:**
  - `X-Frame-Options: DENY` (ป้องกัน Clickjacking)
  - `X-Content-Type-Options: nosniff` (ป้องกัน MIME Confusion)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS)

## 3. ความปลอดภัยของฐานข้อมูลและสิทธิ์ 3 ชั้น (Database & RLS)
- ทุกตารางใน Schema `public` เปิดใช้งาน Row Level Security (RLS)
- ฟังก์ชัน `match_face` ถูกเพิกถอนสิทธิ์จาก `public`, `anon`, และ `authenticated` โดยเรียกใช้งานได้เฉพาะ `service_role` จากฝั่งเซิร์ฟเวอร์เท่านั้น
- ตาราง `audit_logs` เป็นระบบ Append-only ที่ป้องกันการ `UPDATE`, `DELETE`, และ `TRUNCATE` ผ่าน Trigger ระดับฐานข้อมูล พร้อมตรวจสอบสายโซ่แฮช SHA-256 (Hash Chain Integrity)
