import { chromium } from "playwright";

async function testAllClicks() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("1. Visiting home page...");
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "test-01-home.png" });

  console.log("2. Clicking center idle screen...");
  // Click anywhere on main
  await page.click("main");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-02-after-main-click.png" });

  console.log("3. Clicking reset to go back to idle...");
  await page.click("text=กลับสู่หน้าพักเครื่อง");
  await page.waitForTimeout(600);

  console.log("4. Clicking staff button (สำหรับบุคลากร)...");
  await page.click("text=สำหรับบุคลากร");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-03-staff-login.png" });

  console.log("5. Submitting staff login as director...");
  await page.click("text=เข้าสู่ระบบ ผู้อำนวยการ");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-04-staff-overview.png" });

  console.log("6. Clicking return to Kiosk...");
  await page.click("text=กลับสู่หน้า Kiosk");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-05-back-to-kiosk.png" });

  console.log("✅ All interactions verified successfully!");
  await browser.close();
}

testAllClicks().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
