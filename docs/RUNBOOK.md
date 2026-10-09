# คู่มือปฏิบัติการและการกู้คืนระบบตู้ Kiosk (Operations & Disaster Recovery Runbook)
**โครงการ: Dr.Tech.Care**

---

## 1. คำสั่งรัน Chromium Kiosk Mode บนหน้าจอแนวตั้ง (9:16)
สำหรับการติดตั้งตู้ Kiosk จริงในโรงพยาบาล ใช้คำสั่งรัน Google Chrome / Chromium ในโหมด Kiosk เต็มหน้าจอ ป้องกันการปิดหรือเปิดแท็บอื่น:

```bash
# Windows Command Prompt / PowerShell
chrome.exe ^
  --kiosk "https://dr-tech-care.vercel.app/" ^
  --incognito ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-context-menu ^
  --use-fake-ui-for-media-stream ^
  --autoplay-policy=no-user-gesture-required ^
  --window-size=1080,1920 ^
  --window-position=0,0
```

## 2. ขั้นตอนการสำรองและกู้คืนฐานข้อมูล (Backup & Drill Disaster Recovery)
1. **การสำรองข้อมูลอัตโนมัติ (Daily Backup):**
   ```bash
   # สำรองข้อมูลเฉพาะ Schema และตารางหลัก ยกเว้นข้อมูลแคชชั่วคราว
   supabase db dump -f backup_$(date +%Y%m%d).sql
   ```
2. **ขั้นตอนการซ้อมกู้คืนจริง (Disaster Recovery Drill):**
   ```bash
   # 1. ทดสอบสร้างฐานข้อมูลจำลองสำหรับ Recovery
   supabase db reset
   # 2. นำเข้าข้อมูลสำรอง
   psql -h localhost -p 54322 -U postgres -d postgres -f backup_20261010.sql
   # 3. รันคำสั่งตรวจสอบความสมบูรณ์ของ Audit Hash Chain
   psql -c "SELECT * FROM public.verify_audit_chain();"
   ```

## 3. การจัดการเหตุการณ์ฉุกเฉิน (Incident Response)
- **เมื่อพบการตัดการเชื่อมต่อเครือข่าย:** ตู้จะสลับเข้าสู่โหมดออฟไลน์และแสดงคำเตือนสีส้ม โดยยังอนุญาตให้ทำกายภาพบำบัดต่อเนื่องในเซสชันปัจจุบัน และส่งข้อมูลเข้าคิวออฟไลน์เพื่อซิงก์เมื่อกลับมาออนไลน์
- **เมื่อมีผู้ป่วยกดปุ่มฉุกเฉิน 1669:** หน้าจอจะล็อกเข้าสู่โหมดฉุกเฉินสีแดง ส่งสัญญาณเสียง และส่งข้อความแจ้งเตือน Realtime ไปยังแผงควบคุมนักกายภาพทันที
