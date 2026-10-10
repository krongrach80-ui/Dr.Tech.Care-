"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  LogOut,
  RotateCcw,
  ChevronLeft,
  Heart,
} from "lucide-react";
import { useKioskFlowStore } from "@/features/auth/kioskFlow";
import { useKioskRouteGuard } from "@/hooks/useKioskRouteGuard";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";

export default function SessionDonePage() {

  // 1. Route Guard: ห้ามข้ามขั้นด้วย URL
  const { isAllowed, patient, todayPlans } = useKioskRouteGuard("/done");
  const {
    postSessionLogoutSeconds,
    idleTimeoutSeconds,
    transitionTo,
    reset,
  } = useKioskFlowStore();

  const [countdown, setCountdown] = useState<number>(postSessionLogoutSeconds || 15);

  useEffect(() => {
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

    return () => clearInterval(timer);
  }, [reset]);

  if (!isAllowed || !patient) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white text-[#0B2B2B]">
        <p className="text-lg font-bold">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  const completedCount = todayPlans.filter((p) => p.status === "done").length;
  const totalCount = todayPlans.length;

  const handleManualLogout = () => {
    reset(true);
  };

  return (
    <KioskShell idleTimeoutSeconds={idleTimeoutSeconds} enableIdleGuard={false} showStaffTrigger={false}>
      <div className="flex-1 flex flex-col w-full h-full bg-transparent text-[#0B2B2B] px-5 sm:px-8 py-6 select-none overflow-y-auto">
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
          
          {/* ========================================================================= */}
          {/* 1. ส่วนหัว: แถบสถานะสรุปผลการฝึก                                           */}
          {/* ========================================================================= */}
          <header className="w-full flex items-center justify-between pb-3 border-b border-[#0B2B2B]/10 flex-shrink-0">
            <span className="text-xs font-bold text-[#1E8A4C]">สรุปผลการฝึกประจำวัน</span>
            <span className="text-xs font-extrabold text-[#3D5A5A]">
              คุณ{patient.firstName} {patient.lastName}
            </span>
          </header>

          {/* ========================================================================= */}
          {/* 2. เนื้อหา: สรุปความก้าวหน้า + คำแนะนำ + ตัวนับถอยหลัง                      */}
          {/* ========================================================================= */}
          <main className="w-full flex flex-col items-center text-center my-auto py-4 gap-4">
            
            {/* ไอคอนเหรียญรางวัล */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-[#1E8A4C] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Award className="w-12 h-12 stroke-[2.2]" />
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B2B2B]">
                ยอดเยี่ยมมากครับ!
              </h1>
              <p className="text-xs sm:text-sm text-[#3D5A5A] font-medium">
                ท่านได้ฝึกกายภาพบำบัดประจำวันเรียบร้อยแล้ว
              </p>
            </div>

            {/* การ์ดสถิติการฝึกวันนี้ */}
            <section
              aria-label="สถิติการฝึกประจำวัน"
              className="w-full bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-200/80 shadow-md flex flex-col gap-3 text-left"
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
                <span className="text-xs font-bold text-[#3D5A5A]">ความสำเร็จวันนี้</span>
                <span className="text-base font-black text-[#1E8A4C]">
                  {completedCount} จาก {totalCount} รายการ
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-[#1E8A4C] transition-all duration-500"
                  style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs text-[#3D5A5A] font-medium">
                <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>กล้ามเนื้อและข้อต่อของท่านได้รับการฟื้นฟูอย่างมีประสิทธิภาพ</span>
              </div>
            </section>

            {/* ข้อความแจ้งเตือนออกจากระบบอัตโนมัติ */}
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl py-2.5 px-4 text-center">
              <span className="text-xs sm:text-sm font-bold text-[#1E8A4C]">
                ระบบจะออกจากระบบอัตโนมัติใน{" "}
                <span className="text-base font-black text-rose-600">{countdown}</span>{" "}
                วินาที
              </span>
            </div>

            {/* ปุ่มออกเลย (Touch target >= 96px, กฎ Contrast เขียว-น้ำเงิน) */}
            <div className="w-full flex flex-col gap-2.5">
              <BigButton
                variant="strong-primary"
                onClick={handleManualLogout}
                icon={<LogOut className="w-7 h-7 stroke-[2.5]" />}
                subtitle="สัมผัสเพื่อออกจากระบบทันที ไม่ต้องรอเวลานับถอยหลัง"
              >
                ออกเลย (เสร็จสิ้น)
              </BigButton>
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
              onClick={handleManualLogout}
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
