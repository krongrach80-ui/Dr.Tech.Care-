import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:3000 ...");
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "flow-01-idle.png" });
  console.log("Saved flow-01-idle.png");

  // Click patient sits -> check account
  await page.click("text=ผู้ป่วยมานั่งหน้าตู้ (เริ่มใช้งาน)");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-02-check-account.png" });
  console.log("Saved flow-02-check-account.png");

  // Click has account -> face scan
  await page.click("text=มีบัญชีแล้ว");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-03-login-scan.png" });
  console.log("Saved flow-03-login-scan.png");

  // Confirm identity
  await page.click("text=จำลอง: สแกนใบหน้าพบข้อมูล");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-04-login-confirm.png" });
  console.log("Saved flow-04-login-confirm.png");

  // Login success -> check tasks
  await page.click("text=ยืนยันการใช้งาน");
  await page.waitForTimeout(500);
  await page.click("text=ตรวจสอบภารกิจประจำวันทันที");
  await page.waitForTimeout(500);
  await page.click("text=กรณีมีภารกิจ (เข้าสู่ Daily Checklist)");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-05-checklist-intro.png" });
  console.log("Saved flow-05-checklist-intro.png");

  // Start Mission 1
  await page.click("text=เริ่มภารกิจที่ 1 ทันที");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-06-mission-exercise.png" });
  console.log("Saved flow-06-mission-exercise.png");

  // Complete exercise reps
  await page.click("text=ทำครบ 5 ครั้งทันที");
  await page.waitForTimeout(500);
  await page.click("text=ภารกิจที่ 1 สำเร็จ!");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-07-checklist-mid.png" });
  console.log("Saved flow-07-checklist-mid.png");

  // Start Mission 2
  await page.click("text=เริ่มภารกิจที่ 2 ทันที");
  await page.waitForTimeout(500);
  await page.click("text=2. กล้วย");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-08-mission-quiz.png" });
  console.log("Saved flow-08-mission-quiz.png");

  // Finish quiz -> checklist all done
  await page.click("text=เล่นเกมเสร็จสิ้น");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-09-checklist-done.png" });
  console.log("Saved flow-09-checklist-done.png");

  // View completion screen
  await page.click("text=ดูหน้าสรุปผลและความสำเร็จ");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "flow-10-completion.png" });
  console.log("Saved flow-10-completion.png");

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
