/**
 * Dr.Tech.Care Kiosk Core Management
 * สเปกข้อ 9: กฎรวมทุกการออกจากระบบ (กดเอง/idle/จบงาน/ถูกเตะ)
 * ต้องเรียก resetKioskState() ตัวเดียวที่ปิดกล้อง, หยุดโมเดล/worker, ล้าง store+sessionStorage+draft, หยุดเสียง และกลับหน้าแรก
 */

import { dispose as disposeMediaPipe } from "@/lib/mediapipe/loader";

export interface ResetKioskOptions {
  redirectToHome?: boolean;
}

// Global registry สำหรับ MediaStream เพื่อให้ปิดกล้องได้หมดจด 100%
let activeMediaStream: MediaStream | null = null;

export function registerActiveKioskMediaStream(stream: MediaStream | null): void {
  activeMediaStream = stream;
}

export function resetKioskState(options: ResetKioskOptions = { redirectToHome: true }): void {
  if (typeof window === "undefined") {
    return;
  }

  // 1. ปิดแทร็กกล้องและไมโครโฟนทั้งหมด
  try {
    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      activeMediaStream = null;
    }
  } catch (err) {
    console.warn("Failed to stop media tracks:", err);
  }

  // 2. หยุดเสียง Text-to-Speech (TTS) ทันที
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (err) {
    console.warn("Failed to cancel speech synthesis:", err);
  }

  // 3. ปิดและทำลายหน่วยความจำ MediaPipe, FaceLandmarker, PoseLandmarker, และ WASM WebGL ทันที
  try {
    disposeMediaPipe();
  } catch (err) {
    console.warn("Failed to dispose MediaPipe instances:", err);
  }

  // 4. ล้างสถานะใน sessionStorage และ Local State ชั่วคราว
  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn("Failed to clear sessionStorage:", err);
  }

  // 4. ล้าง draft enrollment / candidate token ในหน่วยความจำ
  try {
    sessionStorage.removeItem("dtc_face_draft_id");
    sessionStorage.removeItem("dtc_candidate_token");
  } catch {
    // no-op
  }

  // 5. นำทางกลับหน้าแรก (/) โดยล้างประวัติการนำทาง (Kiosk hardening)
  if (options.redirectToHome !== false) {
    window.location.replace("/");
  }
}
