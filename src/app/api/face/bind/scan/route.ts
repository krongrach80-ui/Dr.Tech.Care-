import { NextRequest, NextResponse } from "next/server";
import { faceBindScanRequestSchema, faceBindScanResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceBindScanRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลสแกนผูกใบหน้าไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { bindRequestId, challengeNonce, embeddings, consent } = parsedBody.data;

    // 1. ตรวจสอบและใช้งาน Nonce
    try {
      faceService.verifyAndConsumeNonce(challengeNonce, "bind");
    } catch (nonceErr: unknown) {
      const msg = nonceErr instanceof Error ? nonceErr.message : "Challenge Nonce ไม่ถูกต้อง";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 2. ดำเนินการผูกใบหน้า
    try {
      const record = faceService.bindFaceToPatient(bindRequestId, embeddings, consent);

      // บันทึก Audit Log
      await writeAudit({
        category: "data",
        action: "face_bind_success",
        outcome: "success",
        actorRole: "physio",
        targetTable: "face_embeddings",
        targetId: record.patientId,
        metadata: {
          bindRequestId,
          consentVersion: consent.version,
          consentSha256: consent.sha256,
        },
      });

      const responseData = faceBindScanResponseSchema.parse({
        success: true,
        patientId: record.patientId,
        message: `ผูกข้อมูลใบหน้ากับผู้ป่วยสำเร็จ`,
      });

      return NextResponse.json(responseData, { status: 200 });
    } catch (bindErr: unknown) {
      const msg = bindErr instanceof Error ? bindErr.message : "ไม่สามารถผูกใบหน้าได้";
      if (msg.includes("ผู้ป่วยอื่น")) {
        await writeAudit({
          category: "security",
          action: "face_duplicate",
          outcome: "failure",
          actorRole: "physio",
          metadata: { reason: msg, bindRequestId },
        });
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการผูกใบหน้า";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
