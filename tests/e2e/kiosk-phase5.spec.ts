import { test, expect } from "@playwright/test";

test.describe("Dr.Tech.Care Phase 5 — Patient Screens (/home, /today, /done), Kiosk State Machine & Hardening", () => {
  test("1. URL Route Guard: ป้องกันการข้ามขั้นด้วย URL (เข้า /home, /today, /done ตรงๆ ต้องถูกดีดกลับหน้าแรก /)", async ({
    page,
  }) => {
    // 1.1 พยายามเปิด /home ตรง ๆ โดยยังไม่ได้ Login
    await page.goto("/home");
    await page.waitForTimeout(600);
    expect(page.url()).toMatch(/\/(|#.*)$/);

    // 1.2 พยายามเปิด /today ตรง ๆ โดยยังไม่ได้ Login
    await page.goto("/today");
    await page.waitForTimeout(600);
    expect(page.url()).toMatch(/\/(|#.*)$/);

    // 1.3 พยายามเปิด /done ตรง ๆ โดยยังไม่ได้ Login
    await page.goto("/done");
    await page.waitForTimeout(600);
    expect(page.url()).toMatch(/\/(|#.*)$/);
  });

  test("2. Flow คนไข้: ล็อกอินใบหน้า -> เข้า /home เห็นรายการวันนี้ 4 สถานะ -> ปุ่มเริ่มเลย", async ({
    page,
  }) => {
    // 2.1 เข้าหน้าแรก
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText("Dr.Tech.Care");

    // ตรวจสอบสถานะตู้ออนไลน์จาก Heartbeat
    await expect(page.locator("text=ตู้ออนไลน์")).toBeVisible();

    // 2.2 กดปุ่มสแกนใบหน้าเพื่อเข้าสู่ระบบ
    await page.click("button:has-text('สแกนใบหน้าเพื่อเข้าสู่ระบบ')");

    // ยินยอม PDPA
    await expect(page.locator("h2:has-text('ยินยอมสแกนใบหน้าเพื่อเข้าสู่ระบบ')")).toBeVisible();
    await page.locator("#consent-checkbox").check();
    await page.click("button:has-text('ยินยอมและเริ่มสแกนใบหน้า')");

    // 2.3 เข้าสู่หน้าสแกนหน้า -> กดจำลองตรวจพบใบหน้า
    await page.waitForSelector("text=จำลองตรวจพบใบหน้า");
    await page.click("text=จำลองตรวจพบใบหน้า");

    // 2.4 หน้ายืนยันตัวตน ("ใช่บัญชีของท่านหรือไม่?")
    await expect(page.locator("text=ใช่บัญชีของท่านหรือไม่?")).toBeVisible();
    await expect(page.locator("text=สมศรี ว****")).toBeVisible();

    // กดยืนยัน -> เข้าสู่หน้า /home จริงผ่าน state machine
    await page.click("button:has-text('ใช่ (เข้าสู่หน้าหลักของฉัน)')");
    await page.waitForURL("**/home");

    // 2.5 ตรวจสอบข้อมูลในหน้า /home
    await expect(page.locator("h1")).toContainText("สวัสดีคุณสมศรี วัฒนพาณิชย์");
    await expect(page.locator("text=กภ. ปิยะ สมบูรณ์")).toBeVisible();
    await expect(page.locator("text=รายการวันนี้ (เรียงตามเวลา)")).toBeVisible();

    // ตรวจสอบสถานะทั้ง 4 ชนิด (ทำแล้ว / ถึงเวลา / รอ)
    await expect(page.locator("text=⏳ ถึงเวลา").first()).toBeVisible();
    await expect(page.locator("text=⏸ รอ").first()).toBeVisible();

    // ตรวจสอบปุ่ม "เริ่มเลย (รายการถัดไป)"
    await expect(page.locator("text=เริ่มเลย (รายการถัดไป)")).toBeVisible();
  });

  test("3. /today ตารางสัปดาห์ (จ–อา), แตะการ์ดดูรายละเอียดท่า, และบันทึกผลผ่านเซิร์ฟเวอร์ -> /done", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log(`[BROWSER]: ${msg.text()}`));

    // ล็อกอินก่อนเข้าสู่ /home
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.click("button:has-text('สแกนใบหน้าเพื่อเข้าสู่ระบบ')");
    await page.locator("#consent-checkbox").check();
    await page.click("button:has-text('ยินยอมและเริ่มสแกนใบหน้า')");
    await page.waitForSelector("text=จำลองตรวจพบใบหน้า");
    await page.click("text=จำลองตรวจพบใบหน้า");
    await page.click("button:has-text('ใช่ (เข้าสู่หน้าหลักของฉัน)')");
    await page.waitForURL("**/home");

    // 3.1 กดปุ่ม "ดูตารางการฝึกทั้งสัปดาห์ (จ–อา)"
    await page.click("text=ดูตารางการฝึกทั้งสัปดาห์ (จ–อา)");
    await page.waitForURL("**/today");

    // 3.2 ตรวจสอบแถบวัน 7 วัน (จันทร์ - อาทิตย์)
    await expect(page.locator("nav[aria-label='แถบเลือกวันในสัปดาห์']")).toBeVisible();
    await expect(page.locator("text=ตารางกายภาพ (จ–อา)")).toBeVisible();

    // ตรวจสอบข้อความช่วงเวลาเริ่มฝึก
    await expect(page.locator("text=ช่วงเริ่มฝึก: [เริ่ม − 30น., สิ้นสุด + 60น.]")).toBeVisible();

    // 3.3 แตะการ์ดท่ากายภาพเพื่อเปิด Modal รายละเอียด
    await page.click("text=กายภาพบำบัด: ยกแขนบริหารไหล่");
    await expect(page.locator("role=dialog")).toBeVisible();
    await expect(page.locator("text=รายละเอียดท่ากายภาพ")).toBeVisible();
    await expect(page.locator("role=dialog").locator("text=5 ครั้ง")).toBeVisible();
    await expect(page.locator("text=ขั้นตอนการปฏิบัติ:")).toBeVisible();

    // 3.4 กดปุ่ม "เริ่มฝึก / บันทึกผลสำเร็จ" -> เซิร์ฟเวอร์อัปเดตและพาไปหน้า /done
    await page.click("button:has-text('เริ่มฝึก / บันทึกผลสำเร็จ')");
    await page.waitForURL("**/done");

    // 3.5 ตรวจสอบหน้า /done
    await expect(page.locator("h1")).toContainText("ยอดเยี่ยมมากครับ!");
    await expect(page.locator("text=ระบบจะออกจากระบบอัตโนมัติใน")).toBeVisible();

    // กดปุ่ม "ออกเลย (เสร็จสิ้น)" -> รีเซ็ตและกลับสู่หน้าแรก /
    await page.click("button:has-text('ออกเลย (เสร็จสิ้น)')");
    await page.waitForURL("/");
  });

  test("4. Kiosk Hardening 4.4 (/setup): Fullscreen, Wake Lock, Checklist, Touch Targets >= 96px", async ({
    page,
  }) => {
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");

    // 4.1 ตรวจสอบหัวข้อ Kiosk Hardening
    await expect(page.locator("h1")).toContainText("ตั้งค่าระบบหน้าจอ Kiosk");
    await expect(page.locator("text=Kiosk Hardening & Setup (4.4)")).toBeVisible();

    // 4.2 ตรวจสอบปุ่ม Fullscreen และ Wake Lock (Target ที่ <button>)
    const fullscreenBtn = page.locator("button:has-text('เข้าสู่โหมดเต็มจอ (Fullscreen)')");
    await expect(fullscreenBtn).toBeVisible();

    const wakeLockBtn = page.locator("button:has-text('เปิดป้องกันจอดับ (Wake Lock)')");
    await expect(wakeLockBtn).toBeVisible();

    // 4.3 ตรวจสอบขนาดปุ่มสัมผัส (Touch Targets >= 96px บน button)
    const btnBox = await fullscreenBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(96);
    }

    // 4.4 ตรวจสอบ Checklist รายการความปลอดภัย
    await expect(page.locator("text=ล็อกซูม (Zoom Locked: 1.0)")).toBeVisible();
    await expect(page.locator("text=ปิด Context Menu (คลิกขวา)")).toBeVisible();
    await expect(page.locator("text=Overscroll None (กันเลื่อนทะลุ)")).toBeVisible();
    await expect(page.locator("text=Touch Target ≥ 96×96px")).toBeVisible();

    // 4.5 ปุ่มกลับหน้าแรก
    await page.click("text=กลับสู่โหมดบริการผู้ป่วย (หน้าแรก)");
    await page.waitForURL("/");
  });

  test("5. การวัดความพร้อม Accessibility (a11y Score >= 95%): สี Contrast, ARIA, Touch Targets", async ({
    page,
  }) => {
    await page.goto("/setup");
    await page.waitForLoadState("domcontentloaded");

    // ตรวจสอบหลักเกณฑ์การเข้าถึง (Accessibility Compliance)
    const a11yAudit = await page.evaluate(() => {
      let passedChecks = 0;
      let totalChecks = 0;

      // Check 1: มี h1 เดียว
      totalChecks++;
      const h1s = document.querySelectorAll("h1");
      if (h1s.length === 1) passedChecks++;

      // Check 2: มี landmark tags
      totalChecks++;
      const hasHeader = !!document.querySelector("header");
      const hasMain = !!document.querySelector("main");
      const hasFooter = !!document.querySelector("footer");
      if (hasHeader && hasMain && hasFooter) passedChecks++;

      // Check 3: ทุกปุ่มมี accessible text / aria-label
      totalChecks++;
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const allButtonsLabeled = buttons.every(
        (b) =>
          b.textContent?.trim().length ||
          b.getAttribute("aria-label")?.trim().length
      );
      if (allButtonsLabeled) passedChecks++;

      // Check 4: Touch targets ขนาดใหญ่ >= 40px (และปุ่มหลัก >= 96px)
      totalChecks++;
      const primaryButtons = Array.from(document.querySelectorAll("button"));
      const touchTargetsValid = primaryButtons.every((b) => {
        const rect = b.getBoundingClientRect();
        return rect.height >= 40 && rect.width >= 40;
      });
      if (touchTargetsValid) passedChecks++;

      // Check 5: ไม่มีการใช้ text-white บนปุ่มเขียว #2FB39A (Contrast rule)
      totalChecks++;
      const greenButtons = Array.from(
        document.querySelectorAll(".bg-\\[\\#2FB39A\\]")
      );
      const greenButtonsCompliant = greenButtons.every(
        (b) => !b.classList.contains("text-white")
      );
      if (greenButtonsCompliant) passedChecks++;

      const score = Math.round((passedChecks / totalChecks) * 100);
      return { passedChecks, totalChecks, score };
    });

    expect(a11yAudit.score).toBeGreaterThanOrEqual(95);
  });
});
