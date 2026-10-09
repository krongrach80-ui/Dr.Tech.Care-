import { NextRequest, NextResponse } from "next/server";
import { faceConfirmRequestSchema, faceConfirmResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";
import { resetLoginRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceConfirmRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลการยืนยันไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { candidateId, confirmed } = parsedBody.data;

    // ค้นหา Candidate ที่รอการยืนยัน
    const candidate = faceService.getCandidate(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: "เซสชันการยืนยันตัวตนหมดอายุหรือไม่มีในระบบ กรุณาสแกนใบหน้าใหม่" },
        { status: 404 }
      );
    }

    // กรณีที่ 1: ผู้รับบริการยืนยันว่าเป็นตัวเอง (Confirmed = true)
    if (confirmed) {
      resetLoginRateLimit("kiosk-01");

      // บันทึก Audit Log เข้าสู่ระบบสำเร็จ
      await writeAudit({
        category: "auth",
        action: "face_login_success",
        outcome: "success",
        actorId: candidate.patientId,
        actorRole: "patient",
        targetTable: "patients",
        targetId: candidate.patientId,
        metadata: {
          attemptNo: candidate.attemptNo,
          hn: candidate.hn,
        },
      });

      const responsePayload = faceConfirmResponseSchema.parse({
        success: true,
        patientId: candidate.patientId,
        fullName: candidate.fullName,
        redirectTo: "/home",
        message: "ยืนยันตัวตนสำเร็จ เข้าสู่ระบบเรียบร้อย",
      });

      const res = NextResponse.json(responsePayload, { status: 200 });

      // ตั้งค่า Cookie Session สำเร็จ (Fallback Session ตาม ADR-014)
      res.cookies.set("drtechcare_patient_session", candidate.patientId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600, // 1 ชั่วโมง
      });

      return res;
    }

    // กรณีที่ 2: ผู้รับบริการปฏิเสธว่าไม่ใช่ตัวเอง (Confirmed = false)
    await writeAudit({
      category: "security",
      action: "face_login_rejected",
      outcome: "failure",
      actorRole: "patient",
      targetTable: "face_candidates",
      targetId: candidate.id,
      metadata: {
        attemptNo: candidate.attemptNo,
        deniedPatientId: candidate.patientId,
        reason: "User denied face identity match card",
      },
    });

    // กฎเหล็ก: ปฏิเสธครั้งที่ 2 = ต้องติดต่อเจ้าหน้าที่คลินิก ไม่อนุญาตให้สแกนซ้ำ
    if (candidate.attemptNo >= 2) {
      const lockResponse = faceConfirmResponseSchema.parse({
        success: false,
        retryAllowed: false,
        message: "ปฏิเสธตัวตนครบ 2 ครั้ง เพื่อความปลอดภัย กรุณาติดต่อเจ้าหน้าที่คลินิก",
      });
      return NextResponse.json(lockResponse, { status: 200 });
    }

    // ปฏิเสธครั้งแรก อนุญาตให้ลองใหม่ได้อีก 1 ครั้ง
    const retryResponse = faceConfirmResponseSchema.parse({
      success: false,
      retryAllowed: true,
      message: "ปฏิเสธตัวตน ท่านสามารถลองสแกนใบหน้าใหม่อีก 1 ครั้ง",
    });
    return NextResponse.json(retryResponse, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการยืนยันตัวตน";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
