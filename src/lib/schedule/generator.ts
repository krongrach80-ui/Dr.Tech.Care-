/**
 * src/lib/schedule/generator.ts
 * Dr.Tech.Care — เครื่องมือสร้างและตรวจสอบตารางกายภาพ (Phase 3)
 * รองรับเขตเวลา Asia/Bangkok, ตรวจเวลาทับซ้อน, ข้ามเดือน, ข้ามปี, และ Idempotency
 */

export interface ScheduleRuleInput {
  id?: string;
  patientId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysOfWeek: number[]; // 1=Mon .. 7=Sun (ISO 8601)
  startTime: string; // HH:mm
  endTime?: string | undefined; // HH:mm
  kind: "exercise" | "quiz";
  exerciseId?: string | undefined;
  quizSetId?: string | undefined;
  targetSets?: number | undefined;
  targetReps?: number | undefined;
  holdSeconds?: number | undefined;
  difficulty?: number | undefined;
  notes?: string | undefined;
  createdBy: string;
}

export interface ScheduleEntryItem {
  id: string;
  ruleId?: string | undefined;
  patientId: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string | undefined; // HH:mm
  kind: "exercise" | "quiz";
  exerciseId?: string | undefined;
  quizSetId?: string | undefined;
  targetSets?: number | undefined;
  targetReps?: number | undefined;
  holdSeconds?: number | undefined;
  difficulty?: number | undefined;
  status: "planned" | "in_progress" | "completed" | "missed" | "cancelled";
  cancelReason?: string | undefined;
  completedAt?: string | undefined;
  notes?: string | undefined;
  createdBy: string;
  updatedBy?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * แปลงเวลาในรูปแบบ HH:mm เป็นจำนวนนาทีนับจากเที่ยงคืน
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  const hours = Number(parts[0] ?? 0);
  const minutes = Number(parts[1] ?? 0);
  return hours * 60 + minutes;
}

/**
 * ตรวจสอบว่าช่วงเวลา 2 ช่วงซ้อนทับกันหรือไม่
 */
export function doTimeIntervalsOverlap(
  start1: string,
  end1: string | undefined,
  start2: string,
  end2: string | undefined
): boolean {
  const s1 = timeStringToMinutes(start1);
  const e1 = end1 ? timeStringToMinutes(end1) : s1 + 30; // ถ้าไม่ระบุเวลาสิ้นสุด ให้ถือว่า 30 นาที

  const s2 = timeStringToMinutes(start2);
  const e2 = end2 ? timeStringToMinutes(end2) : s2 + 30;

  // เงื่อนไขทับซ้อน: start1 < end2 และ start2 < end1
  return s1 < e2 && s2 < e1;
}

/**
 * คำนวณ ISO Day of Week (1=จันทร์ .. 7=อาทิตย์) จากวันที่ YYYY-MM-DD ในเขตเวลา Asia/Bangkok
 */
export function getIsoDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return 1;

  // สร้าง Date object โดยอิงเวลาเที่ยงวันเพื่อหลีกเลี่ยงผลกระทบจาก Daylight Saving
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dow = d.getUTCDay(); // 0=Sunday, 1=Monday ... 6=Saturday
  return dow === 0 ? 7 : dow;
}

/**
 * สร้างรายการวันที่ทั้งหมดระหว่าง startDate ถึง endDate ที่ตรงกับ daysOfWeek
 * จัดการข้ามเดือนและข้ามปีได้อย่างสมบูรณ์
 */
export function generateScheduleDates(
  startDateStr: string,
  endDateStr: string,
  daysOfWeek: number[]
): string[] {
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
    return dates;
  }

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

  if (current > end) {
    return dates;
  }

  const allowedDaysSet = new Set(daysOfWeek);

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const dow = getIsoDayOfWeek(dateStr);
    if (allowedDaysSet.has(dow)) {
      dates.push(dateStr);
    }

    // เลื่อนไปวันถัดไป
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * ตรวจสอบความทับซ้อนของตารางนัดหมายผู้ป่วย
 */
export function checkScheduleOverlap(
  existingEntries: ScheduleEntryItem[],
  candidate: {
    patientId: string;
    scheduledDate: string;
    startTime: string;
    endTime?: string | undefined;
    excludeEntryId?: string | undefined;
  }
): { hasOverlap: boolean; conflictingEntry?: ScheduleEntryItem | undefined } {
  const activeEntries = existingEntries.filter(
    (e) =>
      e.patientId === candidate.patientId &&
      e.scheduledDate === candidate.scheduledDate &&
      e.status !== "cancelled" &&
      e.id !== candidate.excludeEntryId
  );

  for (const entry of activeEntries) {
    if (
      doTimeIntervalsOverlap(
        entry.startTime,
        entry.endTime,
        candidate.startTime,
        candidate.endTime
      )
    ) {
      return { hasOverlap: true, conflictingEntry: entry };
    }
  }

  return { hasOverlap: false, conflictingEntry: undefined };
}

/**
 * สร้างรายการ ScheduleEntryItem จาก ScheduleRuleInput (Idempotent)
 * หากมีรายการเดิมที่ตรงกันอยู่แล้วจะไม่สร้างซ้ำ
 */
export function generateEntriesFromRule(
  rule: ScheduleRuleInput,
  existingEntries: ScheduleEntryItem[]
): { newEntries: ScheduleEntryItem[]; skippedCount: number } {
  const dates = generateScheduleDates(rule.startDate, rule.endDate, rule.daysOfWeek);
  const newEntries: ScheduleEntryItem[] = [];
  let skippedCount = 0;

  for (const dateStr of dates) {
    // ตรวจสอบความซ้ำซ้อนเดิม (Idempotent check by ruleId + scheduledDate + startTime)
    const exists = existingEntries.some(
      (e) =>
        e.patientId === rule.patientId &&
        e.scheduledDate === dateStr &&
        e.startTime === rule.startTime &&
        e.status !== "cancelled"
    );

    if (exists) {
      skippedCount++;
      continue;
    }

    const entryId = `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    newEntries.push({
      id: entryId,
      ruleId: rule.id,
      patientId: rule.patientId,
      scheduledDate: dateStr,
      startTime: rule.startTime,
      endTime: rule.endTime,
      kind: rule.kind,
      exerciseId: rule.exerciseId,
      quizSetId: rule.quizSetId,
      targetSets: rule.targetSets,
      targetReps: rule.targetReps,
      holdSeconds: rule.holdSeconds,
      difficulty: rule.difficulty,
      status: "planned",
      notes: rule.notes,
      createdBy: rule.createdBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return { newEntries, skippedCount };
}

/**
 * คัดลอกตารางกายภาพจากสัปดาห์ต้นทางไปยังสัปดาห์ปลายทาง
 */
export function copyWeekEntries(
  sourceWeekStart: string, // YYYY-MM-DD (จันทร์)
  targetWeekStart: string, // YYYY-MM-DD (จันทร์)
  patientId: string,
  existingEntries: ScheduleEntryItem[],
  actorId: string
): { copiedEntries: ScheduleEntryItem[]; conflictCount: number } {
  // คำนวณผลต่างของวันระหว่างสัปดาห์ต้นทางและปลายทาง
  const srcDate = new Date(`${sourceWeekStart}T12:00:00Z`);
  const tgtDate = new Date(`${targetWeekStart}T12:00:00Z`);
  const dayOffset = Math.round((tgtDate.getTime() - srcDate.getTime()) / (1000 * 60 * 60 * 24));

  const sourceDates = generateScheduleDates(sourceWeekStart, addDays(sourceWeekStart, 6), [1, 2, 3, 4, 5, 6, 7]);
  const sourceDateSet = new Set(sourceDates);

  const sourceEntries = existingEntries.filter(
    (e) => e.patientId === patientId && sourceDateSet.has(e.scheduledDate) && e.status !== "cancelled"
  );

  const copiedEntries: ScheduleEntryItem[] = [];
  let conflictCount = 0;

  for (const src of sourceEntries) {
    const targetDate = addDays(src.scheduledDate, dayOffset);

    // ตรวจสอบความทับซ้อนในสัปดาห์ปลายทาง
    const overlapCheck = checkScheduleOverlap([...existingEntries, ...copiedEntries], {
      patientId,
      scheduledDate: targetDate,
      startTime: src.startTime,
      endTime: src.endTime,
    });

    if (overlapCheck.hasOverlap) {
      conflictCount++;
      continue;
    }

    const nowIso = new Date().toISOString();
    copiedEntries.push({
      ...src,
      id: `copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ruleId: undefined, // เป็นรายการเฉพาะกิจที่คัดลอกมา
      scheduledDate: targetDate,
      status: "planned",
      cancelReason: undefined,
      completedAt: undefined,
      createdBy: actorId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return { copiedEntries, conflictCount };
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + days, 12, 0, 0));
  const resY = dt.getUTCFullYear();
  const resM = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const resD = String(dt.getUTCDate()).padStart(2, "0");
  return `${resY}-${resM}-${resD}`;
}
