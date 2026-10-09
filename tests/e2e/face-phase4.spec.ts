import { test, expect } from "@playwright/test";

test.describe("Dr.Tech.Care Phase 4 — Face Biometrics, Enrollment, Login & PDPA Compliance", () => {
  test("1. ConsentSheet starts unchecked and requires explicit affirmative consent", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // คลิกปุ่มใหญ่ 'สแกนใบหน้าเพื่อเข้าสู่ระบบ'
    await page.click("button:has-text('สแกนใบหน้าเพื่อเข้าสู่ระบบ')");

    // ตรวจสอบหน้า ConsentSheet
    await expect(page.locator("h2:has-text('ยินยอมสแกนใบหน้าเพื่อเข้าสู่ระบบ')")).toBeVisible();
    await expect(page.locator("text=ข้อตกลงชีวมิติเวอร์ชัน 1.0")).toBeVisible();
    await expect(page.locator("text=SHA-256:")).toBeVisible();

    // กฎเหล็ก PDPA: ห้ามติ๊กล่วงหน้า (Must NOT be pre-checked)
    const consentCheckbox = page.locator("#consent-checkbox");
    await expect(consentCheckbox).not.toBeChecked();

    // ปุ่มยินยอมต้อง Disable เมื่อยังไม่ติ๊ก
    const submitBtn = page.locator("button:has-text('กรุณาติ๊กให้ความยินยอมก่อน')");
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // ผู้ใช้ติ๊กยินยอมด้วยตนเอง
    await consentCheckbox.check();
    await expect(consentCheckbox).toBeChecked();

    // ปุ่มกลายเป็นใช้งานได้
    const proceedBtn = page.locator("button:has-text('ยินยอมและเริ่มสแกนใบหน้า')");
    await expect(proceedBtn).toBeEnabled();
    await proceedBtn.click();

    // เข้าสู่หน้าสแกนใบหน้า
    await expect(page.locator("text=👉 ขั้นที่ 1/3: นั่งตรง มองที่กล้องด้านบน")).toBeVisible();
  });

  test("2. Flow B: Masked surname on card and 2-strike rejection to staff contact", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click("button:has-text('สแกนใบหน้าเพื่อเข้าสู่ระบบ')");
    await page.locator("#consent-checkbox").check();
    await page.click("button:has-text('ยินยอมและเริ่มสแกนใบหน้า')");

    // สแกนใบหน้า (ใช้ปุ่มจำลองตรวจพบใบหน้า)
    await page.click("button:has-text('จำลองตรวจพบใบหน้า')");

    // ตรวจสอบหน้ายืนยันตัวตน (Login Confirm)
    await expect(page.locator("h2:has-text('ตรวจพบข้อมูลผู้ป่วย')")).toBeVisible();
    // ต้องแสดงนามสกุลปิดบังบางส่วน (e.g. สมศรี ว****) ตาม PDPA
    await expect(page.locator("text=สมศรี ว****")).toBeVisible();

    // ปฏิเสธครั้งที่ 1 (Rejection 1)
    await page.click("button:has-text('ไม่ใช่ (ลองสแกนใหม่')");

    // กลับมาหน้าสแกนอีกครั้ง
    await expect(page.locator("text=สแกนใบหน้าเพื่อเข้าสู่ระบบ")).toBeVisible();
    await page.click("button:has-text('จำลองตรวจพบใบหน้า')");

    // ปฏิเสธครั้งที่ 2 (Rejection 2 - Strike 2)
    await page.click("button:has-text('ไม่ใช่ (ลองสแกนใหม่')");

    // กฎเหล็ก: ต้องแสดงหน้าติดต่อเจ้าหน้าที่ และระงับการลองใหม่
    await expect(page.locator("h2:has-text('กรุณาติดต่อเจ้าหน้าที่คลินิก')")).toBeVisible();
    await expect(page.locator("text=ท่านได้ปฏิเสธตัวตนครบ 2 ครั้ง")).toBeVisible();
    await expect(page.locator("button:has-text('กลับสู่หน้าแรก')")).toBeVisible();
  });

  test("3. Flow A: Self-registration detects duplicate face and redirects to Flow B", async ({
    page,
  }) => {
    await page.goto("/");

    // คลิกปุ่ม 'สมัครบัญชีใหม่'
    await page.click("button:has-text('สมัครบัญชีใหม่')");

    // ตรวจสอบ ConsentSheet ของผู้สมัครใหม่
    await expect(page.locator("h2:has-text('ความยินยอมข้อมูลชีวมิติ (PDPA)')")).toBeVisible();
    await page.locator("#consent-checkbox").check();
    await page.click("button:has-text('ยินยอมและเริ่มสแกนใบหน้า')");

    // ในหน้าสแกนสมัครใหม่ ให้ทดสอบจำลองใบหน้าซ้ำกับคนในระบบ
    await page.click("button:has-text('(ทดสอบ: จำลองพบใบหน้าซ้ำกับบัญชีเดิม)')");

    // ตรวจสอบหน้าแจ้งเตือนใบหน้าซ้ำ
    await expect(page.locator("h2:has-text('คุณมีบัญชีในระบบอยู่แล้ว')")).toBeVisible();
    await expect(page.locator("text=สมศรี ว****")).toBeVisible();

    // คลิก 'เข้าสู่ระบบด้วยบัญชีนี้' -> พากลับไป Flow B หน้า Confirm
    await page.click("button:has-text('เข้าสู่ระบบด้วยบัญชีนี้')");
    await expect(page.locator("h2:has-text('ตรวจพบข้อมูลผู้ป่วย')")).toBeVisible();
    await expect(page.locator("text=สมศรี ว****")).toBeVisible();
  });

  test("4. Flow C: Admin Patient biometrics tab with bind face and withdraw face", async ({
    page,
  }) => {
    await page.goto("/admin/patients");
    await page.waitForLoadState("domcontentloaded");

    // คลิกที่แถวคนไข้เพื่อเปิด Drawer
    const patientRow = page.locator("tbody tr").first();
    await patientRow.click();

    // คลิกแท็บที่ 4: '4. ข้อมูลใบหน้า & PDPA'
    await page.click("button:has-text('4. ข้อมูลใบหน้า & PDPA')");

    // ตรวจสอบสถานะชีวมิติและปุ่มทั้งสอง
    await expect(page.locator("text=สถานะชีวมิติใบหน้า:")).toBeVisible();
    const bindBtn = page.locator("button:has-text('ผูกใบหน้า (Flow C)')");
    const withdrawBtn = page.locator("button:has-text('ลบข้อมูลใบหน้า (PDPA Right to Erasure)')");
    await expect(bindBtn).toBeVisible();
    await expect(withdrawBtn).toBeVisible();

    // ทดสอบกดปุ่ม 'ผูกใบหน้า'
    await bindBtn.click();
    await expect(page.locator("text=รหัสคำขอผูกใบหน้า: bind-")).toBeVisible();
  });
});
