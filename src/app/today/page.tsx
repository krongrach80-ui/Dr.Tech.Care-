"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  ChevronLeft,
  X,
  Activity,
  Info,
} from "lucide-react";
import { useKioskFlowStore, type TodayTrainingPlan } from "@/features/auth/kioskFlow";
import { useKioskRouteGuard } from "@/hooks/useKioskRouteGuard";
import { isExerciseTimeWindowOpen } from "@/lib/timeWindow";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";

const DAYS_OF_WEEK = [
  { key: "mon", label: "จันทร์", short: "จ", dayNum: "12 ต.ค." },
  { key: "tue", label: "อังคาร", short: "อ", dayNum: "13 ต.ค." },
  { key: "wed", label: "พุธ", short: "พ", dayNum: "14 ต.ค." },
  { key: "thu", label: "พฤหัสบดี", short: "พฤ", dayNum: "15 ต.ค." },
  { key: "fri", label: "ศุกร์", short: "ศ", dayNum: "16 ต.ค." },
  { key: "sat", label: "เสาร์", short: "ส", dayNum: "17 ต.ค.", isToday: true },
  { key: "sun", label: "อาทิตย์", short: "อา", dayNum: "18 ต.ค." },
];

export default function PatientTodaySchedulePage() {
  const router = useRouter();

  // 1. Route Guard: ห้ามข้ามขั้นด้วย URL
  const { isAllowed, patient, todayPlans } = useKioskRouteGuard("/today");
  const {
    idleTimeoutSeconds,
    allowAnytimeToday,
    setAllowAnytimeToday,
    updatePlanStatus,
    transitionTo,
    reset,
  } = useKioskFlowStore();

  const [selectedDay, setSelectedDay] = useState<string>("sat"); // เสาร์ คือวันนี้
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TodayTrainingPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAllowed || !patient) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white text-[#0B2B2B]">
        <p className="text-lg font-bold">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  const handleStartExercise = (plan: TodayTrainingPlan) => {
    setSelectedPlanDetail(plan);
  };

  // ดำเนินการฝึกและอัปเดต completed ผ่านเซิร์ฟเวอร์เท่านั้น (/api/schedule/complete)
  const handleCompleteExerciseServer = async (plan: TodayTrainingPlan) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/schedule/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: plan.id,
          repsAchieved: plan.repsTarget,
          durationSeconds: plan.holdSeconds * plan.repsTarget + 10,
          accuracyScore: 95,
        }),
      });

      if (res.ok) {
        updatePlanStatus(plan.id, "done");
        setSelectedPlanDetail(null);
        transitionTo("done");
        router.push("/done");
      }
    } catch (err) {
      console.warn("Failed to complete on server:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullReset = () => {
    reset(true);
  };

  return (
    <KioskShell idleTimeoutSeconds={idleTimeoutSeconds} enableIdleGuard={true} showStaffTrigger={false}>
      <div className="flex-1 flex flex-col w-full h-full bg-transparent text-[#0B2B2B] px-5 sm:px-8 py-5 select-none overflow-y-auto">
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
          
          {/* ========================================================================= */}
          {/* 1. ส่วนหัว: แถบย้อนกลับ + หัวข้อตารางสัปดาห์                                */}
          {/* ========================================================================= */}
          <header className="w-full flex items-center justify-between pb-3 border-b border-[#0B2B2B]/10 flex-shrink-0">
            <Link
              href="/home"
              onClick={() => transitionTo("home")}
              className="px-3.5 py-2 rounded-2xl bg-white border border-[#0B2B2B]/20 text-[#0B2B2B] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#1E8A4C]">
              <Calendar className="w-4 h-4" />
              <span>ตารางกายภาพ (จ–อา)</span>
            </div>

            <button
              type="button"
              onClick={handleFullReset}
              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold active:scale-95 cursor-pointer"
            >
              เริ่มใหม่
            </button>
          </header>

          {/* ========================================================================= */}
          {/* 2. เนื้อหา: แถบเลือกวันในสัปดาห์ + การ์ดท่ากายภาพ                            */}
          {/* ========================================================================= */}
          <main className="w-full flex flex-col my-auto py-2 gap-3">
            
            {/* แถบเลือกวัน 7 วัน (จ–อา) */}
            <nav aria-label="แถบเลือกวันในสัปดาห์" className="w-full grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDay === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDay(d.key)}
                    className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1E8A4C] text-white shadow-md ring-2 ring-[#1E8A4C]/30"
                        : d.isToday
                        ? "bg-emerald-100 text-[#1E8A4C] font-extrabold border border-emerald-300"
                        : "bg-white text-[#3D5A5A] border border-slate-200"
                    }`}
                  >
                    <span className="text-xs font-bold">{d.short}</span>
                    <span className="text-[10px] opacity-90 mt-0.5">{d.dayNum.split(" ")[0]}</span>
                    {d.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* แถบแจ้งโหมดช่วงเวลา & สวิตช์ allow_anytime_today */}
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#1E8A4C] font-bold">
                <Clock className="w-4 h-4" />
                <span>ช่วงเริ่มฝึก: [เริ่ม − 30น., สิ้นสุด + 60น.]</span>
              </div>
              <button
                type="button"
                onClick={() => setAllowAnytimeToday(!allowAnytimeToday)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  allowAnytimeToday
                    ? "bg-[#1E8A4C] text-white"
                    : "bg-white text-slate-700 border border-slate-300"
                }`}
              >
                {allowAnytimeToday ? "อนุญาตตลอดวัน: เปิด" : "โหมดปกติ"}
              </button>
            </div>

            {/* รายการท่ากายภาพประจำวัน (แตะเพื่อดูรายละเอียด) */}
            <div className="w-full flex flex-col gap-2 max-h-[310px] overflow-y-auto pr-0.5">
              {todayPlans.map((item: TodayTrainingPlan) => {
                const windowCheck = isExerciseTimeWindowOpen(
                  item.time,
                  item.endTime,
                  new Date(),
                  { allowAnytimeToday }
                );

                const isDone = item.status === "done";
                const isReady = !isDone && windowCheck.isOpen;

                return (
                  <article
                    key={item.id}
                    onClick={() => handleStartExercise(item)}
                    className={`w-full rounded-2xl p-3.5 border-2 text-left transition-all cursor-pointer active:scale-[0.99] ${
                      isDone
                        ? "bg-emerald-50/70 border-emerald-200 opacity-90"
                        : isReady
                        ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20 hover:border-[#1E8A4C]"
                        : "bg-slate-50 border-slate-200 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-[#1E8A4C]">
                            {item.time} - {item.endTime} น.
                          </span>

                          {isDone ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              ✔ ทำแล้ว
                            </span>
                          ) : isReady ? (
                            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                              ⏳ ถึงเวลา
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                              {windowCheck.reasonTh}
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm sm:text-base font-extrabold text-[#0B2B2B]">
                          {item.title}
                        </h2>
                        <span className="text-[11px] text-[#527070] mt-0.5">
                          แตะเพื่อดูภาพและขั้นตอน (เป้าหมาย: {item.repsTarget} ครั้ง)
                        </span>
                      </div>

                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-[#1E8A4C] flex-shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </main>

          {/* ========================================================================= */}
          {/* 3. ส่วนล่าง: ปุ่มย้อนกลับ และ ปุ่มเริ่มใหม่                                  */}
          {/* ========================================================================= */}
          <footer className="w-full flex items-center gap-3 pt-3 border-t border-[#0B2B2B]/10 flex-shrink-0">
            <Link
              href="/home"
              onClick={() => transitionTo("home")}
              className="
                flex-1 min-h-[58px] rounded-2xl
                bg-white border-2 border-[#0B2B2B]/20 text-[#0B2B2B]
                hover:bg-slate-50 active:bg-slate-100
                font-bold text-sm sm:text-base flex items-center justify-center gap-2
                shadow-sm active:scale-95 transition-all cursor-pointer
              "
            >
              <ChevronLeft className="w-5 h-5" />
              <span>ย้อนกลับ</span>
            </Link>

            <button
              type="button"
              onClick={handleFullReset}
              className="
                flex-1 min-h-[58px] rounded-2xl
                bg-rose-50 border-2 border-rose-300 text-rose-800
                hover:bg-rose-100 active:bg-rose-200
                font-bold text-sm sm:text-base flex items-center justify-center gap-2
                shadow-sm active:scale-95 transition-all cursor-pointer
              "
            >
              <RotateCcw className="w-5 h-5" />
              <span>เริ่มใหม่</span>
            </button>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal รายละเอียดท่ากายภาพ (ภาพ/ขั้นตอน/จำนวนครั้ง)                         */}
      {/* ========================================================================= */}
      {selectedPlanDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border-2 border-emerald-200 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1E8A4C]">รายละเอียดท่ากายภาพ</span>
                <h3 className="text-lg font-black text-[#0B2B2B] leading-snug">
                  {selectedPlanDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanDetail(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ภาพจำลองการฝึก */}
            <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 border-2 border-emerald-200 flex flex-col items-center justify-center text-center p-3">
              <Activity className="w-12 h-12 text-[#1E8A4C] mb-1 animate-pulse" />
              <span className="text-xs font-extrabold text-[#0B2B2B]">
                ภาพจำลองท่าทางกายภาพ
              </span>
              <span className="text-[11px] text-[#3D5A5A]">
                ควบคุมและวิเคราะห์โดย MediaPipe AI ในตัวเครื่อง
              </span>
            </div>

            {/* เป้าหมาย Reps / Sets / Hold */}
            <div className="grid grid-cols-3 gap-2 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 text-center">
              <div>
                <span className="text-[10px] text-[#3D5A5A] block">จำนวนครั้ง</span>
                <span className="text-base font-black text-[#1E8A4C]">{selectedPlanDetail.repsTarget} ครั้ง</span>
              </div>
              <div>
                <span className="text-[10px] text-[#3D5A5A] block">จำนวนเซ็ต</span>
                <span className="text-base font-black text-[#1E8A4C]">{selectedPlanDetail.setsTarget} เซ็ต</span>
              </div>
              <div>
                <span className="text-[10px] text-[#3D5A5A] block">ค้างไว้</span>
                <span className="text-base font-black text-[#1E8A4C]">{selectedPlanDetail.holdSeconds} วินาที</span>
              </div>
            </div>

            {/* ขั้นตอนการฝึก */}
            <div>
              <span className="text-xs font-bold text-[#0B2B2B] block mb-1.5">ขั้นตอนการปฏิบัติ:</span>
              <ol className="list-decimal list-inside text-xs text-[#3D5A5A] space-y-1">
                {selectedPlanDetail.instructions.map((ins, idx) => (
                  <li key={idx} className="leading-relaxed">{ins}</li>
                ))}
              </ol>
            </div>

            {/* ปุ่มเริ่มฝึกหรือบันทึกความสำเร็จ */}
            <div className="flex flex-col gap-2 pt-2">
              <BigButton
                variant="strong-primary"
                onClick={() => handleCompleteExerciseServer(selectedPlanDetail)}
                disabled={isSubmitting}
                className="!min-h-[64px] !text-lg"
                icon={<Play className="w-5 h-5 fill-white" />}
              >
                {isSubmitting ? "กำลังบันทึกผล..." : "เริ่มฝึก / บันทึกผลสำเร็จ"}
              </BigButton>

              <button
                type="button"
                onClick={() => setSelectedPlanDetail(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer text-center"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </KioskShell>
  );
}
