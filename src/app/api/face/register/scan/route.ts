import { NextRequest, NextResponse } from "next/server";
import { faceRegisterScanRequestSchema, faceRegisterScanResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";
import { maskName } from "@/lib/thai";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceRegisterScanRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลสแกนใบหน้าไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { challengeNonce, embeddings, consent, kioskId } = parsedBody.data;

    // 1. ตรวจสอบและใช้งาน Nonce ทันที (ป้องกัน Replay Attack)
    try {
      faceService.verifyAndConsumeNonce(challengeNonce, "register");
    } catch (nonceErr: unknown) {
      const msg = nonceErr instanceof Error ? nonceErr.message : "Challenge Nonce ไม่ถูกต้อง";
      await writeAudit({
        category: "security",
        action: "liveness_fail",
        outcome: "failure",
        actorRole: "patient",
        kioskId: kioskId ?? "kiosk-01",
        metadata: { reason: msg, nonce: challengeNonce },
      });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 2. ตรวจสอบใบหน้าซ้ำในระบบ (Duplicate Face Detection)
    const duplicateCheck = faceService.checkDuplicateFace(embeddings.center);

    if (duplicateCheck.isDuplicate && duplicateCheck.matchedRecord) {
      const matched = duplicateCheck.matchedRecord;

      // บันทึก Audit Log สำหรับใบหน้าซ้ำ โดยห้ามบันทึก Raw Embedding โดยเด็ดขาด
      await writeAudit({
        category: "security",
        action: "face_duplicate",
        outcome: "failure",
        actorRole: "patient",
        targetTable: "face_embeddings",
        targetId: matched.patientId,
        kioskId: kioskId ?? "kiosk-01",
        metadata: {
          reason: "Duplicate biometric face detected during self-registration",
          matchedHn: matched.hn,
        },
      });

      const responseData = faceRegisterScanResponseSchema.parse({
        status: "duplicate_found",
        maskedName: maskName(matched.fullName),
        message: "ตรวจพบว่าใบหน้านี้ตรงกับบัญชีผู้ป่วยในระบบแล้ว กรุณาเข้าสู่ระบบ",
        redirectTo: "/login",
      });

      return NextResponse.json(responseData, { status: 200 });
    }

    // 3. กรณีไม่ซ้ำ: สร้าง Enrollment Draft
    const draft = faceService.createDraft(
      {
        version: consent.version,
        sha256: consent.sha256,
        accepted: Boolean(consent.accepted),
      },
      embeddings,
      kioskId
    );

    const responseData = faceRegisterScanResponseSchema.parse({
      status: "draft_created",
      draftId: draft.id,
      message: "ตรวจสอบใบหน้าสำเร็จ บันทึกร่างข้อมูลเรียบร้อย กรุณากรอกข้อมูลส่วนตัว",
    });

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบใบหน้า";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
