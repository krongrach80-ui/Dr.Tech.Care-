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
});
