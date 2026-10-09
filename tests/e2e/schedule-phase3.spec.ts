import { test, expect } from "@playwright/test";

test.describe("Dr.Tech.Care Phase 3 — Physiotherapy Schedule (/admin/schedule) E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/schedule");
    await page.waitForLoadState("domcontentloaded");
  });

  test("1. Schedule page loads with Thai Buddhist Era and accessible by Director and Physio", async ({
    page,
  }) => {
    // 1. ตรวจสอบหัวข้อหน้าต่างที่ 7
    await expect(page.locator("h1:has-text('กำหนดตารางกายภาพ')")).toBeVisible();
    await expect(page.locator("text=หน้าต่างที่ 7")).toBeVisible();

    // 2. ตรวจสอบปี พ.ศ. (2569) ในแถบนำทางวันที่
    await expect(page.locator("text=2569").first()).toBeVisible();

    // 3. สลับบทบาทเป็นนักกายภาพ (Physio) แล้วยังสามารถเข้าถึง /admin/schedule ได้
    await page.click("#btn-switch-physio");
    await expect(page.locator("text=นักกายภาพ").first()).toBeVisible();
    await expect(page.locator("#nav-schedule")).toBeVisible();
    await expect(page.locator("h1:has-text('กำหนดตารางกายภาพ')")).toBeVisible();

    // สลับกลับเป็น Director
    await page.click("#btn-switch-director");
  });

  test("2. Searchable Patient selector and Week/Day view toggle", async ({ page }) => {
    // 1. ค้นหาคนไข้ในกล่องค้นหา
    const searchInput = page.locator("#input-search-patient");
    await searchInput.fill("สมศรี");
    await expect(page.locator("#select-patient")).toBeVisible();

    // 2. สลับมุมมองวัน (Day view) และกลับมามุมมองสัปดาห์ (Week view)
    await page.click("#btn-view-day");
    await expect(page.locator("text=รายการตารางกายภาพประจำวัน")).toBeVisible();

    await page.click("#btn-view-week");
    await expect(page.locator("text=วันจันทร์")).toBeVisible();
    await expect(page.locator("text=วันพฤหัสบดี")).toBeVisible();
    await expect(page.locator("text=วันอาทิตย์")).toBeVisible();
  });

  test("3. Create Schedule with Mon-Thu preset, live preview, overlap detection and save", async ({
    page,
  }) => {
    // 1. เปิด Modal กำหนดตารางกายภาพ
    await page.click("#btn-open-create-schedule");
    await expect(page.locator("h2:has-text('กำหนดตารางกายภาพใหม่')")).toBeVisible();

    // 2. กดปุ่ม Preset 'จ–พฤ (ตัวอย่าง)' ตามโจทย์ Master Prompt
    await page.click("#btn-preset-mon-thu");

    // 3. ตรวจสอบพรีวิวว่ามีรายการถูกคำนวณแบบเรียลไทม์
    await expect(page.locator("text=พรีวิวรายการที่จะถูกสร้าง")).toBeVisible();

    // 4. ทดสอบ Overlap Detection: ตั้งเวลา 09:00 - 09:45 ซึ่งชนกับ ent-3 (12 ต.ค. 09:00)
    await page.fill("#create-start-date", "2026-10-12");
    await page.fill("#create-end-date", "2026-10-15");
    await page.fill("#create-start-time", "09:00");
    await page.fill("#create-end-time", "09:45");

    // ต้องพบ Alert Banner เวลาทับซ้อน และปุ่มบันทึกต้อง disabled
    await expect(page.locator("#banner-overlap-alert")).toBeVisible();
    await expect(page.locator("#btn-confirm-save-schedule")).toBeDisabled();

    // 5. ปรับเปลี่ยนเป็นเวลาที่ไม่ชน (เช่น 15:00 - 15:45)
    await page.fill("#create-start-time", "15:00");
    await page.fill("#create-end-time", "15:45");

    // Alert Banner ต้องหายไป และปุ่มบันทึกใช้งานได้
    await expect(page.locator("#banner-overlap-alert")).toHaveCount(0);
    await expect(page.locator("#btn-confirm-save-schedule")).toBeEnabled();

    // 6. บันทึกตารางกายภาพ
    await page.click("#btn-confirm-save-schedule");

    // ตรวจสอบ Toast สำเร็จ
    await expect(
      page.locator("text=กำหนดตารางกายภาพสำเร็จ สร้างรายการฝึกทั้งหมด")
    ).toBeVisible();

    // รายการใหม่ 15:00 ต้องปรากฏในหน้าจอ
    await expect(page.locator("text=15:00 - 15:45").first()).toBeVisible();
  });

  test("4. Quick Cancel with reasons (คนไข้ไม่มา) and Status color updating", async ({
    page,
  }) => {
    // 1. คลิกที่รายการนัดหมาย ent-3 (12 ต.ค.)
    const entryCard = page.locator("#entry-card-ent-3");
    await entryCard.click();

    // 2. รายละเอียด Modal ต้องเปิดขึ้น
    await expect(page.locator("h3:has-text('รายละเอียดรายการกายภาพ')")).toBeVisible();

    // 3. คลิก 'ยกเลิกนัดหมาย'
    await page.click("#btn-entry-cancel");
    await expect(page.locator("h3:has-text('ยกเลิกรายการนัดหมาย')")).toBeVisible();

    // 4. เลือกเหตุผล 'คนไข้ไม่มา' แล้วกดยืนยัน
    await page.click("text=คนไข้ไม่มา");
    await page.click("#btn-confirm-cancel-schedule");

    // 5. สถานะในหน้าจอต้องอัปเดตเป็น 'ยกเลิก (คนไข้ไม่มา)'
    await expect(page.locator("text=ยกเลิก (คนไข้ไม่มา)").first()).toBeVisible();
  });

  test("5. Copy week schedule (+7 days) duplicates planned items to next week", async ({
    page,
  }) => {
    // 1. กดปุ่ม 'คัดลอกสัปดาห์ (+7 วัน)'
    await page.click("#btn-copy-week");

    // 2. ตรวจสอบการแจ้งเตือนว่าคัดลอกตารางไปสัปดาห์ถัดไปสำเร็จ
    await expect(page.locator("text=คัดลอกตารางไปสัปดาห์ถัดไปสำเร็จ")).toBeVisible();
  });
});
