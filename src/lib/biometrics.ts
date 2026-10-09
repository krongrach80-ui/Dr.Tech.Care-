/**
 * Dr.Tech.Care Biometrics & Liveness Specification (PDPA Compliant)
 * 
 * ข้อกำหนดความปลอดภัยข้อมูลชีวมิติ:
 * 1. ห้ามจัดเก็บหรือส่งภาพถ่าย/วิดีโอจริงเด็ดขาด
 * 2. จัดเก็บและส่งเฉพาะ 128-dimensional Float32 Vector Embedding + Quality Score + Head Pose (Yaw)
 * 3. มี Server Challenge (Nonce + ลำดับท่า) ป้องกัน Replay Attack
 * 4. รองรับการสุ่มลำดับซ้าย-ขวา (Randomized Liveness Sequence)
 */

export type LivenessPose = "center" | "left" | "right";

export type LivenessSequence = readonly [LivenessPose, LivenessPose, LivenessPose];

export interface ServerChallenge {
  nonce: string;
  sequence: LivenessSequence;
  issuedAt: number;
  expiresAt: number;
}

export interface FaceQualityMetrics {
  faceSizeRatio: number; // สัดส่วนขนาดใบหน้าเทียบกับเฟรม (เกณฑ์: 0.20 - 0.65)
  lightingScore: number; // คะแนนระดับแสงสว่าง (0-100, เกณฑ์ >= 40)
  sharpnessScore: number; // คะแนนความคมชัด ป้องกันภาพเบลอ (0-100, เกณฑ์ >= 65)
  yawAngle: number; // มุมหันซ้าย-ขวา (-45° ถึง +45°)
  pitchAngle: number; // มุมก้ม-เงย (-20° ถึง +20°)
  rollAngle: number; // มุมเอียงศีรษะ (-15° ถึง +15°)
  isAcceptable: boolean;
  facesDetected: number;
}

export interface BiometricVerificationPayload {
  challengeNonce: string;
  embedding: number[]; // 128-d Vector float32 เท่านั้น
  quality: FaceQualityMetrics;
  capturedYaw: number;
  poseSequence: LivenessSequence;
  verifiedAt: number;
}

export type CameraErrorCategory =
  | "none"
  | "not_found"
  | "permission_denied"
  | "busy"
  | "low_light"
  | "no_face"
  | "multiple_faces"
  | "insufficient_angle"
  | "too_fast"
  | "timeout"
  | "network_error"
  | "unknown";

export interface CameraErrorInfo {
  category: CameraErrorCategory;
  title: string;
  description: string;
  suggestion: string;
}

/**
 * สร้าง Server Challenge ป้องกัน Replay Attack พร้อมสุ่มลำดับท่าหันซ้าย-ขวา
 */
export function generateServerChallenge(): ServerChallenge {
  const isLeftFirst = Math.random() > 0.5;
  const sequence: LivenessSequence = isLeftFirst
    ? (["center", "left", "right"] as const)
    : (["center", "right", "left"] as const);

  const nonce =
    "NONCE-" +
    Math.random().toString(36).substring(2, 9).toUpperCase() +
    "-" +
    Date.now();

  const now = Date.now();
  return {
    nonce,
    sequence,
    issuedAt: now,
    expiresAt: now + 60_000, // มีอายุ 60 วินาที
  };
}

/**
 * พจนานุกรมข้อผิดพลาดภาษาไทยที่เป็นมิตรต่อผู้สูงอายุสำหรับทุกสถานการณ์ (10 กรณี)
 */
export const CAMERA_ERROR_CATALOG: Record<Exclude<CameraErrorCategory, "none">, CameraErrorInfo> = {
  not_found: {
    category: "not_found",
    title: "ไม่พบอุปกรณ์กล้องบนเครื่องนี้",
    description: "ระบบไม่พบกล้องเว็บแคมที่เชื่อมต่ออยู่ หรือกล้อง USB ถูกถอดออก",
    suggestion: "กรุณาตรวจสอบการเชื่อมต่อสายกล้อง หรือเลือกใช้โหมดจำลองภาพเพื่อทดสอบระบบ",
  },
  permission_denied: {
    category: "permission_denied",
    title: "กล้องถูกปฏิเสธการเข้าถึง",
    description: "เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้งานกล้องบนอุปกรณ์นี้",
    suggestion: "กรุณากดไอคอนรูปแม่กุญแจที่แถบ URL ด้านบน แล้วเลือก 'อนุญาต (Allow)' จากนั้นลองใหม่อีกครั้ง",
  },
  busy: {
    category: "busy",
    title: "กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น",
    description: "กล้องเว็บแคมถูกโปรแกรมอื่นในเครื่อง (เช่น Zoom, Meet, OBS หรือแท็บอื่น) ใช้งานอยู่",
    suggestion: "กรุณาปิดโปรแกรมอื่นที่กำลังใช้กล้องอยู่ แล้วกดปุ่มลองใหม่อีกครั้ง",
  },
  low_light: {
    category: "low_light",
    title: "แสงสว่างไม่เพียงพอสำหรับตรวจจับใบหน้า",
    description: "ระดับแสงรอบตัวน้อยเกินไป ทำให้ระบบไม่สามารถตรวจจับจุด Landmark บนใบหน้าได้อย่างแม่นยำ",
    suggestion: "กรุณาเปิดไฟส่องสว่างด้านหน้า หรือขยับเข้าใกล้ตู้ Kiosk เพื่อให้ใบหน้าสว่างขึ้น",
  },
  no_face: {
    category: "no_face",
    title: "ไม่พบใบหน้าในกรอบสแกน",
    description: "ระบบตรวจไม่พบใบหน้าของท่านในระยะที่เหมาะสม",
    suggestion: "กรุณานั่งหรือยืนตรง และจัดใบหน้าให้อยู่ภายในกรอบรูปไข่สีเขียว",
  },
  multiple_faces: {
    category: "multiple_faces",
    title: "ตรวจพบมากกว่า 1 ใบหน้าในกล้อง",
    description: "มีบุคคลอื่นอยู่ในเฟรมกล้องพร้อมกัน ซึ่งขัดต่อมาตรฐานความปลอดภัยข้อมูลชีวมิติทางการแพทย์",
    suggestion: "กรุณาให้ผู้รับบริการยืนอยู่หน้ากล้องเพียงลำพังคนเดียว",
  },
  insufficient_angle: {
    category: "insufficient_angle",
    title: "หันใบหน้ายังไม่ถึงมุมที่กำหนด",
    description: "ระบบตรวจจับมุมหันยังไม่ถึงเกณฑ์ที่กำหนด (ต้องการมุมเอียงอย่างน้อย 25°)",
    suggestion: "กรุณาหันศีรษะเพิ่มขึ้นอีกเล็กน้อยตามทิศทางลูกศรนำทาง",
  },
  too_fast: {
    category: "too_fast",
    title: "ขยับใบหน้าเร็วเกินไป ภาพเบลอ",
    description: "ความเร็วในการเคลื่อนไหวศีรษะเร็วเกินกว่าที่ระบบจะบันทึกค่าเวกเตอร์ได้อย่างคมชัด",
    suggestion: "กรุณาหยุดนิ่ง 1 วินาที แล้วค่อย ๆ หันศีรษะอย่างช้า ๆ",
  },
  timeout: {
    category: "timeout",
    title: "หมดเวลาในขั้นตอนนี้",
    description: "ระบบไม่สามารถยืนยันตำแหน่งใบหน้าของท่านได้ทันเวลาที่กำหนด (15 วินาที)",
    suggestion: "กรุณากดปุ่ม 'ลองใหม่อีกครั้ง' และปฏิบัติตามคำแนะนำของระบบทีละขั้นตอน",
  },
  network_error: {
    category: "network_error",
    title: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย",
    description: "สัญญาณอินเทอร์เน็ตขัดข้องระหว่างส่งรหัสเวกเตอร์ชีวมิติไปยืนยันกับเซิร์ฟเวอร์",
    suggestion: "กรุณาตรวจสอบการเชื่อมต่อสัญญาณเครือข่าย แล้วกดปุ่มลองใหม่อีกครั้ง",
  },
  unknown: {
    category: "unknown",
    title: "เกิดข้อผิดพลาดในการสแกนใบหน้า",
    description: "ระบบตรวจพบความผิดปกติของอุปกรณ์หรือกระบวนการประมวลผลชีวมิติ",
    suggestion: "กรุณากดปุ่มลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่คลินิกเพื่อขอความช่วยเหลือ",
  },
};

/**
 * คำนวณจำลองเวกเตอร์ชีวมิติ 128 มิติ (Float32 Vector Embedding) จาก Landmark
 * ห้ามบันทึกภาพถ่ายจริงเด็ดขาดตามมาตรฐาน PDPA
 */
export function extract128dEmbeddingFromPose(pose: LivenessPose, nonce: string): number[] {
  const seed = nonce.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const poseMultiplier = pose === "center" ? 1.0 : pose === "left" ? 1.25 : 1.5;
  const embedding = new Array<number>(128);

  for (let i = 0; i < 128; i++) {
    const val = Math.sin((seed + i * 7) * 0.05) * 0.45 * poseMultiplier;
    embedding[i] = Number(val.toFixed(4));
  }

  return embedding;
}

/**
 * ตรวจสอบความถูกต้องของมุม Yaw ตามท่าที่กำหนด
 */
export function checkPoseYawCompliance(
  pose: LivenessPose,
  yaw: number
): { isCompliant: boolean; message: string } {
  if (pose === "center") {
    const ok = Math.abs(yaw) <= 10;
    return {
      isCompliant: ok,
      message: ok ? "มองตรงถูกต้องแล้ว" : "กรุณามองตรงที่กล้อง ไม่เอียงศีรษะ",
    };
  }

  if (pose === "left") {
    // หันซ้าย: yaw ลบ (เช่น -25° ถึง -35°)
    const ok = yaw <= -20 && yaw >= -42;
    if (yaw > -20) {
      return { isCompliant: false, message: "กรุณาหันหน้าไปทางซ้ายเพิ่มอีกเล็กน้อย" };
    }
    return { isCompliant: ok, message: "หันซ้ายได้มุมถูกต้องแล้ว" };
  }

  // หันขวา: yaw บวก (เช่น +25° ถึง +35°)
  const ok = yaw >= 20 && yaw <= 42;
  if (yaw < 20) {
    return { isCompliant: false, message: "กรุณาหันหน้าไปทางขวาเพิ่มอีกเล็กน้อย" };
  }
  return { isCompliant: ok, message: "หันขวาได้มุมถูกต้องแล้ว" };
}

/**
 * แปลง DOMException หรือ JavaScript Error ให้เป็น CameraErrorInfo ภาษาไทยที่เป็นมิตร
 */
export function classifyCameraStreamError(rawErr: unknown): CameraErrorInfo {
  const errName = rawErr instanceof Error ? rawErr.name : "";
  const errMsg = rawErr instanceof Error ? rawErr.message : String(rawErr);

  if (
    errName === "NotFoundError" ||
    errName === "DevicesNotFoundError" ||
    errMsg.toLowerCase().includes("not found")
  ) {
    return CAMERA_ERROR_CATALOG.not_found;
  }

  if (
    errName === "NotAllowedError" ||
    errName === "PermissionDeniedError" ||
    errMsg.toLowerCase().includes("permission") ||
    errMsg.toLowerCase().includes("denied")
  ) {
    return CAMERA_ERROR_CATALOG.permission_denied;
  }

  if (
    errName === "NotReadableError" ||
    errName === "TrackStartError" ||
    errMsg.toLowerCase().includes("busy") ||
    errMsg.toLowerCase().includes("in use")
  ) {
    return CAMERA_ERROR_CATALOG.busy;
  }

  if (errMsg.toLowerCase().includes("timeout")) {
    return CAMERA_ERROR_CATALOG.timeout;
  }

  if (errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("offline")) {
    return CAMERA_ERROR_CATALOG.network_error;
  }

  return CAMERA_ERROR_CATALOG.unknown;
}

/**
 * คำแนะนำหน้าจอตัวใหญ่ตามท่าหันปัจจุบัน
 */
export function getStepInstruction(pose: LivenessPose): string {
  switch (pose) {
    case "center":
      return "กรุณามองตรงที่กล้อง";
    case "left":
      return "หันหน้าไปทางซ้ายช้า ๆ";
    case "right":
      return "หันหน้าไปทางขวาช้า ๆ";
  }
}

/**
 * ข้อความเสียงอ่านภาษาไทย (Web Speech API) สำหรับผู้สูงอายุ
 */
export function getStepVoicePrompt(stepNumber: number, pose: LivenessPose): string {
  const stepPrefix =
    stepNumber === 1
      ? "ขั้นตอนที่หนึ่ง"
      : stepNumber === 2
      ? "ขั้นตอนที่สอง"
      : "ขั้นตอนที่สาม";

  switch (pose) {
    case "center":
      return `${stepPrefix} กรุณานั่งตรงและมองตรงที่กล้องครับ`;
    case "left":
      return `${stepPrefix} กรุณาหันหน้าไปทางซ้ายช้า ๆ ครับ`;
    case "right":
      return `${stepPrefix} กรุณาหันหน้าไปทางขวาช้า ๆ ครับ`;
  }
}

/**
 * ตรวจสอบความถูกต้องของ Biometric Payload กับ Server Challenge ป้องกัน Replay Attack
 */
export function verifyBiometricSubmission(
  payload: BiometricVerificationPayload,
  challenge: ServerChallenge,
  isOnline = true
): { success: boolean; errorCategory?: CameraErrorCategory; message: string } {
  // 1. ตรวจสอบสถานะการเชื่อมต่อเครือข่าย
  if (!isOnline) {
    return {
      success: false,
      errorCategory: "network_error",
      message: "ไม่สามารถส่งข้อมูลชีวมิติได้เนื่องจากอุปกรณ์ออฟไลน์",
    };
  }

  // 2. ตรวจสอบ Nonce ป้องกัน Replay Attack
  if (payload.challengeNonce !== challenge.nonce) {
    return {
      success: false,
      errorCategory: "unknown",
      message: "รหัสคำท้า (Challenge Nonce) ไม่ถูกต้องหรือถูกปลอมแปลง",
    };
  }

  // 3. ตรวจสอบอายุของ Challenge (หมดอายุใน 60 วินาที)
  if (Date.now() > challenge.expiresAt) {
    return {
      success: false,
      errorCategory: "timeout",
      message: "รหัสคำท้าหมดอายุ กรุณาเริ่มสแกนใหม่อีกครั้ง",
    };
  }

  // 4. ตรวจสอบขนาดเวกเตอร์ Embedding (ต้องเป็น 128 มิติเป๊ะ)
  if (!Array.isArray(payload.embedding) || payload.embedding.length !== 128) {
    return {
      success: false,
      errorCategory: "unknown",
      message: "ขนาดเวกเตอร์ชีวมิติไม่ถูกต้อง (ต้องเป็น 128-d Vector)",
    };
  }

  // 5. ตรวจสอบคุณภาพใบหน้า
  if (payload.quality.lightingScore < 35) {
    return {
      success: false,
      errorCategory: "low_light",
      message: "ระดับแสงสว่างไม่เพียงพอ",
    };
  }

  if (payload.quality.facesDetected > 1) {
    return {
      success: false,
      errorCategory: "multiple_faces",
      message: "ตรวจพบมากกว่า 1 ใบหน้าในเฟรมกล้อง",
    };
  }

  if (payload.quality.facesDetected === 0) {
    return {
      success: false,
      errorCategory: "no_face",
      message: "ตรวจไม่พบใบหน้าในกรอบสแกน",
    };
  }

  return {
    success: true,
    message: "ยืนยันความถูกต้องของข้อมูลชีวมิติสำเร็จ",
  };
}

/**
 * ผลลัพธ์การตัดสินอัตลักษณ์ชีวมิติใบหน้า
 * กฎเหล็กความปลอดภัย: ห้ามส่งค่า distance หรือ embedding กลับไปยัง client เด็ดขาด
 */
export type IdentityDecisionOutcome = "match" | "ambiguous" | "no_match" | "inconsistent";

export interface IdentityCandidate {
  profileId: string;
  distance: number;
  fullName?: string;
  hn?: string;
}

export interface IdentityDecisionResult {
  outcome: IdentityDecisionOutcome;
  profileId: string | null;
  candidateProfileIds?: string[];
  message: string;
}

export interface DecideIdentityOptions {
  matchThreshold?: number; // เกณฑ์ระยะห่างสูงสุดที่ถือว่าตรงกัน (ค่าปกติ: 0.40)
  ambiguousDelta?: number; // ผลต่างขั้นต่ำระหว่างอันดับ 1 และอันดับ 2 (ค่าปกติ: 0.05)
}

/**
 * ระบบตัดสินอัตลักษณ์ชีวมิติใบหน้า (Biometric Decision Engine)
 * ประเมิน candidate จากการค้นหา Vector Database
 * 
 * 1. match: อันดับ 1 ผ่านเกณฑ์ และห่างจากอันดับ 2 เกิน ambiguousDelta
 * 2. ambiguous: อันดับ 1 ผ่านเกณฑ์ แต่ห่างจากอันดับ 2 น้อยกว่า ambiguousDelta (ใบหน้าคล้ายกันเกินไป)
 * 3. no_match: ไม่มี candidate ใดผ่านเกณฑ์ระยะห่าง
 * 4. inconsistent: ข้อมูล distance ผิดปกติ (NaN, ติดลบ, หรือ candidate เสียรูป)
 * 
 * ข้อกำหนด: ห้ามเปิดเผยค่า distance หรือ cosine similarity กลับ client เพื่อป้องกัน Biometric Inversion Attack
 */
export function decideIdentity(
  candidates: readonly IdentityCandidate[],
  options: DecideIdentityOptions = {}
): IdentityDecisionResult {
  const matchThreshold = options.matchThreshold ?? 0.40;
  const ambiguousDelta = options.ambiguousDelta ?? 0.05;

  // 1. ตรวจสอบความถูกต้องของข้อมูล (Inconsistent check)
  for (const c of candidates) {
    if (
      !c.profileId ||
      typeof c.distance !== "number" ||
      Number.isNaN(c.distance) ||
      c.distance < 0 ||
      !Number.isFinite(c.distance)
    ) {
      return {
        outcome: "inconsistent",
        profileId: null,
        message: "ข้อมูลชีวมิติของผู้รับการตรวจสอบมีความผิดปกติ ไม่สอดคล้องกัน",
      };
    }
  }

  // 2. กรณีไม่มีผู้สมัครใดเลย
  if (candidates.length === 0) {
    return {
      outcome: "no_match",
      profileId: null,
      message: "ไม่พบบัญชีผู้ป่วยที่ตรงกับข้อมูลใบหน้านี้ในระบบ",
    };
  }

  // เรียงลำดับจากระยะห่างน้อยที่สุด (ใกล้เคียงที่สุด) ไปมากที่สุด
  const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
  const best = sorted[0];

  if (!best) {
    return {
      outcome: "no_match",
      profileId: null,
      message: "ไม่พบบัญชีผู้ป่วยที่ตรงกับข้อมูลใบหน้านี้ในระบบ",
    };
  }

  // 3. ตรวจสอบว่าอันดับ 1 ผ่านเกณฑ์หรือไม่
  if (best.distance > matchThreshold) {
    return {
      outcome: "no_match",
      profileId: null,
      message: "ไม่พบบัญชีผู้ป่วยที่ตรงกับข้อมูลใบหน้านี้ในระบบ",
    };
  }

  // 4. ตรวจสอบกรณีกำกวม (Ambiguous: มี 2 คนขึ้นไปที่คะแนนใกล้เคียงกันมาก)
  if (sorted.length > 1) {
    const secondBest = sorted[1];
    if (secondBest && secondBest.distance <= matchThreshold) {
      const delta = secondBest.distance - best.distance;
      if (delta < ambiguousDelta) {
        return {
          outcome: "ambiguous",
          profileId: null,
          candidateProfileIds: [best.profileId, secondBest.profileId],
          message: "ตรวจพบข้อมูลใบหน้าที่ใกล้เคียงกันมากกว่า 1 บัญชี กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันตัวตน",
        };
      }
    }
  }

  // 5. ผ่านการตรวจสอบเด็ดขาด (Single Clear Match)
  return {
    outcome: "match",
    profileId: best.profileId,
    message: "ยืนยันอัตลักษณ์บุคคลสำเร็จ",
  };
}


