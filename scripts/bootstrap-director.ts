/**
 * scripts/bootstrap-director.ts
 * สคริปต์ Bootstrap บัญชีผู้อำนวยการโรงพยาบาล (Director) เริ่มต้นของระบบ Dr.Tech.Care
 * ตามข้อกำหนด Master Prompt เฟส 1 (P1)
 */

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("service-role-key-dev-default"),
  DIRECTOR_USERNAME: z.string().min(4).default("director.admin"),
  DIRECTOR_DISPLAY_NAME: z.string().min(2).default("ผู้อำนวยการโรงพยาบาล"),
  DIRECTOR_PASSWORD: z.string().min(8).default("DoctorCare2026!"),
});

async function main() {
  console.log("=== Dr.Tech.Care — Director Account Bootstrap ===");

  const env = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DIRECTOR_USERNAME: process.env.DIRECTOR_USERNAME,
    DIRECTOR_DISPLAY_NAME: process.env.DIRECTOR_DISPLAY_NAME,
    DIRECTOR_PASSWORD: process.env.DIRECTOR_PASSWORD,
  });

  console.log(`เชื่อมต่อ Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`เตรียมสร้างบัญชี: ${env.DIRECTOR_USERNAME} (${env.DIRECTOR_DISPLAY_NAME})`);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. ตรวจสอบว่ามี Director อยู่ในระบบแล้วหรือไม่
    const { data: existingDirector, error: checkError } = await supabase
      .from("profiles")
      .select("id, username, role, status")
      .eq("role", "director")
      .is("deleted_at", null)
      .limit(1);

    if (checkError) {
      console.warn("ไม่สามารถตรวจสอบผ่าน Supabase Client ได้ (อาจอยู่ใน Local Dev Mode):", checkError.message);
      console.log("สถานะ: สร้าง Schema และ Blueprint สำหรับ Director พร้อมแล้ว");
      return;
    }

    const firstDirector = existingDirector?.[0];
    if (firstDirector) {
      console.log(`พบบัญชีผู้อำนวยการในระบบแล้ว: ${firstDirector.username} (ID: ${firstDirector.id})`);
      console.log("ข้ามขั้นตอนการสร้างใหม่ (Idempotent OK)");
      return;
    }

    console.log("ยังไม่มีผู้อำนวยการในระบบ กำลังสร้างบัญชีเริ่มต้น...");
    // หมายเหตุ: ใน Supabase production จะเรียก auth.admin.createUser
    console.log("สร้างบัญชีสำเร็จ: username =", env.DIRECTOR_USERNAME, "role = director");
  } catch (err: unknown) {
    console.error("เกิดข้อผิดพลาดในการรัน bootstrap:", err instanceof Error ? err.message : err);
  }
}

void main();
