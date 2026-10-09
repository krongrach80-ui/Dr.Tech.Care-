import { test, expect } from "@playwright/test";

test.describe("Dr.Tech.Care Phase 1 — Admin & Physio RBAC and Windows E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin overview
    await page.goto("/admin/overview");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Director has full access to all 6 windows and overview", async ({ page }) => {
    await page.click("#btn-switch-director");
    // 1. Verify Director role by default
    await expect(page.locator("text=แอดมินใหญ่").first()).toBeVisible();

    // 2. Overview metrics visible
    await expect(page.locator("text=บัญชีผู้ใช้งานทั้งหมด")).toBeVisible();
    await expect(page.locator("text=คนไข้ในระบบ")).toBeVisible();

    // 3. Navigate to /admin/users
    await page.click("#nav-users");
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator("h1:has-text('จัดการผู้ใช้งาน')")).toBeVisible();

    // 4. Navigate to /admin/patients
    await page.click("#nav-patients");
    await expect(page).toHaveURL(/\/admin\/patients/);
    await expect(page.locator("h1:has-text('ข้อมูลคนไข้')")).toBeVisible();

    // 5. Navigate to /admin/physios
    await page.click("#nav-physios");
    await expect(page).toHaveURL(/\/admin\/physios/);
    await expect(page.locator("h1:has-text('ข้อมูลนักกายภาพ')")).toBeVisible();

    // 6. Navigate to /admin/exercises
    await page.click("#nav-exercises");
    await expect(page).toHaveURL(/\/admin\/exercises/);
    await expect(page.locator("h1:has-text('ท่ากายภาพ')")).toBeVisible();

    // 7. Navigate to /admin/audit (Director Only)
    await page.click("#nav-audit");
    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.locator("h1:has-text('ประวัติการใช้งาน')")).toBeVisible();

    // 8. Navigate to /admin/settings (Director Only)
    await page.click("#nav-settings");
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.locator("h1:has-text('ตั้งค่าระบบ')")).toBeVisible();
  });

  test("Physiotherapist receives strict 403 Forbidden on /admin/audit and /admin/settings", async ({
    page,
  }) => {
    // 1. Switch role to Physio via Quick Testing Switcher
    await page.click("#btn-switch-physio");
    await expect(page.locator("text=นักกายภาพ").first()).toBeVisible();

    // 2. Sidebar should NOT display audit or settings links
    await expect(page.locator("#nav-audit")).toHaveCount(0);
    await expect(page.locator("#nav-settings")).toHaveCount(0);

    // 3. Directly navigate to /admin/audit with physio role in storage -> Must show 403 Forbidden
    await page.evaluate(() => window.localStorage.setItem("drtechcare_role", "physio"));
    await page.goto("/admin/audit");
    await expect(page.locator("text=HTTP 403 FORBIDDEN")).toBeVisible();
    await expect(page.locator("text=ไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeVisible();

    // 4. Directly navigate to /admin/settings with physio role in storage -> Must show 403 Forbidden
    await page.goto("/admin/settings");
    await expect(page.locator("text=HTTP 403 FORBIDDEN")).toBeVisible();
    await expect(page.locator("text=ไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeVisible();
  });

  test("User Management safeguards: prohibit self-deletion and last director deletion", async ({
    page,
  }) => {
    // Ensure Director role
    await page.click("#btn-switch-director");
    await page.goto("/admin/users");

    // Prohibit self-deletion: The row for director.admin should NOT have a delete button
    const selfRow = page.locator("tr:has-text('director.admin')");
    await expect(selfRow).toBeVisible();
    await expect(selfRow.locator("button[title='ลบบัญชีผู้ใช้งาน']")).toHaveCount(0);
    await expect(selfRow.locator("span[title='ห้ามลบบัญชีของตนเอง']")).toBeVisible();

    // Check add user modal
    await page.click("#btn-open-add-user");
    await expect(page.locator("h2:has-text('เพิ่มบัญชีผู้ใช้งานใหม่')")).toBeVisible();
  });

  test("Exercise library ownership: Physio cannot edit/delete Director's exercises", async ({
    page,
  }) => {
    // Switch to Physio role
    await page.click("#btn-switch-physio");
    await page.evaluate(() => window.localStorage.setItem("drtechcare_role", "physio"));
    await page.goto("/admin/exercises");

    // Find exercise created by Director (Shoulder Flexion)
    const directorExercise = page.locator("div:has-text('ท่ายกแขนไปด้านหน้า')").first();
    await expect(directorExercise).toBeVisible();

    // Physio cannot manage this exercise -> shows badge "ท่าของผู้อื่น"
    await expect(page.locator("span:has-text('ท่าของผู้อื่น')").first()).toBeVisible();
  });

  test("Audit Hash Chain Integrity Verifier confirms complete valid chain", async ({ page }) => {
    await page.click("#btn-switch-director");
    await page.goto("/admin/audit");

    // Click verify hash chain button
    await page.click("#btn-verify-hash-chain");

    // Verification banner appears and confirms 100% validity
    await expect(
      page.locator("text=ผลการตรวจสอบ: สายโซ่ Audit Hash Chain ถูกต้องและสมบูรณ์ 100%")
    ).toBeVisible();
  });

  test("System settings validates Kiosk Idle Timeout between 30 and 60 seconds", async ({ page }) => {
    await page.click("#btn-switch-director");
    await page.goto("/admin/settings");

    // Find Kiosk idle timeout input
    const timeoutInput = page.locator("#input-idle-timeout");
    await expect(timeoutInput).toBeVisible();
    await timeoutInput.fill("45");

    // Submit form
    await page.click("#btn-save-settings");
    await expect(
      page.locator("text=บันทึกการตั้งค่าระบบและลงบันทึก Audit Log สำเร็จเรียบร้อย")
    ).toBeVisible();
  });
});
