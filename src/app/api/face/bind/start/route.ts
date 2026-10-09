import { NextRequest, NextResponse } from "next/server";
import { faceBindStartRequestSchema, faceBindStartResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceBindStartRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลคำขอผูกใบหน้าไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { patientId, kioskId } = parsedBody.data;

    // สร้างคำขอผูกใบหน้า
    const patientName = "ผู้ป่วยรหัส " + patientId;
    const bindReq = faceService.createBindRequest(
      patientId,
      "physio_staff",
      patientName,
      kioskId
    );

    // Audit Log
    await writeAudit({
      category: "security",
      action: "face_bind_start",
      outcome: "success",
      actorRole: "physio",
      targetTable: "face_bind_requests",
      targetId: bindReq.id,
      metadata: { patientId, kioskId },
    });

    const responseData = faceBindStartResponseSchema.parse({
      bindRequestId: bindReq.id,
      patientId: bindReq.patientId,
      patientName: bindReq.patientName,
      expiresAt: new Date(bindReq.expiresAt).toISOString(),
    });

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเริ่มต้นผูกใบหน้า";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
