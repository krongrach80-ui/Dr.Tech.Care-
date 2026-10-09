/**
 * src/lib/schemas/face.ts
 * Dr.Tech.Care — Face API Request & Response Zod Schemas (Section 7.4)
 * ทั้งขาเข้า (Input) และ ขาออก (Output) ต้องผ่าน Zod Validation 100%
 */

import { z } from "zod";

export const facePoseSchema = z.enum(["center", "left", "right"]);

export const vector128Schema = z
  .array(z.number())
  .length(128, "เวกเตอร์ชีวมิติต้องมีความยาว 128 มิติ");

// 1. POST /api/face/challenge
export const faceChallengeRequestSchema = z.object({
  purpose: z.enum(["register", "login", "bind"]),
  kioskId: z.string().optional(),
});

export const faceChallengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string(),
  poseOrder: z.array(facePoseSchema).length(3),
  issuedAt: z.string(),
  expiresAt: z.string(),
});

// 2. POST /api/face/register/scan (Flow A: ตรวจจับใบหน้าซ้ำก่อนสร้าง Draft)
export const faceRegisterScanRequestSchema = z.object({
  challengeNonce: z.string().min(1, "ต้องระบุ Challenge Nonce"),
  embeddings: z.object({
    center: vector128Schema,
    left: vector128Schema,
    right: vector128Schema,
  }),
  consent: z.object({
    version: z.string().min(1),
    sha256: z.string().length(64, "รหัส SHA-256 ต้องมีความยาว 64 ตัวอักษร"),
    accepted: z.literal(true, {
      message: "ต้องยอมรับนโยบายความยินยอม PDPA",
    }),
  }),
  kioskId: z.string().optional(),
});

export const faceRegisterScanResponseSchema = z.object({
  status: z.enum(["draft_created", "duplicate_found"]),
  draftId: z.string().optional(),
  maskedName: z.string().optional(),
  message: z.string(),
  redirectTo: z.string().optional(),
});

// 3. POST /api/face/patients/register (Flow A: กรอกข้อมูลผู้ป่วยเสร็จสิ้น)
export const facePatientsRegisterRequestSchema = z.object({
  draftId: z.string().min(1, "ต้องระบุ Draft ID"),
  hn: z.string().optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันเกิดไม่ถูกต้อง (YYYY-MM-DD)"),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().min(9, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก").max(15),
  injuryDetails: z.string().optional().default(""),
});

export const facePatientsRegisterResponseSchema = z.object({
  success: z.boolean(),
  patientId: z.string(),
  hn: z.string(),
  message: z.string(),
});

// 4. POST /api/face/login (Flow B: สแกนใบหน้าเพื่อเข้าสู่ระบบ)
export const faceLoginRequestSchema = z.object({
  challengeNonce: z.string().min(1, "ต้องระบุ Challenge Nonce"),
  embedding: vector128Schema,
  quality: z.number().min(0).max(1),
  attemptNo: z.number().int().min(1).default(1),
  excludedPatientIds: z.array(z.string()).optional().default([]),
  kioskId: z.string().optional(),
});

export const faceLoginResponseSchema = z.object({
  outcome: z.enum(["match", "ambiguous", "no_match", "inconsistent", "locked_out"]),
  candidateId: z.string().nullable().optional(),
  maskedName: z.string().optional(),
  hn: z.string().optional(),
  age: z.number().optional(),
  message: z.string(),
});

// 5. POST /api/face/confirm (Flow B: ยืนยัน หรือ ปฏิเสธชื่อบนการ์ด)
export const faceConfirmRequestSchema = z.object({
  candidateId: z.string().min(1, "ต้องระบุ Candidate ID"),
  confirmed: z.boolean(),
});

export const faceConfirmResponseSchema = z.object({
  success: z.boolean(),
  retryAllowed: z.boolean().optional(),
  patientId: z.string().optional(),
  fullName: z.string().optional(),
  redirectTo: z.string().optional(),
  message: z.string(),
});

// 6. POST /api/face/bind/start (Flow C: เจ้าหน้าที่เริ่มกระบวนการผูกใบหน้า)
export const faceBindStartRequestSchema = z.object({
  patientId: z.string().min(1, "ต้องระบุ Patient ID"),
  kioskId: z.string().optional(),
});

export const faceBindStartResponseSchema = z.object({
  bindRequestId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  expiresAt: z.string(),
});

// 7. POST /api/face/bind/scan (Flow C: สแกนและผูกใบหน้าเข้าบัญชีคนไข้เดิม)
export const faceBindScanRequestSchema = z.object({
  bindRequestId: z.string().min(1, "ต้องระบุ Bind Request ID"),
  challengeNonce: z.string().min(1, "ต้องระบุ Challenge Nonce"),
  embeddings: z.object({
    center: vector128Schema,
    left: vector128Schema,
    right: vector128Schema,
  }),
  consent: z.object({
    version: z.string().min(1),
    sha256: z.string().length(64),
    accepted: z.literal(true),
  }),
});

export const faceBindScanResponseSchema = z.object({
  success: z.boolean(),
  patientId: z.string(),
  message: z.string(),
});

// 8. POST /api/face/withdraw (Flow C / PDPA: เพิกถอนความยินยอมและลบข้อมูลใบหน้าถาวร)
export const faceWithdrawRequestSchema = z.object({
  patientId: z.string().min(1, "ต้องระบุ Patient ID"),
  reason: z.string().optional(),
});

export const faceWithdrawResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type FaceChallengeRequest = z.infer<typeof faceChallengeRequestSchema>;
export type FaceChallengeResponse = z.infer<typeof faceChallengeResponseSchema>;
export type FaceRegisterScanRequest = z.infer<typeof faceRegisterScanRequestSchema>;
export type FaceRegisterScanResponse = z.infer<typeof faceRegisterScanResponseSchema>;
export type FacePatientsRegisterRequest = z.infer<typeof facePatientsRegisterRequestSchema>;
export type FacePatientsRegisterResponse = z.infer<typeof facePatientsRegisterResponseSchema>;
export type FaceLoginRequest = z.infer<typeof faceLoginRequestSchema>;
export type FaceLoginResponse = z.infer<typeof faceLoginResponseSchema>;
export type FaceConfirmRequest = z.infer<typeof faceConfirmRequestSchema>;
export type FaceConfirmResponse = z.infer<typeof faceConfirmResponseSchema>;
export type FaceBindStartRequest = z.infer<typeof faceBindStartRequestSchema>;
export type FaceBindStartResponse = z.infer<typeof faceBindStartResponseSchema>;
export type FaceBindScanRequest = z.infer<typeof faceBindScanRequestSchema>;
export type FaceBindScanResponse = z.infer<typeof faceBindScanResponseSchema>;
export type FaceWithdrawRequest = z.infer<typeof faceWithdrawRequestSchema>;
export type FaceWithdrawResponse = z.infer<typeof faceWithdrawResponseSchema>;
