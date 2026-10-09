import { test, expect } from "@playwright/test";

test.describe("MediaPipe Diagnostic & Same-Origin Network Verification", () => {
  test("เปิด /dev/mediapipe-check ด้วยกล้องจำลอง โหลดโมเดลสำเร็จ และไม่มี Request ไปโดเมนภายนอก 100%", async ({
    page,
    baseURL,
  }) => {
    const baseOrigin = baseURL ? new URL(baseURL).origin : "http://127.0.0.1:3000";
    const externalRequests: string[] = [];

    // ดักจับทุก Network Request ที่เกิดขึ้นตลอดการทดสอบ
    page.on("request", (request) => {
      const reqUrl = new URL(request.url());
      // ตรวจสอบว่าทุก request ต้องเป็น same-origin หรือ data/blob url เท่านั้น
      if (
        reqUrl.origin !== baseOrigin &&
        reqUrl.origin !== "http://localhost:3000" &&
        !reqUrl.protocol.startsWith("blob") &&
        !reqUrl.protocol.startsWith("data")
      ) {
        externalRequests.push(request.url());
      }
    });

    // 1. ไปยังหน้า /dev/mediapipe-check
    await page.goto("/dev/mediapipe-check");

    // 2. ตรวจสอบหัวข้อหน้าทดสอบ
    const title = page.locator("h1");
    await expect(title).toContainText("MediaPipe & Face Embedding Diagnostic");

    // 3. ตรวจสอบว่า Video element ปรากฏบนหน้าจอ
    const video = page.locator("video");
    await expect(video).toBeVisible();

    // 4. รอให้โมเดลโหลดเสร็จ (ข้อความ 'กำลังโหลดโมเดล' หายไป)
    await expect(
      page.getByText("กำลังโหลดโมเดล MediaPipe จาก Local WASM...")
    ).not.toBeVisible({ timeout: 25000 });

    // 5. ตรวจสอบสถานะ Hardware Delegate แสดงผล (GPU หรือ CPU)
    const delegateBadge = page.locator("text=/Delegate: (GPU|CPU)/");
    await expect(delegateBadge).toBeVisible({ timeout: 10000 });

    // 6. ตรวจสอบความถูกต้องว่าไม่มี Network Request ไปยังโดเมนภายนอกเด็ดขาด (ห้ามพึ่งพา CDN ตอนรัน)
    expect(
      externalRequests,
      `ตรวจพบ Request ไปยังโดเมนภายนอก: ${externalRequests.join(", ")}`
    ).toHaveLength(0);

    // 7. ตรวจสอบปุ่มทดสอบ Biometric Embedding
    const embeddingBtn = page.getByRole("button", {
      name: "ทดสอบ Biometric Embedding (128-d)",
    });
    await expect(embeddingBtn).toBeVisible();
  });

  test("ปิดสตรีมกล้องครบทุก Track หลัง Unmount เมื่อเปลี่ยนหน้า (Client Navigation)", async ({
    page,
  }) => {
    // 1. ไปยังหน้า /scan ซึ่งมี CameraMirror
    await page.goto("/scan");
    const video = page.locator("video");
    await expect(video).toBeVisible();

    // 2. รอให้กล้องเชื่อมต่อและสร้าง MediaStream
    await page.waitForFunction(() => {
      const vid = document.querySelector("video");
      return vid && vid.srcObject instanceof MediaStream && vid.srcObject.getTracks().length > 0;
    });

    // 3. บันทึก tracks ลงใน window.__kioskTracks เพื่อตรวจสอบสถานะหลัง unmount
    await page.evaluate(() => {
      const vid = document.querySelector("video") as HTMLVideoElement;
      const stream = vid.srcObject as MediaStream;
      (window as unknown as { __kioskTracks: MediaStreamTrack[] }).__kioskTracks = stream.getTracks();
    });

    // 4. ตรวจสอบว่าขณะกำลังสแกน Track มีสถานะเป็น 'live'
    const tracksBefore = await page.evaluate(() => {
      const tracks = (window as unknown as { __kioskTracks: MediaStreamTrack[] }).__kioskTracks;
      return tracks.map((t) => t.readyState);
    });
    expect(tracksBefore).toContain("live");

    // 5. กดปุ่ม 'กลับหน้าหลัก' เพื่อกระตุ้น Client Router Navigation (Unmount Kiosk/Camera Component)
    const backBtn = page.getByRole("button", { name: "กลับหน้าหลัก" });
    await backBtn.click();

    // 6. รอให้กลับสู่หน้าหลัก
    await expect(page).toHaveURL("/");

    // 7. ตรวจสอบว่า Track ทั้งหมดถูก stop() เรียบร้อยแล้ว (readyState === 'ended')
    const tracksAfter = await page.evaluate(() => {
      const tracks = (window as unknown as { __kioskTracks: MediaStreamTrack[] }).__kioskTracks;
      return tracks.map((t) => t.readyState);
    });

    expect(tracksAfter.length).toBeGreaterThan(0);
    expect(tracksAfter.every((state) => state === "ended")).toBe(true);
  });

  test("วัดค่า FPS, Hardware Delegate และทดสอบ Biometric Embedding (128-d)", async ({
    page,
  }) => {
    await page.goto("/dev/mediapipe-check");

    // รอให้โมเดลโหลดเสร็จ
    await expect(page.getByText("กำลังโหลดโมเดล MediaPipe จาก Local WASM...")).not.toBeVisible({
      timeout: 25000,
    });

    // วัด Hardware Delegate จริง
    const delegateLocator = page.locator("text=/Delegate: (GPU|CPU)/");
    await expect(delegateLocator).toBeVisible();
    const delegateText = await delegateLocator.innerText();
    console.log(`[E2E Telemetry] Hardware Delegate: ${delegateText}`);

    // รอให้ลูปเรนเดอร์คำนวณ FPS อย่างน้อย 2 วินาที
    await page.waitForTimeout(2000);
    const fpsBadge = page.locator(".font-mono", { hasText: /FPS:/ });
    await expect(fpsBadge).toBeVisible();
    const fpsText = await fpsBadge.innerText();
    console.log(`[E2E Telemetry] Frame Rate: ${fpsText}`);

    // คลิกปุ่ม 'ทดสอบ Biometric Embedding (128-d)'
    const embeddingBtn = page.getByRole("button", {
      name: "ทดสอบ Biometric Embedding (128-d)",
    });
    await embeddingBtn.click();

    // ตรวจสอบว่า pipeline ของ embedding ทำงานจริง (กรณีกล้องทดสอบ headless จะได้ No face detected หรือเวกเตอร์ 128 มิติ)
    const resultBox = page.locator("text=/สกัดเวกเตอร์ชีวมิติสำเร็จ|No face detected/");
    await expect(resultBox).toBeVisible({ timeout: 15000 });
  });
});
