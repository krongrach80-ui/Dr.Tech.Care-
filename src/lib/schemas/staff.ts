import { z } from "zod";

export const appRoleSchema = z.enum(["director", "physio", "patient"]);
export const staffRoleSchema = z.enum(["director", "physio"]);

export const staffLoginSchema = z.object({
  username: z
    .string()
    .min(4, "ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 4 ตัวอักษร")
    .max(32, "ชื่อผู้ใช้งานต้องไม่เกิน 32 ตัวอักษร")
    .regex(/^[a-z0-9._-]+$/, "ชื่อผู้ใช้งานต้องเป็นตัวพิมพ์เล็ก ตัวเลข จุด หรือขีดกลางเท่านั้น"),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
  role: staffRoleSchema,
});

export const staffSessionSchema = z.object({
  role: staffRoleSchema,
  username: z.string().min(1),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type StaffSession = z.infer<typeof staffSessionSchema>;

/**
 * ตรวจสอบความถูกต้องของข้อมูล Session เจ้าหน้าที่ก่อนบันทึกหรืออ่านจาก Storage
 */
export function parseStaffSession(roleRaw: unknown, usernameRaw: unknown): StaffSession | null {
  const result = staffSessionSchema.safeParse({
    role: roleRaw,
    username: usernameRaw,
  });
  if (!result.success) return null;
  return result.data;
}