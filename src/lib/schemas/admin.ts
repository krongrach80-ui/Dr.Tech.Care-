import { z } from "zod";
import { appRoleSchema } from "./staff";

export { appRoleSchema };

export const appRoleEnum = z.enum(["director", "physio", "patient"]);

// 1. จัดการผู้ใช้งาน (User Management)
export const createUserSchema = z.object({
  username: z
    .string()
    .min(4, "ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 4 ตัวอักษร")
    .max(32, "ชื่อผู้ใช้งานต้องไม่เกิน 32 ตัวอักษร")
    .regex(/^[a-z0-9._-]+$/, "ชื่อผู้ใช้งานต้องเป็นตัวพิมพ์เล็ก ตัวเลข จุด หรือขีดกลางเท่านั้น"),
  displayName: z
    .string()
    .min(2, "ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
    .max(64, "ชื่อที่แสดงต้องไม่เกิน 64 ตัวอักษร"),
  role: appRoleEnum,
  initialPassword: z
    .string()
    .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
  forcePasswordChange: z.boolean().default(true),
});

export const editUserNameSchema = z.object({
  displayName: z
    .string()
    .min(2, "ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
    .max(64, "ชื่อที่แสดงต้องไม่เกิน 64 ตัวอักษร"),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1, "ต้องระบุ ID ผู้ใช้งาน"),
  temporaryPassword: z.string().min(8, "รหัสผ่านชั่วคราวต้องมีอย่างน้อย 8 ตัวอักษร"),
  forceChangeOnNextLogin: z.boolean().default(true),
});

export const deleteUserConfirmSchema = z.object({
  targetUserId: z.string().min(1),
  targetUsername: z.string().min(1),
  confirmedUsername: z.string().min(1, "กรุณากรอกชื่อบัญชีเพื่อยืนยันการลบ"),
}).refine((data) => data.targetUsername === data.confirmedUsername, {
  message: "ชื่อบัญชีที่พิมพ์ยืนยันไม่ตรงกับบัญชีที่ต้องการลบ",
  path: ["confirmedUsername"],
});

// 2. ข้อมูลคนไข้ (Patient Management)
export const patientFormSchema = z.object({
  profileId: z.string().optional(),
  username: z.string().min(4).max(32).optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  gender: z.enum(["male", "female", "other"], { message: "กรุณาเลือกเพศ" }),
  birthDate: z.string().min(1, "กรุณากรอกวันเกิด"),
  phone: z.string().regex(/^[0-9+ -]{9,15}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง"),
  medicalHistory: z.string().default(""),
  injuryDetails: z.string().min(1, "กรุณากรอกอาการบาดเจ็บหรือประวัติการรักษา"),
  responsiblePhysioId: z.string().nullable().optional(),
  startedAt: z.string().optional(),
});

export const physioNoteSchema = z.object({
  patientId: z.string().min(1, "ต้องระบุ ID คนไข้"),
  note: z.string().min(1, "กรุณากรอกข้อความโน้ต").max(2000, "ข้อความต้องไม่เกิน 2000 ตัวอักษร"),
  painScore: z.number().int().min(0).max(10).optional(),
});

// 3. ข้อมูลนักกายภาพ (Physiotherapist Management)
export const physioProfileSchema = z.object({
  profileId: z.string().min(1),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  phone: z.string().regex(/^[0-9+ -]{9,15}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง"),
  bio: z.string().default(""),
  licenseNumber: z.string().default(""),
});

// 4. ท่ากายภาพ (Exercise Management)
export const exerciseFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "ชื่อท่าต้องมีอย่างน้อย 2 ตัวอักษร").max(100),
  summary: z.string().min(5, "คำอธิบายสรุปต้องมีอย่างน้อย 5 ตัวอักษร"),
  steps: z.array(z.string().min(1)).min(1, "ต้องระบุขั้นตอนอย่างน้อย 1 ข้อ"),
  targetMuscles: z.array(z.string().min(1)).min(1, "ต้องระบุกล้ามเนื้อเป้าหมายอย่างน้อย 1 จุด"),
  recoveryPhase: z.enum(["acute", "subacute", "chronic", "maintenance"]),
  targetSets: z.coerce.number().int().min(1).max(10),
  targetReps: z.coerce.number().int().min(1).max(50),
  difficultyLevel: z.enum(["easy", "medium", "hard"]),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  analysisConfig: z.null().optional(), // เว้นเป็น null ในเฟสนี้ตามข้อกำหนด
});

// 5. ประวัติการใช้งาน & แบน & เตะ (Audit, Kick & Bans)
export const banTargetSchema = z.object({
  kind: z.enum(["device", "ip"]),
  value: z.string().min(1, "กรุณากรอกค่าที่ต้องการแบน"),
  reason: z.string().min(3, "กรุณาระบุเหตุผลในการแบนอย่างน้อย 3 ตัวอักษร"),
  durationHours: z.number().int().positive().nullable(), // null = ถาวร
});

export const kickSessionSchema = z.object({
  sessionId: z.string().min(1, "ต้องระบุ ID เซสชัน"),
  reason: z.string().min(2, "ต้องระบุเหตุผลในการเตะออกจากระบบ"),
});

// 6. ตั้งค่าระบบ (System Settings)
export const systemSettingsFormSchema = z.object({
  faceMatchingThreshold: z.coerce.number().min(0.1).max(0.9).default(0.40),
  faceAmbiguousDelta: z.coerce.number().min(0.01).max(0.20).default(0.05),
  poseSmoothingEmaAlpha: z.coerce.number().min(0.05).max(0.95).default(0.25),
  kioskIdleTimeoutSeconds: z.coerce.number().int().min(30).max(60).default(45),
  kioskWarningSeconds: z.coerce.number().int().min(5).max(20).default(10),
  physioScope: z.enum(["all", "own"]).default("all"),
  maxLoginFailedAttempts: z.coerce.number().int().min(3).max(10).default(5),
  lockoutDurationMinutes: z.coerce.number().int().min(5).max(60).default(15),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PatientFormInput = z.infer<typeof patientFormSchema>;
export type PhysioNoteInput = z.infer<typeof physioNoteSchema>;
export type PhysioProfileInput = z.infer<typeof physioProfileSchema>;
export type ExerciseFormInput = z.infer<typeof exerciseFormSchema>;
export type BanTargetInput = z.infer<typeof banTargetSchema>;
export type SystemSettingsFormInput = z.infer<typeof systemSettingsFormSchema>;