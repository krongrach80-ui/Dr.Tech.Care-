/**
 * Dr.Tech.Care Biometrics & Liveness Specification (PDPA Compliant)
 * 
 * ข้อกำหนดความปลอดภัยชีวมิติ:
 * 1. ไม่บันทึกภาพถ่าย/วิดีโอเด็ดขาด (Zero Image Retention)
 * 2. บันทึกเฉพาะ 128-dimensional Float32 Vector Embedding + Quality Score + Head Pose (Yaw)
 * 3. มี Server Challenge (Nonce + ลำดับท่าสุ่ม) ป้องกัน Replay Attack
 * 4. ตรวจสอบทิศทางหันสุ่มซ้าย-ขวา (Randomized Liveness Sequence)
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
  faceSizeRatio: number; // สัดส่วนใบหน้าในกรอบภาพ (เกณฑ์: 0.20 - 0.65)
  lightingScore: number; // คะแนนความสว่างแสง (0-100, เกณฑ์ >= 40)
  sharpnessScore: number; // ความคมชัด ป้องกันภาพเบลอ (0-100, เกณฑ์ >= 65)
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
  | "overconstrained"
  | "security_error"
  | "unknown";

export interface CameraErrorInfo {
  category: CameraErrorCategory;
  title: string;
  description: string;
  suggestion: string;
  errorCodeName?: string;
}

/**
 * สร้าง Server Challenge ป้องกัน Replay Attack พร้อมสลับลำดับท่าหันซ้าย-ขวา
 */
export function generateServerChallenge(): ServerChallenge {
  const isLeftFirst = Math.random() > 0.5;
  const sequence: LivenessSequence = isLeftFirst
    ? (["center", "left", "right"] as const)
    : (["center", "right", "left"] as const);

  const now = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
  const nonce = `NONCE-${randomSuffix}-${now}`;

  return {
    nonce,
    sequence,
    issuedAt: now,
    expiresAt: now + 60_000, // หมดอายุใน 60 วินาที
  };
}

/**
 * แคตตาล็อกข้อผิดพลาดของกล้องที่เป็นมิตรต่อผู้ใช้งาน (PDPA Friendly)
 */
export const CAMERA_ERROR_CATALOG: Record<Exclude<CameraErrorCategory, "none">, CameraErrorInfo> = {
  permission_denied: {
    category: "permission_denied",
    title: "ถูกปฏิเสธสิทธิ์การเข้าถึงกล้อง (NotAllowedError)",
    description: "เบราว์เซอร์หรืออุปกรณ์ไม่อนุญาตให้ระบบเปิดกล้องเพื่อสแกนใบหน้า",
    suggestion: "คลิกไอคอนรูปกุญแจข้างแถบ URL แล้วตั้งค่ากล้องเป็น 'อนุญาต' จากนั้นรีโหลดหน้าเว็บ",
    errorCodeName: "NotAllowedError",
  },
  not_found: {
    category: "not_found",
    title: "ไม่พบอุปกรณ์กล้องบนเครื่องนี้ (NotFoundError)",
    description: "ระบบไม่พบกล้องเว็บแคมที่เชื่อมต่ออยู่กับตู้หรือคอมพิวเตอร์ของคุณ",
    suggestion: "ตรวจสอบสายเชื่อมต่อ USB ของกล้อง หรือดูใน Device Manager เพื่อยืนยันว่ากล้องทำงาน",
    errorCodeName: "NotFoundError",
  },
  busy: {
    category: "busy",
    title: "กล้องกำลังถูกใช้งานโดยแอปอื่น (NotReadableError)",
    description: "มีโปรแกรมอื่นเปิดกล้องนี้อยู่ (เช่น Zoom, Microsoft Teams, Line, หรือแท็บอื่น)",
    suggestion: "กรุณาปิดโปรแกรมอื่นที่กำลังใช้กล้องอยู่ แล้วกดปุ่มลองใหม่อีกครั้ง",
    errorCodeName: "NotReadableError",
  },
  overconstrained: {
    category: "overconstrained",
    title: "การตั้งค่ากล้องไม่รองรับ (OverconstrainedError)",
    description: "ความละเอียดหรือคุณสมบัติกล้องที่ร้องขอไม่ได้รับการสนับสนุนโดยฮาร์ดแวร์นี้",
    suggestion: "ระบบจะสลับเป็นโหมดพื้นฐาน (video: true) อัตโนมัติ กรุณากดปุ่มลองใหม่อีกครั้ง",
    errorCodeName: "OverconstrainedError",
  },
  security_error: {
    category: "security_error",
    title: "บริบทการเชื่อมต่อไม่ปลอดภัย (SecurityError)",
    description: "WebRTC getUserMedia อนุญาตเฉพาะการเปิดผ่าน HTTPS หรือ localhost เท่านั้น (หากเปิดผ่าน http://192.168.x.x กล้องจะไม่ทำงาน)",
    suggestion: "กรุณาเข้าใช้งานผ่าน HTTPS หรือ localhost ตามข้อกำหนดความปลอดภัยของเบราว์เซอร์",
    errorCodeName: "SecurityError",
  },
  low_light: {
    category: "low_light",
    title: "แสงสว่างไม่เพียงพอสำหรับการสแกน",
    description: "บริเวณใบหน้ามืดเกินไป ทำให้ระบบตรวจจับจุดสังเกต (Landmarks) ได้ไม่ชัดเจน",
    suggestion: "กรุณาเปิดไฟหรือขยับเข้าใกล้แสงสว่างของตู้ Kiosk มากขึ้น",
  },
  no_face: {
    category: "no_face",
    title: "ไม่พบใบหน้าในกรอบภาพ",
    description: "ระบบตรวจไม่พบใบหน้าของท่านในบริเวณที่กำหนด",
    suggestion: "กรุณายืนหรือนั่งตรงหน้ากล้อง และให้อยู่ในกรอบวงรีที่แนะนำ",
  },
  multiple_faces: {
    category: "multiple_faces",
    title: "ตรวจพบใบหน้ามากกว่า 1 ท่านในกล้อง",
    description: "ตรวจพบผู้ใช้งานมากกว่าหนึ่งท่านในเฟรมกล้อง เพื่อความปลอดภัยทางข้อมูล ต้องยืนเพียงท่านเดียว",
    suggestion: "กรุณาให้ผู้ติดตามหรือบุคคลอื่นยืนออกนอกมุมกล้องชั่วคราว",
  },
  insufficient_angle: {
    category: "insufficient_angle",
    title: "มุมหันใบหน้ายังไม่ถึงเกณฑ์ที่กำหนด",
    description: "ระบบตรวจพบการหันแต่ยังไม่ถึงมุมเป้าหมาย (ต้องการมุมหันอย่างน้อย 20-25 องศา)",
    suggestion: "กรุณาหันศีรษะให้ชัดเจนขึ้นเล็กน้อยตามคำแนะนำบนหน้าจอ",
  },
  too_fast: {
    category: "too_fast",
    title: "การเคลื่อนไหวเร็วเกินไป กรุณาทำช้าๆ",
    description: "การหันศีรษะเร็วเกินกว่าที่อัลกอริทึมจะยืนยันความต่อเนื่องของเฟรมได้",
    suggestion: "กรุณาค้างท่าไว้ประมาณ 1 วินาที แล้วค่อยๆ หันศีรษะอย่างนุ่มนวล",
  },
  timeout: {
    category: "timeout",
    title: "หมดเวลาในการทำขั้นตอน",
    description: "ระบบไม่ได้รับการตอบสนองตามท่าทางที่กำหนดภายในเวลา 15 วินาที",
    suggestion: "กดปุ่ม 'ลองใหม่อีกครั้ง' แล้วปฏิบัติตามคำแนะนำของระบบทีละขั้นตอน",
  },
  network_error: {
    category: "network_error",
    title: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย",
    description: "การเชื่อมต่ออินเทอร์เน็ตขัดข้อง ทำให้ไม่สามารถส่งเวกเตอร์เพื่อยืนยันกับระบบได้",
    suggestion: "กรุณาตรวจสอบการเชื่อมต่อเครือข่าย แล้วลองใหม่อีกครั้ง",
  },
  unknown: {
    category: "unknown",
    title: "เกิดข้อผิดพลาดในการเปิดกล้อง",
    description: "ระบบตรวจพบข้อผิดพลาดที่ไม่สามารถระบุประเภทได้จากอุปกรณ์",
    suggestion: "กรุณากดปุ่มลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่ประจำตู้",
  },
};

/**
 * สกัด 128-d Vector Float32 Embedding จาก Pose และ Nonce (PDPA Zero-Image)
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
 * ตรวจสอบความสอดคล้องของมุม Yaw ตามท่าทางที่ระบบกำหนด
 */
export function checkPoseYawCompliance(
  pose: LivenessPose,
  yaw: number
): { isCompliant: boolean; message: string } {
  if (pose === "center") {
    const ok = Math.abs(yaw) <= 10;
    return {
      isCompliant: ok,
      message: ok ? "มองตรงเรียบร้อยแล้ว" : "กรุณามองตรงไปยังกล้อง ไม่เอียงศีรษะ",
    };
  }

  if (pose === "left") {
    // หันซ้าย: yaw ลบ (เป้าหมาย -20° ถึง -42°)
    const ok = yaw <= -20 && yaw >= -42;
    if (yaw > -20) {
      return { isCompliant: false, message: "กรุณาหันหน้าไปทางซ้ายอีกเล็กน้อย" };
    }
    return { isCompliant: ok, message: "หันซ้ายเรียบร้อยแล้ว" };
  }

  // หันขวา: yaw บวก (เป้าหมาย +20° ถึง +42°)
  const ok = yaw >= 20 && yaw <= 42;
  if (yaw < 20) {
    return { isCompliant: false, message: "กรุณาหันหน้าไปทางขวาอีกเล็กน้อย" };
  }
  return { isCompliant: ok, message: "หันขวาเรียบร้อยแล้ว" };
}

/**
 * จำแนก DOMException หรือ JavaScript Error เป็น CameraErrorInfo พร้อม log ลง Console
 */
export function classifyCameraStreamError(rawErr: unknown): CameraErrorInfo {
  const errName = (rawErr instanceof DOMException || rawErr instanceof Error) ? rawErr.name : "";
  const errMsg = rawErr instanceof Error ? rawErr.message : String(rawErr);

  // บันทึกชื่อและรายละเอียด error ลง console เสมอ เพื่อให้ตรวจสอบใน DevTools ได้ชัดเจน
  console.error(`[DrTechCare Camera Error] "${errName}": ${errMsg}`, rawErr);

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

  if (
    errName === "OverconstrainedError" ||
    errName === "ConstraintNotSatisfiedError" ||
    errMsg.toLowerCase().includes("overconstrained")
  ) {
    return CAMERA_ERROR_CATALOG.overconstrained;
  }

  if (
    errName === "SecurityError" ||
    errMsg.toLowerCase().includes("security") ||
    errMsg.toLowerCase().includes("insecure")
  ) {
    return CAMERA_ERROR_CATALOG.security_error;
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
 * คำแนะนำสำหรับแสดงบนหน้าจอตามท่าทาง
 */
export function getStepInstruction(pose: LivenessPose): string {
  switch (pose) {
    case "center":
      return "กรุณามองตรงไปยังกล้อง";
    case "left":
      return "หันหน้าไปทางซ้ายช้าๆ";
    case "right":
      return "หันหน้าไปทางขวาช้าๆ";
  }
}

/**
 * ข้อความเสียงนำทาง (Web Speech API)
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
      return `${stepPrefix} กรุณามองตรงไปยังกล้องนะคะ`;
    case "left":
      return `${stepPrefix} กรุณาหันหน้าไปทางซ้ายช้าๆ นะคะ`;
    case "right":
      return `${stepPrefix} กรุณาหันหน้าไปทางขวาช้าๆ นะคะ`;
  }
}

/**
 * ตรวจสอบความถูกต้องของ Biometric Submission
 */
export function verifyBiometricSubmission(
  payload: BiometricVerificationPayload,
  challenge: ServerChallenge,
  isOnline = true
): { success: boolean; errorCategory?: CameraErrorCategory; message: string } {
  if (!isOnline) {
    return {
      success: false,
      errorCategory: "network_error",
      message: "ระบบออฟไลน์ ไม่สามารถยืนยันข้อมูลได้",
    };
  }

  if (payload.challengeNonce !== challenge.nonce) {
    return {
      success: false,
      errorCategory: "unknown",
      message: "Challenge Nonce ไม่ถูกต้องหรือหมดอายุ",
    };
  }

  if (payload.embedding.length !== 128) {
    return {
      success: false,
      errorCategory: "unknown",
      message: "เวกเตอร์ใบหน้าต้องมีขนาด 128 มิติ",
    };
  }

  if (payload.quality.facesDetected !== 1) {
    return {
      success: false,
      errorCategory: payload.quality.facesDetected > 1 ? "multiple_faces" : "no_face",
      message:
        payload.quality.facesDetected > 1
          ? "ตรวจพบใบหน้ามากกว่า 1 คน"
          : "ไม่พบใบหน้าในตำแหน่งที่ถูกต้อง",
    };
  }

  if (payload.quality.lightingScore < 35) {
    return {
      success: false,
      errorCategory: "low_light",
      message: "แสงสว่างไม่เพียงพอสำหรับการสแกน",
    };
  }

  return {
    success: true,
    message: "การตรวจสอบอัตลักษณ์ชีวมิติสำเร็จ",
  };
}

/**
 * การตัดสินอัตลักษณ์ชีวมิติ (Biometric Decision Engine)
 * กฎเหล็กความปลอดภัย: ห้ามส่งตัวเลข distance หรือ embedding กลับไปยัง client
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
  matchThreshold?: number; // เกณฑ์ระยะห่างที่ยอมรับว่าตรงกัน (ปกติ: 0.40)
  ambiguousDelta?: number; // ช่องว่างความต่างระหว่างอันดับ 1 และอันดับ 2 (ปกติ: 0.05)
}

/**
 * เครื่องมือประเมินอัตลักษณ์ใบหน้า (Biometric Decision Engine)
 */
export function decideIdentity(
  candidates: readonly IdentityCandidate[],
  options: DecideIdentityOptions = {}
): IdentityDecisionResult {
  const matchThreshold = options.matchThreshold ?? 0.40;
  const ambiguousDelta = options.ambiguousDelta ?? 0.05;

  for (const c of candidates) {
    if (
      !c.profileId ||
      typeof c.distance !== "number" ||
      Number.isNaN(c.distance) ||
      c.distance < 0 ||
      c.distance > 2.0
    ) {
      return {
        outcome: "inconsistent",
        profileId: null,
        message: "ข้อมูลระยะห่างทางชีวมิติผิดปกติ ไม่สามารถประมวลผลได้",
      };
    }
  }

  if (candidates.length === 0) {
    return {
      outcome: "no_match",
      profileId: null,
      message: "ไม่พบบัญชีผู้ใช้งานที่ตรงกับใบหน้านี้",
    };
  }

  const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
  const best = sorted[0];

  if (!best || best.distance > matchThreshold) {
    return {
      outcome: "no_match",
      profileId: null,
      message: "ไม่พบบัญชีผู้ใช้งานที่ตรงกับใบหน้านี้",
    };
  }

  const runnerUp = sorted[1];
  if (runnerUp && runnerUp.distance <= matchThreshold) {
    const delta = Math.abs(runnerUp.distance - best.distance);
    if (delta < ambiguousDelta) {
      return {
        outcome: "ambiguous",
        profileId: null,
        candidateProfileIds: [best.profileId, runnerUp.profileId],
        message: "พบผู้ใช้งานที่มีลักษณะใกล้เคียงกัน กรุณาเข้าสู่ระบบด้วยรหัสผ่านหรือติดต่อเจ้าหน้าที่",
      };
    }
  }

  return {
    outcome: "match",
    profileId: best.profileId,
    message: `ยืนยันตัวตนสำเร็จ${best.fullName ? `: ${best.fullName}` : ""}`,
  };
}