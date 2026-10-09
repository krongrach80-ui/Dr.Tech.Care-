import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

  await page.goto("http://127.0.0.1:3000");
  await page.waitForTimeout(2000);
  await browser.close();
}

run().catch(console.error);
