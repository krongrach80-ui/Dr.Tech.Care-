import { NextRequest, NextResponse } from "next/server";
import { faceWithdrawRequestSchema, faceWithdrawResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceWithdrawRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลคำขอเพิกถอนไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { patientId, reason } = parsedBody.data;

    // ดำเนินการลบข้อมูลใบหน้าและเพิกถอนความยินยอม
    faceService.withdrawFaceConsent(patientId);

    // บันทึก Audit Log
    await writeAudit({
      category: "security",
      action: "face_withdraw_consent",
      outcome: "success",
      actorRole: "physio",
      targetTable: "face_embeddings",
      targetId: patientId,
      metadata: {
        reason: reason ?? "Patient requested PDPA Right to Erasure",
      },
    });

    const responseData = faceWithdrawResponseSchema.parse({
      success: true,
      message: "เพิกถอนความยินยอมและลบข้อมูลชีวมิติใบหน้าออกจากระบบถาวรเรียบร้อยแล้ว (PDPA)",
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเพิกถอนความยินยอม";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
