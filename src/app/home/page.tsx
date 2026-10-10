"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  Calendar,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useKioskFlowStore, type TodayTrainingPlan } from "@/features/auth/kioskFlow";
import { useKioskRouteGuard } from "@/hooks/useKioskRouteGuard";
import { formatThaiDate } from "@/lib/thai";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";

let cachedClockSnapshot = typeof window !== "undefined" ? Date.now() : 0;

function subscribeClock(callback: () => void) {
  const timer = setInterval(() => {
    cachedClockSnapshot = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(timer);
}

function getClockSnapshot(): number {
  return cachedClockSnapshot;
}

function getClockServerSnapshot(): number {
  return 0;
}

export default function PatientHomePage() {
  const router = useRouter();
  const clockTimestamp = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  
  // 1. Route Guard: ตรวจสอบสถานะการล็อกอิน ห้ามข้ามขั้นด้วย URL
  const { isAllowed, patient, todayPlans } = useKioskRouteGuard("/home");
  const {
    idleTimeoutSeconds,
    setSelectedPlanId,
    transitionTo,
    reset,
  } = useKioskFlowStore();

  // จัดการเวลานับถอยหลัง Idle ในหน้าจอ (30-60s)
  const [countdown, setCountdown] = useState<number>(idleTimeoutSeconds || 45);

  useEffect(() => {
    const handleInteraction = () => {
      setCountdown(idleTimeoutSeconds || 45);
    };

    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          reset(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      clearInterval(timer);
    };
  }, [idleTimeoutSeconds, reset]);

  if (!isAllowed || !patient) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white text-[#0B2B2B]">
        <div className="text-center">
          <p className="text-lg font-bold">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  // ค้นหารายการถัดไปที่ถึงเวลาแล้ว (ready) หรือรายการแรกที่ยังไม่เสร็จ
  const nextReadyPlan = todayPlans.find((p) => p.status === "ready") ?? todayPlans.find((p) => p.status !== "done");

  const handleStartNextPlan = (plan: TodayTrainingPlan) => {
    setSelectedPlanId(plan.id);
    transitionTo("today");
    router.push("/today");
  };

  const handleFullReset = () => {
    reset(true);
  };

  return (
    <KioskShell idleTimeoutSeconds={idleTimeoutSeconds} enableIdleGuard={true} showStaffTrigger={false}>
      <div className="flex-1 flex flex-col w-full h-full bg-transparent text-[#0B2B2B] px-5 sm:px-8 py-5 select-none overflow-y-auto">
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
          
          {/* ========================================================================= */}
          {/* 1. ส่วนหัว: แถบคำทักทาย + HN + ปุ่มเริ่มใหม่                                */}
          {/* ========================================================================= */}
          <header className="w-full flex items-center justify-between pb-3 border-b border-[#0B2B2B]/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-[#1E8A4C] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-lg sm:text-xl font-black text-[#0B2B2B] leading-tight">
                  สวัสดีคุณ{patient.firstName} {patient.lastName}
                </h1>
                <span className="text-xs text-[#3D5A5A] font-semibold">
                  HN: {patient.hn} • อายุ {patient.age} ปี
                </span>
              </div>
            </div>

            {/* ปุ่มเริ่มใหม่ (Restart / Logout) ขนาดใหญ่พร้อมเวลานับถอยหลัง */}
            <button
              type="button"
              onClick={handleFullReset}
              className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="เริ่มใหม่ หรือออกจากระบบ"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>เริ่มใหม่ ({countdown}s)</span>
            </button>
          </header>

          {/* ========================================================================= */}
          {/* 2. ส่วนเนื้อหา: นักกายภาพผู้ดูแล + การ์ดรายการวันนี้                           */}
          {/* ========================================================================= */}
          <main className="w-full flex flex-col my-auto py-3 gap-3.5">
            
            {/* การ์ดนักกายภาพบำบัดผู้ดูแล */}
            <section
              aria-label="ข้อมูลนักกายภาพผู้ดูแล"
              className="w-full bg-white rounded-2xl p-3.5 border-2 border-emerald-100 shadow-sm flex items-center gap-3 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-bold flex-shrink-0">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1E8A4C]">นักกายภาพบำบัดผู้ดูแล</span>
                <span className="text-base sm:text-lg font-black text-[#0B2B2B]">
                  {patient.physioName}
                </span>
                <span className="text-[11px] text-[#527070]">
                  {patient.clinicBranch}
                </span>
              </div>
            </section>

            {/* แถบหัวข้อรายการวันนี้ + วันที่ พ.ศ. */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0B2B2B]">
                <Calendar className="w-4 h-4 text-[#1E8A4C]" />
                <span>รายการวันนี้ (เรียงตามเวลา)</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full">
                {clockTimestamp > 0
                  ? formatThaiDate(clockTimestamp, { formatStyle: "short", includeTime: false })
                  : "10 ต.ค. 2569"}
              </span>
            </div>

            {/* รายการการ์ดขนาดใหญ่ เรียงตามเวลา (4 สถานะ: ✔ ทำแล้ว / ⏳ ถึงเวลา / ⏸ รอ / ✖ พลาด) */}
            <div className="w-full flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-0.5">
              {todayPlans.map((item: TodayTrainingPlan) => {
                const isReady = item.status === "ready";
                const isDone = item.status === "done";
                const isMissed = item.status === "missed";
                const isPending = item.status === "pending";

                return (
                  <article
                    key={item.id}
                    className={`w-full rounded-2xl p-3.5 border-2 text-left transition-all ${
                      isReady
                        ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20"
                        : isDone
                        ? "bg-emerald-50/70 border-emerald-200"
                        : isMissed
                        ? "bg-rose-50/70 border-rose-200"
                        : "bg-slate-50 border-slate-200 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-[#1E8A4C] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.time} - {item.endTime} น.</span>
                          </span>

                          {/* สถานะ 4 ชนิดตามข้อกำหนด */}
                          {isDone && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>✔ ทำแล้ว</span>
                            </span>
                          )}
                          {isReady && (
                            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                              <span>⏳ ถึงเวลา</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                              <span>⏸ รอ</span>
                            </span>
                          )}
                          {isMissed && (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              <span>✖ พลาด</span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-base font-extrabold text-[#0B2B2B] leading-snug">
                          {item.title}
                        </h2>
                        <p className="text-xs text-[#3D5A5A] mt-0.5">
                          เป้าหมาย: {item.target}
                        </p>
                      </div>

                      {/* ปุ่มเริ่มฝึกสำหรับการ์ดที่ถึงเวลา */}
                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleStartNextPlan(item)}
                          className="px-3.5 py-2 rounded-xl bg-[#1E8A4C] text-white hover:bg-[#17733E] text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer flex-shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>ฝึกเลย</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ปุ่มเริ่มเลย สำหรับรายการถัดไป (Touch target >= 96px, กฎ Contrast เขียว-น้ำเงิน) */}
            {nextReadyPlan && (
              <BigButton
                variant="strong-primary"
                onClick={() => handleStartNextPlan(nextReadyPlan)}
                icon={<Play className="w-8 h-8 fill-white" />}
                subtitle={`เริ่มฝึก: ${nextReadyPlan.title}`}
                className="!min-h-[88px]"
              >
                เริ่มเลย (รายการถัดไป)
              </BigButton>
            )}

            {/* ปุ่มดูตารางทั้งสัปดาห์ (จ–อา) นำไปสู่ /today */}
            <Link
              href="/today"
              onClick={() => transitionTo("today")}
              className="
                w-full min-h-[64px] px-5 py-3 rounded-2xl
                bg-white hover:bg-slate-50 border-2 border-[#1E8A4C]/30
                text-[#0B2B2B] font-extrabold text-base
                flex items-center justify-between shadow-sm
                active:scale-[0.98] transition-all cursor-pointer
              "
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#1E8A4C]" />
                <span>ดูตารางการฝึกทั้งสัปดาห์ (จ–อา)</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#1E8A4C]" />
            </Link>
          </main>

          {/* ========================================================================= */}
          {/* 3. ส่วนล่าง: ปุ่มย้อนกลับ และ ปุ่มเริ่มใหม่                                  */}
          {/* ========================================================================= */}
          <footer className="w-full flex items-center gap-3 pt-3 border-t border-[#0B2B2B]/10 flex-shrink-0">
            <button
              type="button"
              onClick={handleFullReset}
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
            </button>

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
    </KioskShell>
  );
}
