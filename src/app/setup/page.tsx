"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Maximize,
  Minimize,
  Sun,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  Tv,
  Eye,
  MousePointerClick,
  Wifi,
} from "lucide-react";
import { BigButton } from "@/components/kiosk/BigButton";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

export default function KioskSetupPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinelLike | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const toggleWakeLock = async () => {
    try {
      if (wakeLockActive && wakeLockSentinel) {
        await wakeLockSentinel.release();
        setWakeLockSentinel(null);
        setWakeLockActive(false);
      } else {
        const nav = navigator as unknown as NavigatorWithWakeLock;
        if (nav.wakeLock?.request) {
          const sentinel = await nav.wakeLock.request("screen");
          setWakeLockSentinel(sentinel);
          setWakeLockActive(true);
        }
      }
    } catch (err) {
      console.warn("Wake lock toggle error:", err);
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen kiosk-aurora-bg text-[#0B2B2B] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-y-auto"
    >
      {/* ส่วนหัว: ปุ่มย้อนกลับ + หัวข้อ */}
      <header className="w-full max-w-xl flex items-center justify-between pb-4 border-b border-[#0B2B2B]/10">
        <Link
          href="/"
          className="min-h-[56px] px-5 py-2.5 rounded-2xl bg-white border-2 border-[#0B2B2B]/20 text-[#0B2B2B] font-bold text-base flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>กลับหน้าแรก</span>
        </Link>
        <div className="flex items-center gap-2 text-[#1E8A4C] font-extrabold text-sm sm:text-base">
          <ShieldCheck className="w-6 h-6" />
          <span>Kiosk Hardening & Setup (4.4)</span>
        </div>
      </header>

      {/* ส่วนเนื้อหาหลัก */}
      <main className="w-full max-w-xl flex flex-col gap-6 my-auto py-6">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0B2B2B] tracking-tight">
            ตั้งค่าระบบหน้าจอ Kiosk
          </h1>
          <p className="text-sm sm:text-base text-[#3D5A5A] mt-1 font-medium">
            เครื่องมือควบคุมความปลอดภัยสำหรับผู้ติดตั้งตู้ (เจ้าหน้าที่เทคนิค)
          </p>
        </div>

        {/* ปุ่มควบคุมหลัก: Fullscreen & Wake Lock (Touch target >= 96px) */}
        <div className="flex flex-col gap-4">
          <BigButton
            variant="primary-blue"
            onClick={toggleFullscreen}
            icon={
              isFullscreen ? (
                <Minimize className="w-8 h-8" />
              ) : (
                <Maximize className="w-8 h-8" />
              )
            }
            subtitle={
              isFullscreen
                ? "หน้าจอกำลังทำงานในโหมดเต็มจอ 1080×1920 (แตะเพื่อออก)"
                : "แตะเพื่อขยายตู้ Kiosk ให้เต็มจอ ไม่เห็นแถบเบราว์เซอร์"
            }
          >
            {isFullscreen ? "ออกจากโหมดเต็มจอ" : "เข้าสู่โหมดเต็มจอ (Fullscreen)"}
          </BigButton>

          <BigButton
            variant="primary-green"
            onClick={toggleWakeLock}
            icon={<Sun className="w-8 h-8" />}
            subtitle={
              wakeLockActive
                ? "หน้าจอถูกล็อกไม่ให้พักหรือดับ (Screen Wake Lock Active)"
                : "แตะเพื่อเปิดระบบป้องกันหน้าจอดับตลอดการใช้งาน"
            }
          >
            {wakeLockActive ? "ปิดระบบป้องกันจอดับ" : "เปิดป้องกันจอดับ (Wake Lock)"}
          </BigButton>
        </div>

        {/* รายการตรวจสอบ Kiosk Hardening 4.4 Checklist */}
        <section
          aria-labelledby="hardening-checklist-heading"
          className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-md flex flex-col gap-3.5"
        >
          <h2
            id="hardening-checklist-heading"
            className="text-lg font-extrabold text-[#0B2B2B] flex items-center gap-2 border-b pb-3 border-slate-100"
          >
            <Tv className="w-5 h-5 text-[#1E8A4C]" />
            <span>สถานะระบบความปลอดภัย Kiosk Hardening</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>ล็อกซูม (Zoom Locked: 1.0)</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>ปิด Context Menu (คลิกขวา)</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>Overscroll None (กันเลื่อนทะลุ)</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>User Select None (กันลากคลุม)</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <MousePointerClick className="w-5 h-5 flex-shrink-0" />
              <span>Touch Target ≥ 96×96px</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-[#1E8A4C] font-bold">
              <Eye className="w-5 h-5 flex-shrink-0" />
              <span>Contrast WCAG AAA สำหรับผู้สูงอายุ</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-[#527070]">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-[#1E8A4C]" />
              <span>การเชื่อมต่อเครือข่าย: {onlineStatus ? "ออนไลน์ปกติ" : "โหมดออฟไลน์"}</span>
            </div>
            <span className="text-[#1E8A4C] font-bold">สัดส่วนจอ 9:16 แนวตั้ง</span>
          </div>
        </section>
      </main>

      {/* ส่วนล่าง: ปุ่มเริ่มใหม่ / กลับสู่โหมดบริการ */}
      <footer className="w-full max-w-xl pt-4">
        <Link
          href="/"
          className="
            w-full min-h-[72px] rounded-2xl
            bg-white border-2 border-[#1E8A4C] text-[#1E8A4C]
            hover:bg-emerald-50 active:bg-emerald-100
            font-black text-xl sm:text-2xl
            flex items-center justify-center gap-3
            shadow-md active:scale-[0.98] transition-all cursor-pointer
          "
        >
          <span>กลับสู่โหมดบริการผู้ป่วย (หน้าแรก)</span>
        </Link>
      </footer>
    </div>
  );
}
