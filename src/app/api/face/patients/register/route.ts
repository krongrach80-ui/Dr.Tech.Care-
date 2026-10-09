import { NextRequest, NextResponse } from "next/server";
import {
  facePatientsRegisterRequestSchema,
  facePatientsRegisterResponseSchema,
} from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { writeAudit } from "@/lib/audit/writer";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = facePatientsRegisterRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลผู้ป่วยไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { draftId, ...patientData } = parsedBody.data;

    // ตรวจสอบว่า Draft มีอยู่จริงและยังไม่หมดอายุ
    const draft = faceService.getDraft(draftId);
    if (!draft) {
      return NextResponse.json(
        { error: "ร่างข้อมูลการลงทะเบียนไม่ถูกต้องหรือหมดอายุแล้ว กรุณาสแกนใบหน้าใหม่" },
        { status: 404 }
      );
    }

    // สมัครและบันทึกผู้ป่วยพร้อมเวกเตอร์ใบหน้า
    const record = faceService.registerPatientWithFace(draftId, patientData);

    // บันทึก Audit Log
    await writeAudit({
      category: "data",
      action: "patient_registered",
      outcome: "success",
      actorRole: "patient",
      targetTable: "patients",
      targetId: record.patientId,
      changes: {
        hn: record.hn,
        fullName: record.fullName,
        birthDate: record.birthDate,
        consentVersion: record.consentVersion,
      },
      metadata: {
        flow: "A_kiosk_self_registration",
        consentSha256: record.consentSha256,
      },
    });

    const responseData = facePatientsRegisterResponseSchema.parse({
      success: true,
      patientId: record.patientId,
      hn: record.hn,
      message: "ลงทะเบียนผู้ป่วยและบันทึกข้อมูลชีวมิติสำเร็จ",
    });

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลงทะเบียนผู้ป่วย";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
