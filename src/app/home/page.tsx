"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Calendar,
  ArrowRight,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  X,
  Award,
  Sparkles,
  User,
} from "lucide-react";
import { useKioskStore, type TodayTrainingPlan } from "@/lib/store";
import { maskName, formatThaiDate } from "@/lib/thai";
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
  const {
    patient,
    todayPlans,
    idleTimeoutSeconds,
    logoutAndReset,
  } = useKioskStore();

  // จัดการเวลานับถอยหลัง Idle Auto-Logout (ค่าเริ่มต้น 45 วินาที)
  const [countdown, setCountdown] = useState<number>(idleTimeoutSeconds || 45);
  const [showIdleWarningModal, setShowIdleWarningModal] = useState(false);

  // Modal สถิติและความก้าวหน้า / ตารางวันนี้
  const [activeModal, setActiveModal] = useState<"none" | "schedule" | "progress">("none");

  // รีเซ็ตเวลานับถอยหลังเมื่อผู้ใช้มี Interaction (แตะจอ/คลิก)
  const resetTimer = useCallback(() => {
    setCountdown(idleTimeoutSeconds || 45);
    setShowIdleWarningModal(false);
  }, [idleTimeoutSeconds]);

  // Listener ตรวจจับการแตะหน้าจอของผู้สูงอายุ
  useEffect(() => {
    const handleUserInteraction = () => {
      // ถอยหลังเหลือ <= 10 วิ จะล็อกไว้จนกว่าจะกดปุ่ม "ยังอยู่" หรือแตะจอ
      setCountdown((prev) => (prev <= 10 ? prev : idleTimeoutSeconds || 45));
    };

    window.addEventListener("pointerdown", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, [idleTimeoutSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // หมดเวลา: ปิดกล้อง, ล้าง store+sessionStorage, กลับหน้าแรก /
          logoutAndReset(true);
          return 0;
        }

        const nextVal = prev - 1;
        // เมื่อเหลือ 10 วินาทีสุดท้าย ให้แสดง Modal เตือน “ยังอยู่หรือไม่?”
        if (nextVal <= 10) {
          setShowIdleWarningModal(true);
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [logoutAndReset]);

  // ป้องกันกรณีเข้าหน้านี้โดยไม่มี Patient Data ให้กลับหน้าแรก
  const currentPatient = patient ?? {
    hn: "69-00124",
    firstName: "ประเสริฐ",
    lastName: "รักษ์ดี",
    gender: "male" as const,
    age: 72,
    physioName: "กภ. ปิยะ สมบูรณ์",
    clinicBranch: "คลินิกกายภาพบำบัดฟื้นฟูข้อต่อและกล้ามเนื้อ",
  };

  const maskedName = maskName(currentPatient.firstName, currentPatient.lastName);

  // ค้นหารายการฝึกถัดไปที่พร้อมทำ (status === 'ready' หรือ 'pending')
  const nextPlan = todayPlans.find((p) => p.status === "ready") ?? todayPlans[0];

  const handleStartNextExercise = () => {
    // นำทางไปสู่การฝึกกายภาพบำบัด
    router.push("/?flow=checklist_intro");
  };

  const handleManualLogout = () => {
    logoutAndReset(true);
  };

  return (
    <KioskShell idleTimeoutSeconds={idleTimeoutSeconds} enableIdleGuard={false} showStaffTrigger={false}>
      <div className="flex-1 flex flex-col w-full h-full bg-transparent text-[#0B2B2B] px-5 sm:px-8 py-5 select-none overflow-y-auto">
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
          
          {/* ========================================================================= */}
          {/* 1. ส่วนหัว: ข้อมูลคนไข้ + วันที่ไทย พ.ศ. + ปุ่มออกจากระบบ                  */}
          {/* ========================================================================= */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-[#0B2B2B]/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1E8A4C] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-[#0B2B2B] leading-tight">
                  สวัสดีครับ คุณ{maskedName}
                </span>
                <span className="text-xs text-[#3D5A5A] font-medium">
                  HN: {currentPatient.hn} • อายุ {currentPatient.age} ปี
                </span>
              </div>
            </div>

            {/* ปุ่มออกจากระบบ พร้อมเวลานับถอยหลัง */}
            <button
              type="button"
              onClick={handleManualLogout}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออก ({countdown}s)</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 2. ส่วนเนื้อหาหลัก: ข้อมูลนักกายภาพ และ การ์ดแผนการฝึกวันนี้ (เรียงตามเวลา) */}
          {/* ========================================================================= */}
          <div className="w-full flex flex-col my-auto py-3 gap-3.5">
            
            {/* การ์ดนักกายภาพบำบัดผู้ดูแล */}
            <div className="w-full bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-bold flex-shrink-0">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1E8A4C]">นักกายภาพบำบัดผู้ดูแล</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0B2B2B]">
                  {currentPatient.physioName}
                </span>
                <span className="text-[10px] text-[#527070]">
                  {currentPatient.clinicBranch}
                </span>
              </div>
            </div>

            {/* หัวข้อแผนการฝึกวันนี้ */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2B2B]">
                <Calendar className="w-4 h-4 text-[#1E8A4C]" />
                <span>แผนการฝึกประจำวัน (เรียงตามเวลา)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {clockTimestamp > 0
                  ? formatThaiDate(clockTimestamp, { formatStyle: "short", includeTime: false })
                  : "10 ต.ค. 2569"}
              </span>
            </div>

            {/* รายการการ์ดแผนการฝึกวันนี้ (4 รายการ พร้อม 4 สถานะ: ทำแล้ว / ถึงเวลาแล้ว / รอ / พลาด) */}
            <div className="w-full flex flex-col gap-2.5 max-h-[310px] overflow-y-auto pr-0.5">
              {todayPlans.map((item: TodayTrainingPlan) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                    item.status === "ready"
                      ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/15"
                      : item.status === "done"
                      ? "bg-emerald-50/50 border-emerald-200 opacity-90"
                      : item.status === "missed"
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* เวลา */}
                    <div className="px-2 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-[#0B2B2B] flex-shrink-0 mt-0.5">
                      {item.time}
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-[#0B2B2B] leading-tight">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-[#3D5A5A] mt-0.5">
                        {item.target}
                      </span>
                    </div>
                  </div>

                  {/* ป้ายสถานะ 4 รูปแบบ: ทำแล้ว / ถึงเวลาแล้ว / รอ / พลาด */}
                  <div className="flex-shrink-0 ml-2">
                    {item.status === "ready" && (
                      <span className="text-[11px] font-extrabold text-[#1E8A4C] bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 text-[#1E8A4C]" />
                        <span>ถึงเวลาแล้ว</span>
                      </span>
                    )}

                    {item.status === "done" && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>ทำแล้ว</span>
                      </span>
                    )}

                    {item.status === "pending" && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-xl flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>รอทำ</span>
                      </span>
                    )}

                    {item.status === "missed" && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-xl flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>พลาดรอบนี้</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* 3. ปุ่มหลัก (68-76px) + 2 ปุ่มรอง: "ดูตารางวันนี้" & "ความก้าวหน้า"         */}
            {/* ========================================================================= */}
            <div className="w-full flex flex-col gap-2.5 mt-2">
              
              {/* ปุ่มหลักขนาดใหญ่: เริ่มทำกายภาพ (สูง >= 68-76px) */}
              <BigButton
                variant="strong-primary"
                className="!min-h-[68px] sm:!min-h-[74px] !text-xl shadow-lg"
                onClick={handleStartNextExercise}
                icon={<ArrowRight className="w-6 h-6" />}
              >
                เริ่มทำกายภาพ ({nextPlan ? nextPlan.time : "ทันที"})
              </BigButton>

              {/* 2 ปุ่มรอง: ดูตารางวันนี้ & ความก้าวหน้า (สูง >= 64px) */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveModal("schedule")}
                  className="
                    min-h-[58px] sm:min-h-[64px] px-3 py-2
                    rounded-2xl
                    bg-[#6FD67F] hover:bg-[#5EC76E] active:bg-[#4DB25D]
                    text-[#0B2B2B] font-bold text-xs sm:text-sm
                    shadow-md shadow-[#6FD67F]/20
                    border border-[#4EA85D]/40
                    flex items-center justify-center gap-1.5
                    transition-all active:scale-[0.98]
                    cursor-pointer
                  "
                >
                  <Calendar className="w-4 h-4 text-[#0B2B2B]" />
                  <span>ดูตารางวันนี้</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal("progress")}
                  className="
                    min-h-[58px] sm:min-h-[64px] px-3 py-2
                    rounded-2xl
                    bg-white hover:bg-emerald-50 active:bg-emerald-100
                    text-[#0B2B2B] font-bold text-xs sm:text-sm
                    shadow-md border-2 border-[#1E8A4C]/30
                    flex items-center justify-center gap-1.5
                    transition-all active:scale-[0.98]
                    cursor-pointer
                  "
                >
                  <TrendingUp className="w-4 h-4 text-[#1E8A4C]" />
                  <span>ความก้าวหน้า</span>
                </button>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* 4. ส่วนด้านล่าง: สรุปความปลอดภัยและปุ่มต่อเวลา                             */}
          {/* ========================================================================= */}
          <div className="w-full flex items-center justify-between pt-2 border-t border-[#0B2B2B]/10 text-[11px] text-[#527070] flex-shrink-0">
            <span>ออกจากระบบอัตโนมัติใน {countdown} วินาที</span>
            <button
              type="button"
              onClick={resetTimer}
              className="text-xs font-bold text-[#1E8A4C] hover:underline cursor-pointer bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200"
            >
              + เพิ่มเวลา 45s
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL แจ้งเตือน 10 วินาทีก่อน LOGOUT (“ยังอยู่หรือไม่?”)                   */}
      {/* ========================================================================= */}
      {showIdleWarningModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-[#1E8A4C] flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
              <Clock className="w-9 h-9 animate-pulse" />
            </div>

            <h3 className="text-2xl font-black text-[#0B2B2B]">
              ยังอยู่หรือไม่?
            </h3>

            <p className="text-xs sm:text-sm text-[#3D5A5A] leading-relaxed">
              ไม่มีการแตะหน้าจอเป็นเวลานาน ระบบจะออกจากระบบเพื่อความปลอดภัยใน
            </p>

            {/* เลขนับถอยหลังตัวใหญ่ */}
            <div className="text-4xl font-black text-rose-600 font-mono my-1">
              {countdown} วินาที
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <BigButton
                variant="strong-primary"
                className="!min-h-[64px] !text-lg"
                onClick={resetTimer}
                icon={<CheckCircle2 className="w-6 h-6" />}
              >
                ยังอยู่ (กดเพื่อใช้งานต่อ)
              </BigButton>

              <button
                type="button"
                onClick={handleManualLogout}
                className="w-full py-2.5 text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
              >
                ออกจากระบบทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL ตารางวันนี้ (SCHEDULE MODAL)                                       */}
      {/* ========================================================================= */}
      {activeModal === "schedule" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-[#1E8A4C]/30 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#1E8A4C]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B2B2B]">
                    ตารางการฝึกประจำวัน
                  </h3>
                  <span className="text-[11px] text-[#527070]">
                    คุณ{maskedName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#3D5A5A]">
              จัดโดย: {currentPatient.physioName}
            </p>

            <div className="flex flex-col gap-2">
              {todayPlans.map((plan: TodayTrainingPlan) => (
                <div key={plan.id} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                  <div className="flex justify-between font-bold text-[#0B2B2B]">
                    <span>{plan.time} - {plan.title}</span>
                    <span className="text-[#1E8A4C]">{plan.status === "ready" ? "พร้อมฝึก" : plan.status === "done" ? "ผ่านแล้ว" : "รอนัด"}</span>
                  </div>
                  <p className="text-[11px] text-[#527070] mt-0.5">{plan.target}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="w-full py-2.5 rounded-xl bg-[#1E8A4C] text-white font-bold text-xs cursor-pointer mt-1"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL ความก้าวหน้า (PROGRESS MODAL)                                     */}
      {/* ========================================================================= */}
      {activeModal === "progress" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-[#1E8A4C]/30 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#1E8A4C]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B2B2B]">
                    ความก้าวหน้าการฟื้นฟู
                  </h3>
                  <span className="text-[11px] text-[#527070]">
                    สถิติ 7 วันล่าสุด
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="font-bold text-[#0B2B2B]">คะแนนความถูกต้องเฉลี่ย:</span>
                <span className="font-extrabold text-[#1E8A4C] text-sm">94.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#0B2B2B]">จำนวนครั้งที่ฝึกสำเร็จ:</span>
                <span className="font-bold text-[#0B2B2B]">28 / 30 ครั้ง</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#0B2B2B]">ข้อไหล่ทำมุมได้สูงสุด:</span>
                <span className="font-bold text-[#1E8A4C]">92° (เป้าหมาย 90°)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#3D5A5A]">
              <span className="font-bold text-[#1E8A4C]">ข้อเสนอแนะแพทย์: </span>
              <span>อาการติดขัดบริเวณข้อไหล่ดีขึ้นมาก รักษาจังหวะการฝึกสม่ำเสมออย่างต่อเนื่อง</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="w-full py-2.5 rounded-xl bg-[#1E8A4C] text-white font-bold text-xs cursor-pointer mt-1"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </KioskShell>
  );
}
