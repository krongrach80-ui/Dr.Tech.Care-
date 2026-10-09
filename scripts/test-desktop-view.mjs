import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // Exactly like user's desktop browser (1920x1080 window)
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "desktop-view-idle.png" });

  // Click on the big logo to verify anywhere click works
  await page.click("text=Dr.Tech.Care");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "desktop-view-check-account.png" });

  console.log("Screenshots captured successfully!");
  await browser.close();
}

run().catch(console.error);
