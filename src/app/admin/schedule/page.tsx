"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Activity,
  Clock,
  AlertTriangle,
  Copy,
  Trash2,
  X,
  Edit2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import {
  useAdminStore,
  type PatientRecord,
} from "@/lib/stores/adminStore";
import {
  generateScheduleDates,
  checkScheduleOverlap,
  type ScheduleEntryItem,
} from "@/lib/schedule/generator";
import { formatThaiDate, calculateAge } from "@/lib/thai";
import { canPhysioAccessPatient } from "@/lib/rbac";

// Helper: แปลงวันที่ YYYY-MM-DD เป็น Date object แบบเที่ยงวัน UTC
function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

// Helper: Format Date object เป็น YYYY-MM-DD
function toIsoDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper: หาวันจันทร์ของสัปดาห์ที่มีวันเป้าหมาย
function getMondayOfWeek(d: Date): Date {
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon .. 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  return monday;
}

// Helper: เพิ่มวัน
function addDaysToDate(d: Date, days: number): Date {
  const res = new Date(d);
  res.setUTCDate(d.getUTCDate() + days);
  return res;
}

const THAI_DAY_NAMES = [
  { dow: 1, name: "จันทร์", short: "จ." },
  { dow: 2, name: "อังคาร", short: "อ." },
  { dow: 3, name: "พุธ", short: "พ." },
  { dow: 4, name: "พฤหัสบดี", short: "พฤ." },
  { dow: 5, name: "ศุกร์", short: "ศ." },
  { dow: 6, name: "เสาร์", short: "ส." },
  { dow: 7, name: "อาทิตย์", short: "อา." },
];

export default function AdminSchedulePage() {
  const {
    currentActor,
    settings,
    patients,
    exercises,
    scheduleEntries,
    addScheduleRule,
    updateScheduleEntry,
    cancelScheduleEntry,
    deleteScheduleEntry,
    copyWeekSchedule,
  } = useAdminStore();

  const isDirector = currentActor.role === "director";
  const physioScope = settings.access_policy.physio_scope;

  // กรองคนไข้ตามสิทธิ์การเข้าถึง (Director: ทั้งหมด | Physio: ตาม physio_scope)
  const accessiblePatients = useMemo(() => {
    return patients.filter((p) => {
      if (isDirector) return true;
      return canPhysioAccessPatient(
        currentActor.userId,
        physioScope,
        p.responsiblePhysioId ?? undefined
      );
    });
  }, [patients, isDirector, currentActor.userId, physioScope]);

  // ค้นหาและเลือกคนไข้
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const filteredPatients = useMemo(() => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return accessiblePatients;
    return accessiblePatients.filter(
      (p) =>
        p.hn.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [accessiblePatients, patientSearchQuery]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    accessiblePatients[0]?.id ?? "u0000000-0000-0000-0000-000000000001"
  );

  const selectedPatient: PatientRecord | undefined = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // มุมมอง: สัปดาห์ (week) หรือ วัน (day)
  const [viewMode, setViewMode] = useState<"week" | "day">("week");

  // วันอ้างอิงของปฏิทิน (เริ่มต้นที่วันที่ 12 ต.ค. 2569 ตาม seed / วันนี้)
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    return new Date(Date.UTC(2026, 9, 12, 12, 0, 0));
  });

  // วันจันทร์ของสัปดาห์ปัจจุบัน
  const mondayOfCurrentWeek = useMemo(() => {
    return getMondayOfWeek(currentCalendarDate);
  }, [currentCalendarDate]);

  // รายการ 7 วันในสัปดาห์
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dt = addDaysToDate(mondayOfCurrentWeek, i);
      const iso = toIsoDateString(dt);
      const dow = i + 1; // 1=Mon .. 7=Sun
      const dayInfo = THAI_DAY_NAMES.find((td) => td.dow === dow) ?? {
        name: "",
        short: "",
      };
      return {
        date: dt,
        isoString: iso,
        dow,
        thaiName: dayInfo.name,
        thaiShort: dayInfo.short,
      };
    });
  }, [mondayOfCurrentWeek]);

  // รายการนัดหมายของผู้ป่วยที่เลือก
  const patientScheduleEntries = useMemo(() => {
    if (!selectedPatientId) return [];
    return scheduleEntries.filter((e) => e.patientId === selectedPatientId);
  }, [scheduleEntries, selectedPatientId]);

  // การเลื่อนสัปดาห์ / วัน
  const handlePrev = () => {
    if (viewMode === "week") {
      setCurrentCalendarDate((prev) => addDaysToDate(prev, -7));
    } else {
      setCurrentCalendarDate((prev) => addDaysToDate(prev, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      setCurrentCalendarDate((prev) => addDaysToDate(prev, 7));
    } else {
      setCurrentCalendarDate((prev) => addDaysToDate(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentCalendarDate(new Date(Date.UTC(2026, 9, 12, 12, 0, 0)));
  };

  // ----------------------------------------------------
  // Modal สร้างตารางกายภาพ (Create Schedule Modal)
  // ----------------------------------------------------
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    startDate: "2026-10-12",
    endDate: "2026-10-29",
    daysOfWeek: [1, 2, 3, 4], // ค่าเริ่มต้น: จ-พฤ ตาม Master Prompt
    startTime: "09:00",
    endTime: "09:45",
    exerciseId: "ex-1",
    targetSets: 3,
    targetReps: 10,
    holdSeconds: 0,
    notes: "",
  });

  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // คำนวณพรีวิวรายการที่จะถูกสร้าง (Live Preview)
  const previewDates = useMemo(() => {
    if (!createForm.startDate || !createForm.endDate || createForm.daysOfWeek.length === 0) {
      return [];
    }
    return generateScheduleDates(
      createForm.startDate,
      createForm.endDate,
      createForm.daysOfWeek
    );
  }, [createForm.startDate, createForm.endDate, createForm.daysOfWeek]);

// ตรวจเวลาทับซ้อนแบบเรียลไทม์ (Overlap Detection)
  let overlapCheckResult: {
    hasOverlap: boolean;
    conflictingDate: string | null;
    conflictingEntry: ScheduleEntryItem | null | undefined;
  } = { hasOverlap: false, conflictingDate: null, conflictingEntry: null };

  if (selectedPatientId && previewDates.length > 0) {
    for (const d of previewDates) {
      const check = checkScheduleOverlap(patientScheduleEntries, {
        patientId: selectedPatientId,
        scheduledDate: d,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
      });
      if (check.hasOverlap) {
        overlapCheckResult = {
          hasOverlap: true,
          conflictingDate: d,
          conflictingEntry: check.conflictingEntry,
        };
        break;
      }
    }
  }

  // บันทึกการสร้างตาราง
  const handleSaveScheduleRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (overlapCheckResult.hasOverlap) {
      setCreateError(
        `ไม่สามารถบันทึกได้เนื่องจากมีเวลาทับซ้อนในวันที่ ${overlapCheckResult.conflictingDate} เวลา ${createForm.startTime}-${createForm.endTime}`
      );
      return;
    }

    try {
      const res = await addScheduleRule({
        patientId: selectedPatientId,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        daysOfWeek: createForm.daysOfWeek,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        kind: "exercise",
        exerciseId: createForm.exerciseId,
        targetSets: Number(createForm.targetSets),
        targetReps: Number(createForm.targetReps),
        holdSeconds: Number(createForm.holdSeconds),
        difficulty: 1,
        notes: createForm.notes.trim() || undefined,
      });

      setCreateSuccessMsg(`กำหนดตารางกายภาพสำเร็จ สร้างรายการฝึกทั้งหมด ${res.generatedCount} รายการ`);
      setIsCreateModalOpen(false);
      setTimeout(() => setCreateSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // ----------------------------------------------------
  // Modal รายละเอียดรายการ / ยกเลิก / ลบ / แก้ไข
  // ----------------------------------------------------
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntryItem | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonSelect, setCancelReasonSelect] = useState<string>("คนไข้ไม่มา");
  const [cancelCustomReason, setCancelCustomReason] = useState<string>("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editScope, setEditScope] = useState<"single" | "future_series">("single");
  const [editForm, setEditForm] = useState({
    startTime: "09:00",
    endTime: "09:45",
    targetSets: 3,
    targetReps: 10,
    notes: "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // คัดลอกสัปดาห์
  const [copyStatusMsg, setCopyStatusMsg] = useState<string | null>(null);
  const handleCopyWeek = async () => {
    const srcStart = toIsoDateString(mondayOfCurrentWeek);
    const tgtStart = toIsoDateString(addDaysToDate(mondayOfCurrentWeek, 7));

    try {
      const res = await copyWeekSchedule(selectedPatientId, srcStart, tgtStart);
      if (res.copiedCount > 0) {
        setCopyStatusMsg(
          `คัดลอกตารางไปสัปดาห์ถัดไปสำเร็จ ${res.copiedCount} รายการ ${
            res.conflictCount > 0 ? `(ข้ามรายการทับซ้อน ${res.conflictCount} รายการ)` : ""
          }`
        );
      } else {
        setCopyStatusMsg(
          res.conflictCount > 0
            ? `ไม่สามารถคัดลอกได้เนื่องจากมีเวลาทับซ้อนครบทั้งหมด (${res.conflictCount} รายการ)`
            : "ไม่พบรายการที่มีสถานะรอดำเนินการในสัปดาห์นี้ที่จะคัดลอกได้"
        );
      }
      setTimeout(() => setCopyStatusMsg(null), 5000);
    } catch (err: unknown) {
      setCopyStatusMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการคัดลอก");
      setTimeout(() => setCopyStatusMsg(null), 5000);
    }
  };

  // ยกเลิกรายการพร้อมเหตุผลด่วน
  const handleConfirmCancel = async () => {
    if (!selectedEntry) return;
    setCancelError(null);
    const finalReason =
      cancelReasonSelect === "อื่นๆ" && cancelCustomReason.trim()
        ? cancelCustomReason.trim()
        : cancelReasonSelect;

    try {
      await cancelScheduleEntry(selectedEntry.id, finalReason);
      setIsCancelModalOpen(false);
      setSelectedEntry(null);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "ไม่สามารถยกเลิกได้");
    }
  };

  // ลบรายการ
  const handleConfirmDelete = async () => {
    if (!selectedEntry) return;
    setDeleteError(null);
    try {
      await deleteScheduleEntry(selectedEntry.id);
      setIsDeleteModalOpen(false);
      setSelectedEntry(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "ไม่สามารถลบได้");
    }
  };

  // แก้ไขรายการ
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setEditError(null);

    // ตรวจสอบเวลาทับซ้อนสำหรับ single edit
    if (editScope === "single") {
      const overlap = checkScheduleOverlap(patientScheduleEntries, {
        patientId: selectedPatientId,
        scheduledDate: selectedEntry.scheduledDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        excludeEntryId: selectedEntry.id,
      });

      if (overlap.hasOverlap) {
        setEditError("ช่วงเวลาที่แก้ไขซ้อนทับกับรายการอื่นในวันเดียวกัน");
        return;
      }
    }

    try {
      await updateScheduleEntry(selectedEntry.id, editScope, {
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        targetSets: Number(editForm.targetSets),
        targetReps: Number(editForm.targetReps),
        notes: editForm.notes.trim() || undefined,
      });
      setIsEditModalOpen(false);
      setSelectedEntry(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "ไม่สามารถแก้ไขได้");
    }
  };

  // ฟังก์ชันหา Exercise Name
  const getExerciseName = (exId?: string) => {
    if (!exId) return "ไม่ระบุท่ากายภาพ";
    const found = exercises.find((e) => e.id === exId);
    return found ? found.name : exId;
  };

  // สไตล์สีสถานะตามข้อกำหนด
  const getStatusBadge = (status: ScheduleEntryItem["status"], reason?: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span>ทำแล้ว</span>
          </span>
        );
      case "planned":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3" />
            <span>รอฝึก</span>
          </span>
        );
      case "missed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3" />
            <span>พลาด</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <span>ยกเลิก {reason ? `(${reason})` : ""}</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            กำลังฝึก
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert Messages */}
      {createSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{createSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreateSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {copyStatusMsg && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>{copyStatusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopyStatusMsg(null)}
            className="text-blue-700 hover:text-blue-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E8A4C] to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                กำหนดตารางกายภาพ (Physiotherapy Schedule)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                หน้าต่างที่ 7: กำหนดตารางการฝึก, พรีวิว, ตรวจเวลาทับซ้อน, แก้ไขรายชุด และคัดลอกสัปดาห์
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-copy-week"
            onClick={handleCopyWeek}
            disabled={!selectedPatient}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="คัดลอกตารางจากสัปดาห์นี้ไปสัปดาห์ถัดไป (+7 วัน)"
          >
            <Copy className="w-4 h-4 text-emerald-600" />
            <span>คัดลอกสัปดาห์ (+7 วัน)</span>
          </button>

          <button
            type="button"
            id="btn-open-create-schedule"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            disabled={!selectedPatient}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>กำหนดตารางกายภาพ</span>
          </button>
        </div>
      </div>

      {/* Patient Selector & Info Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Searchable Patient Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-search-patient"
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              placeholder="ค้นหาคนไข้ (HN, ชื่อ, เบอร์โทร)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden transition-all font-medium"
            />
          </div>

          <div className="flex-1 min-w-[240px]">
            <select
              id="select-patient"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-[#1E8A4C] focus:outline-hidden font-bold text-slate-800 cursor-pointer"
            >
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  HN: {p.hn} — {p.firstName} {p.lastName} ({p.injuryDetails})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Patient Details Pill */}
        {selectedPatient && (
          <div className="flex items-center gap-3 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl px-4 py-2 text-xs">
            <div className="w-8 h-8 rounded-xl bg-[#1E8A4C] text-white flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900">
                {selectedPatient.firstName} {selectedPatient.lastName}{" "}
                <span className="font-normal text-slate-500">
                  (อายุ {calculateAge(selectedPatient.birthDate)} ปี)
                </span>
              </span>
              <span className="text-[11px] text-slate-600 truncate max-w-[280px]">
                อาการ: {selectedPatient.injuryDetails}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Controls & Navigation Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-calendar-prev"
            onClick={handlePrev}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="ก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="btn-calendar-today"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
          >
            วันนี้
          </button>
          <button
            type="button"
            id="btn-calendar-next"
            onClick={handleNext}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="ถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Thai Date with Buddhist Era */}
          <div className="ml-2 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#1E8A4C]" />
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              {viewMode === "week" ? (
                <>
                  {formatThaiDate(weekDays[0]?.date ?? currentCalendarDate, {
                    formatStyle: "medium",
                  })}{" "}
                  –{" "}
                  {formatThaiDate(weekDays[6]?.date ?? currentCalendarDate, {
                    formatStyle: "medium",
                  })}
                </>
              ) : (
                formatThaiDate(currentCalendarDate, { formatStyle: "full" })
              )}
            </span>
          </div>
        </div>

        {/* View Mode Switcher (Week / Day) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            id="btn-view-week"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "week"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            มุมมองสัปดาห์
          </button>
          <button
            type="button"
            id="btn-view-day"
            onClick={() => setViewMode("day")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "day"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            มุมมองวัน
          </button>
        </div>
      </div>

      {/* Week Calendar View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayEntries = patientScheduleEntries
              .filter((e) => e.scheduledDate === day.isoString)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const isToday =
              day.isoString === toIsoDateString(new Date(Date.UTC(2026, 9, 12, 12, 0, 0)));

            return (
              <div
                key={day.isoString}
                className={`flex flex-col rounded-3xl border transition-all min-h-[380px] p-3 ${
                  isToday
                    ? "bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200/80 shadow-xs"
                }`}
              >
                {/* Day Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      วัน{day.thaiName}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatThaiDate(day.date, { formatStyle: "short" })}
                    </span>
                  </div>
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#1E8A4C] text-white">
                      วันนี้
                    </span>
                  )}
                </div>

                {/* Day Entries List */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {dayEntries.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center text-slate-300">
                      <span className="text-[11px]">ไม่มีนัดหมาย</span>
                    </div>
                  ) : (
                    dayEntries.map((entry) => {
                      const isCancelled = entry.status === "cancelled";

                      return (
                        <div
                          key={entry.id}
                          id={`entry-card-${entry.id}`}
                          onClick={() => setSelectedEntry(entry)}
                          className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-xs flex flex-col gap-1.5 ${
                            isCancelled
                              ? "bg-slate-50 border-slate-200 opacity-60 line-through"
                              : entry.status === "completed"
                              ? "bg-emerald-50/70 border-emerald-200"
                              : entry.status === "missed"
                              ? "bg-rose-50/70 border-rose-200"
                              : "bg-blue-50/60 border-blue-200 hover:border-[#1E8A4C]"
                          }`}
                        >
                          {/* Time & Status */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {entry.startTime} {entry.endTime ? `- ${entry.endTime}` : ""}
                            </span>
                            {getStatusBadge(entry.status, entry.cancelReason)}
                          </div>

                          {/* Exercise Title */}
                          <span className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                            {getExerciseName(entry.exerciseId)}
                          </span>

                          {/* Sets & Reps */}
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <Activity className="w-3 h-3 text-[#1E8A4C]" />
                            <span>
                              {entry.targetSets ?? 3} เซต × {entry.targetReps ?? 10} ครั้ง
                            </span>
                          </div>

                          {entry.notes && (
                            <span className="text-[10px] text-slate-400 truncate italic">
                              &ldquo;{entry.notes}&rdquo;
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day Calendar View */}
      {viewMode === "day" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                รายการตารางกายภาพประจำวัน
              </h2>
              <p className="text-xs text-slate-500">
                {formatThaiDate(currentCalendarDate, { formatStyle: "full" })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {patientScheduleEntries
              .filter((e) => e.scheduledDate === toIsoDateString(currentCalendarDate))
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-[#1E8A4C] bg-slate-50/50 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all shadow-xs"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-bold shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {entry.startTime} {entry.endTime ? `- ${entry.endTime}` : ""}
                        </span>
                        {getStatusBadge(entry.status, entry.cancelReason)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {getExerciseName(entry.exerciseId)}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {entry.targetSets ?? 3} เซต × {entry.targetReps ?? 10} ครั้ง | ค้างท่า{" "}
                        {entry.holdSeconds ?? 0} วินาที
                        {entry.notes ? ` • หมายเหตุ: ${entry.notes}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      จัดการรายการ
                    </button>
                  </div>
                </div>
              ))}

            {patientScheduleEntries.filter(
              (e) => e.scheduledDate === toIsoDateString(currentCalendarDate)
            ).length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <CalendarIcon className="w-12 h-12 text-slate-300 mb-2" />
                <span className="text-sm font-bold">ไม่มีรายการฝึกในวันนี้</span>
                <span className="text-xs text-slate-400 mt-1">
                  คลิก &ldquo;กำหนดตารางกายภาพ&rdquo; ด้านบนเพื่อเพิ่มรายการใหม่
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal: กำหนดตารางกายภาพ (Create Schedule Modal) */}
      {/* ---------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    กำหนดตารางกายภาพใหม่
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    คนไข้: {selectedPatient?.firstName} {selectedPatient?.lastName} (HN:{" "}
                    {selectedPatient?.hn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleRule} className="flex flex-col gap-4 mt-4 text-xs">
              {/* ช่วงวันที่ (Date Range) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-start-date" className="font-bold text-slate-700">
                    วันเริ่มต้น <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-start-date"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, startDate: e.target.value }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-medium"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-end-date" className="font-bold text-slate-700">
                    วันสิ้นสุด <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-end-date"
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, endDate: e.target.value }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-medium"
                    required
                  />
                </div>
              </div>

              {/* วันในสัปดาห์ (จ-อา) พร้อมปุ่มเลือกด่วน (เช่น จ–พฤ ท่ากายภาพช่วงเช้า) */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    วันในสัปดาห์ (จันทร์ – อาทิตย์) <span className="text-rose-500">*</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-preset-mon-thu"
                      onClick={() =>
                        setCreateForm((p) => ({ ...p, daysOfWeek: [1, 2, 3, 4] }))
                      }
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-[#1E8A4C] hover:bg-emerald-200 cursor-pointer"
                    >
                      จ–พฤ (ตัวอย่าง)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((p) => ({ ...p, daysOfWeek: [1, 2, 3, 4, 5] }))
                      }
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                    >
                      จ–ศ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((p) => ({ ...p, daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }))
                      }
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                    >
                      ทุกวัน
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mt-1">
                  {THAI_DAY_NAMES.map((d) => {
                    const isSelected = createForm.daysOfWeek.includes(d.dow);
                    return (
                      <button
                        type="button"
                        key={d.dow}
                        id={`btn-dow-${d.dow}`}
                        onClick={() => {
                          setCreateForm((p) => {
                            const cur = new Set(p.daysOfWeek);
                            if (cur.has(d.dow)) cur.delete(d.dow);
                            else cur.add(d.dow);
                            return { ...p, daysOfWeek: Array.from(cur).sort() };
                          });
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-[#1E8A4C] text-white border-[#1E8A4C] shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* เวลาเริ่มต้น และ เวลาสิ้นสุด */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-start-time" className="font-bold text-slate-700">
                    เวลาเริ่มต้น <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-start-time"
                    type="time"
                    value={createForm.startTime}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, startTime: e.target.value }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-mono font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-end-time" className="font-bold text-slate-700">
                    เวลาสิ้นสุด
                  </label>
                  <input
                    id="create-end-time"
                    type="time"
                    value={createForm.endTime}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, endTime: e.target.value }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              {/* เลือกท่ากายภาพ (เฉพาะท่าที่ยังเปิดใช้งาน) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="create-exercise-select" className="font-bold text-slate-700">
                  เลือกท่ากายภาพ <span className="text-rose-500">*</span>
                </label>
                <select
                  id="create-exercise-select"
                  value={createForm.exerciseId}
                  onChange={(e) => {
                    const selectedEx = exercises.find((ex) => ex.id === e.target.value);
                    setCreateForm((p) => ({
                      ...p,
                      exerciseId: e.target.value,
                      targetSets: selectedEx?.sets ?? 3,
                      targetReps: selectedEx?.reps ?? 10,
                    }));
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#1E8A4C] focus:outline-hidden font-bold cursor-pointer"
                  required
                >
                  {exercises
                    .filter((ex) => ex.isActive !== false)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} (ค่ามาตรฐาน: {ex.sets} เซต × {ex.reps} ครั้ง)
                      </option>
                    ))}
                </select>
              </div>

              {/* ปรับเซต / ครั้งเฉพาะคนไข้ได้ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-target-sets" className="font-bold text-slate-700">
                    จำนวนเซต (สำหรับคนไข้นี้)
                  </label>
                  <input
                    id="create-target-sets"
                    type="number"
                    min={1}
                    max={10}
                    value={createForm.targetSets}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, targetSets: Number(e.target.value) }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-target-reps" className="font-bold text-slate-700">
                    จำนวนครั้ง/เซต
                  </label>
                  <input
                    id="create-target-reps"
                    type="number"
                    min={1}
                    max={50}
                    value={createForm.targetReps}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, targetReps: Number(e.target.value) }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="create-hold-seconds" className="font-bold text-slate-700">
                    ค้างท่ากี่วินาที
                  </label>
                  <input
                    id="create-hold-seconds"
                    type="number"
                    min={0}
                    max={120}
                    value={createForm.holdSeconds}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, holdSeconds: Number(e.target.value) }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* หมายเหตุ */}
              <div className="flex flex-col gap-1">
                <label htmlFor="create-notes" className="font-bold text-slate-700">
                  หมายเหตุ / คำแนะนำเฉพาะคนไข้
                </label>
                <input
                  id="create-notes"
                  type="text"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="เช่น ฝึกกำลังกล้ามเนื้อหัวไหล่ช่วงเช้า, ระวังอย่าเกร็งไหล่"
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#1E8A4C] focus:outline-hidden"
                />
              </div>

              {/* พรีวิวรายการที่จะถูกสร้าง (Live Preview) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>พรีวิวรายการที่จะถูกสร้าง</span>
                  <span className="text-[#1E8A4C]">
                    ทั้งหมด {previewDates.length} รายการ
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-1 bg-white rounded-xl border border-slate-200/70">
                  {previewDates.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700"
                    >
                      {formatThaiDate(parseIsoDate(d), { formatStyle: "short" })}
                    </span>
                  ))}
                  {previewDates.length === 0 && (
                    <span className="text-slate-400 text-[11px] p-1">
                      ยังไม่มีรายการ (กรุณาเลือกช่วงวันและวันในสัปดาห์)
                    </span>
                  )}
                </div>
              </div>

              {/* ตรวจสอบเวลาทับซ้อน (Overlap Alert Banner) */}
              {overlapCheckResult.hasOverlap && (
                <div
                  id="banner-overlap-alert"
                  className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 flex items-start gap-2.5 font-medium"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-rose-900">
                      ตรวจพบเวลาทับซ้อนกับนัดหมายเดิม!
                    </span>
                    <span className="text-[11px]">
                      มีรายการเดิมในวันที่ {overlapCheckResult.conflictingDate} เวลา{" "}
                      {overlapCheckResult.conflictingEntry?.startTime} -{" "}
                      {overlapCheckResult.conflictingEntry?.endTime} (
                      {getExerciseName(overlapCheckResult.conflictingEntry?.exerciseId)})
                    </span>
                  </div>
                </div>
              )}

              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {createError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-schedule"
                  disabled={overlapCheckResult.hasOverlap || previewDates.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  บันทึกตารางกายภาพ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal: รายละเอียดรายการ (Entry Action Modal) */}
      {/* ---------------------------------------------------- */}
      {selectedEntry && !isCancelModalOpen && !isEditModalOpen && !isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1E8A4C]" />
                <h3 className="text-base font-bold text-slate-900">
                  รายละเอียดรายการกายภาพ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {getExerciseName(selectedEntry.exerciseId)}
                  </span>
                  {getStatusBadge(selectedEntry.status, selectedEntry.cancelReason)}
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-medium">
                  <span>
                    วันที่:{" "}
                    <strong>
                      {formatThaiDate(parseIsoDate(selectedEntry.scheduledDate), {
                        formatStyle: "medium",
                      })}
                    </strong>
                  </span>
                  <span>
                    เวลา:{" "}
                    <strong>
                      {selectedEntry.startTime} {selectedEntry.endTime ? `- ${selectedEntry.endTime}` : ""}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 mt-1">
                  <span>
                    เป้าหมาย: <strong>{selectedEntry.targetSets ?? 3} เซต × {selectedEntry.targetReps ?? 10} ครั้ง</strong>
                  </span>
                  {selectedEntry.holdSeconds ? (
                    <span>ค้างท่า {selectedEntry.holdSeconds} วินาที</span>
                  ) : null}
                </div>
                {selectedEntry.notes && (
                  <p className="text-slate-500 italic mt-1 bg-white p-2 rounded-xl border border-slate-200/60">
                    หมายเหตุ: {selectedEntry.notes}
                  </p>
                )}
              </div>

              {/* ปุ่มจัดการ */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                {selectedEntry.status === "planned" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-entry-edit"
                      onClick={() => {
                        setEditError(null);
                        setEditScope("single");
                        setEditForm({
                          startTime: selectedEntry.startTime,
                          endTime: selectedEntry.endTime ?? "09:45",
                          targetSets: selectedEntry.targetSets ?? 3,
                          targetReps: selectedEntry.targetReps ?? 10,
                          notes: selectedEntry.notes ?? "",
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>แก้ไขรายการ</span>
                    </button>

                    <button
                      type="button"
                      id="btn-entry-cancel"
                      onClick={() => {
                        setCancelError(null);
                        setCancelReasonSelect("คนไข้ไม่มา");
                        setCancelCustomReason("");
                        setIsCancelModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>ยกเลิกนัดหมาย</span>
                    </button>
                  </div>
                )}

                {/* ลบรายการ (กติกา: อนาคตและยังไม่มีผลการฝึก = ลบจริง มิฉะนั้นห้ามลบ) */}
                {selectedEntry.status !== "completed" && !selectedEntry.completedAt && (
                  <button
                    type="button"
                    id="btn-entry-delete"
                    onClick={() => {
                      setDeleteError(null);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรายการนี้ออกจากตาราง</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal: ยกเลิกรายการพร้อมเหตุผลด่วน (Quick Cancel Modal) */}
      {/* ---------------------------------------------------- */}
      {isCancelModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <h3 className="text-base font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>ยกเลิกรายการนัดหมาย</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-4 text-xs">
              <p className="text-slate-600">
                เลือกเหตุผลด่วนสำหรับการยกเลิกนัดหมายวันที่ {selectedEntry.scheduledDate} (
                {selectedEntry.startTime}):
              </p>

              <div className="flex flex-col gap-2">
                {["คนไข้ไม่มา", "เลื่อนนัด", "ไม่สบาย", "อื่นๆ"].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer font-bold ${
                      cancelReasonSelect === reason
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReasonSelect === reason}
                      onChange={(e) => setCancelReasonSelect(e.target.value)}
                      className="accent-amber-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {cancelReasonSelect === "อื่นๆ" && (
                <input
                  type="text"
                  placeholder="ระบุเหตุผลอื่นๆ..."
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 text-xs mt-1"
                />
              )}

              {cancelError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  {cancelError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  id="btn-confirm-cancel-schedule"
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  ยืนยันการยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal: แก้ไขรายการ (Edit Modal with Scope Prompt) */}
      {/* ---------------------------------------------------- */}
      {isEditModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>แก้ไขรายการตารางกายภาพ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col gap-3.5 mt-4 text-xs">
              {/* ถามผู้ใช้: แก้ไขเฉพาะวันนี้ หรือ ทั้งชุดที่เหลือ (Scope Prompt) */}
              {selectedEntry.ruleId ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col gap-2">
                  <span className="font-bold text-blue-900">
                    รายการนี้ถูกสร้างจากตารางประจำ (Recurring Rule) คุณต้องการแก้ไขขอบเขตใด?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-scope-single"
                      onClick={() => setEditScope("single")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        editScope === "single"
                          ? "bg-white text-blue-800 border-blue-400 shadow-xs"
                          : "bg-blue-100/60 text-blue-700 border-transparent hover:bg-white"
                      }`}
                    >
                      เฉพาะวันนี้
                    </button>
                    <button
                      type="button"
                      id="btn-scope-future"
                      onClick={() => setEditScope("future_series")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        editScope === "future_series"
                          ? "bg-white text-blue-800 border-blue-400 shadow-xs"
                          : "bg-blue-100/60 text-blue-700 border-transparent hover:bg-white"
                      }`}
                    >
                      ทั้งชุดที่เหลือในอนาคต
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-start-time" className="font-bold text-slate-700">
                    เวลาเริ่มต้น
                  </label>
                  <input
                    id="edit-start-time"
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, startTime: e.target.value }))
                    }
                    className="p-2 rounded-xl border border-slate-200 font-mono font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-end-time" className="font-bold text-slate-700">
                    เวลาสิ้นสุด
                  </label>
                  <input
                    id="edit-end-time"
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, endTime: e.target.value }))
                    }
                    className="p-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-target-sets" className="font-bold text-slate-700">
                    จำนวนเซต
                  </label>
                  <input
                    id="edit-target-sets"
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.targetSets}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, targetSets: Number(e.target.value) }))
                    }
                    className="p-2 rounded-xl border border-slate-200 font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-target-reps" className="font-bold text-slate-700">
                    จำนวนครั้ง
                  </label>
                  <input
                    id="edit-target-reps"
                    type="number"
                    min={1}
                    max={50}
                    value={editForm.targetReps}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, targetReps: Number(e.target.value) }))
                    }
                    className="p-2 rounded-xl border border-slate-200 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-notes" className="font-bold text-slate-700">
                  หมายเหตุ
                </label>
                <input
                  id="edit-notes"
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="p-2 rounded-xl border border-slate-200"
                />
              </div>

              {editError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-edit"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal: ยืนยันการลบรายการ (Delete Confirmation Modal) */}
      {/* ---------------------------------------------------- */}
      {isDeleteModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>ยืนยันการลบรายการ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนัดหมายวันที่{" "}
                <strong>{selectedEntry.scheduledDate}</strong> เวลา{" "}
                <strong>{selectedEntry.startTime}</strong> ออกจากตาราง?
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                <span className="font-bold">กติการะบบ:</span> รายการที่ยังไม่มีผลการฝึกจะถูกลบจริง
                แต่หากมีผลการบันทึกแล้ว ระบบจะไม่อนุญาตให้ลบประวัติการรักษา
              </div>

              {deleteError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-schedule-entry"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  ลบรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
