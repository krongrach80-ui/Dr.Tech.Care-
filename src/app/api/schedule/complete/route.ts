import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/writer";

const CompleteScheduleSchema = z.object({
  entryId: z.string().min(1, "entryId is required"),
  repsAchieved: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).default(0),
  accuracyScore: z.number().min(0).max(100).optional(),
});

// In-memory record store for updated schedule entries (syncs with client)
const completedEntries = new Map<string, {
  entryId: string;
  repsAchieved: number;
  durationSeconds: number;
  accuracyScore?: number | undefined;
  completedAt: string;
  status: "done";
}>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CompleteScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "ข้อมูลการฝึกไม่ถูกต้อง",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { entryId, repsAchieved, durationSeconds, accuracyScore } = parsed.data;

    const record = {
      entryId,
      repsAchieved,
      durationSeconds,
      accuracyScore,
      completedAt: new Date().toISOString(),
      status: "done" as const,
    };

    completedEntries.set(entryId, record);

    // Audit log
    await writeAudit({
      category: "data",
      action: "schedule_exercise_completed",
      outcome: "success",
      actorId: "patient-kiosk",
      targetTable: "schedule_entries",
      targetId: entryId,
      changes: record,
    });

    return NextResponse.json({
      success: true,
      entry: record,
      message: "บันทึกผลการฝึกสำเร็จโดยเซิร์ฟเวอร์",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Schedule Complete Error]:", errorMsg);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกผลการฝึก", details: errorMsg },
      { status: 500 }
    );
  }
}

