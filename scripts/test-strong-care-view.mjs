import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "th-TH",
  });

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:3000 ...");
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Home screen screenshot
  await page.screenshot({ path: "strong-care-01-home.png" });
  console.log("Captured: strong-care-01-home.png");

  // 2. Click "สแกนใบหน้าเพื่อเข้าสู่ระบบ"
  const loginBtn = page.getByRole("button", { name: /สแกนใบหน้าเพื่อเข้าสู่ระบบ/ });
  await loginBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "strong-care-02-login-scan.png" });
  console.log("Captured: strong-care-02-login-scan.png");

  // 3. Click "กลับหน้าแรก"
  const backHomeBtn = page.getByRole("button", { name: /กลับหน้าแรก/ });
  await backHomeBtn.click();
  await page.waitForTimeout(1000);

  // 4. Click "สมัครบัญชีใหม่"
  const regBtn = page.getByRole("button", { name: /สมัครบัญชีใหม่/ });
  await regBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "strong-care-03-register-consent.png" });
  console.log("Captured: strong-care-03-register-consent.png");

  // 5. Back to home and click "สำหรับบุคลากร"
  const backBtn2 = page.getByRole("button", { name: "กลับหน้าแรก", exact: true });
  await backBtn2.click();
  await page.waitForTimeout(800);

  const staffBtn = page.getByRole("button", { name: /สำหรับบุคลากร/ });
  await staffBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "strong-care-04-staff-login.png" });
  console.log("Captured: strong-care-04-staff-login.png");

  await browser.close();
  console.log("All Strong Care UI tests completed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
