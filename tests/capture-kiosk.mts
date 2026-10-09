import { chromium } from "playwright";
import path from "node:path";

async function main() {
  console.log("🚀 Launching system Chrome for Kiosk verification (1080x1920)...");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    locale: "th-TH",
  });

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:3000...");
  await page.goto("http://127.0.0.1:3000", { timeout: 15000 });
  await page.waitForTimeout(2000);

  const title = await page.title();
  console.log("Page title:", title);

  const screenshotPath = path.resolve(process.cwd(), "kiosk-1080x1920.png");
  await page.screenshot({ path: screenshotPath });
  console.log(`✅ Saved 1080x1920 Kiosk screenshot to: ${screenshotPath}`);

  // Click on "ยังไม่มีบัญชี"
  const noAccountBtn = page.getByRole("button", { name: /ยังไม่มีบัญชี/ });
  if (await noAccountBtn.isVisible()) {
    console.log("- 'ยังไม่มีบัญชี' button is visible, clicking it...");
    await noAccountBtn.click();
    await page.waitForTimeout(1000);

    const stepScreenshotPath = path.resolve(process.cwd(), "kiosk-register-prompt.png");
    await page.screenshot({ path: stepScreenshotPath });
    console.log(`✅ Saved transition screenshot to: ${stepScreenshotPath}`);
  }

  // Click on "ไม่ใช่" to return to initial
  const noBtn = page.getByRole("button", { name: /ไม่ใช่/ });
  if (await noBtn.isVisible()) {
    await noBtn.click();
    await page.waitForTimeout(500);
  }

  // Click "ทดสอบแป้นพิมพ์ไทย"
  const keyboardBtn = page.getByRole("button", { name: /ทดสอบแป้นพิมพ์ไทย/ });
  if (await keyboardBtn.isVisible()) {
    console.log("- 'ทดสอบแป้นพิมพ์ไทย' is visible, clicking it...");
    await keyboardBtn.click();
    await page.waitForTimeout(1000);

    const keyboardScreenshotPath = path.resolve(process.cwd(), "kiosk-keyboard-modal.png");
    await page.screenshot({ path: keyboardScreenshotPath });
    console.log(`✅ Saved Thai Keyboard screenshot to: ${keyboardScreenshotPath}`);
  }

  await browser.close();
  console.log("🎉 All visual Kiosk screenshots captured successfully!");
}

main().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
