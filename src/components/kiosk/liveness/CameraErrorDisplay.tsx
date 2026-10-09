"use client";

import React from "react";
import {
  CameraOff,
  ShieldAlert,
  SunMedium,
  Users,
  Activity,
  Clock,
  WifiOff,
  AlertCircle,
  RefreshCw,
  XCircle,
  Sparkles,
} from "lucide-react";
import { CameraErrorInfo, CameraErrorCategory } from "@/lib/biometrics";

interface CameraErrorDisplayProps {
  error: CameraErrorInfo;
  isRetrying?: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onSimulate?: () => void;
}

function getErrorIcon(category: CameraErrorCategory) {
  switch (category) {
    case "permission_denied":
      return <ShieldAlert className="w-10 h-10 text-rose-400" />;
    case "low_light":
      return <SunMedium className="w-10 h-10 text-amber-400" />;
    case "multiple_faces":
      return <Users className="w-10 h-10 text-rose-400" />;
    case "too_fast":
      return <Activity className="w-10 h-10 text-amber-400" />;
    case "timeout":
      return <Clock className="w-10 h-10 text-amber-400" />;
    case "network_error":
      return <WifiOff className="w-10 h-10 text-rose-400" />;
    case "not_found":
    case "busy":
    default:
      return <CameraOff className="w-10 h-10 text-amber-400" />;
  }
}

export function CameraErrorDisplay({
  error,
  isRetrying = false,
  onRetry,
  onCancel,
  onSimulate,
}: CameraErrorDisplayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 text-center z-30 animate-in zoom-in-95 duration-200">
      {/* 1. ไอคอนสถานะแจ้งเตือน */}
      <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-xl backdrop-blur-md">
        {getErrorIcon(error.category)}
      </div>

      {/* 2. หัวข้อข้อผิดพลาดภาษาไทย */}
      <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5 tracking-tight">
        {error.title}
      </h3>

      {/* 3. คำอธิบายรายละเอียด */}
      <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-4 leading-relaxed font-medium">
        {error.description}
      </p>

      {/* 4. กล่องคำแนะนำการแก้ไขที่เป็นมิตร */}
      <div className="w-full max-w-sm bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3.5 text-xs text-amber-200 mb-6 text-left shadow-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block text-amber-300 mb-0.5">คำแนะนำ:</span>
            <span>{error.suggestion}</span>
          </div>
        </div>
      </div>

      {/* 5. ปุ่มแอ็กชันขนาดใหญ่ 2 ปุ่ม: "ลองใหม่" และ "ยกเลิก" */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* ปุ่มลองใหม่ */}
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="
            w-full min-h-[58px] sm:min-h-[64px] px-6 py-3
            rounded-2xl
            bg-[#1E8A4C] hover:bg-[#17733E] active:bg-[#125C31]
            text-white font-extrabold text-base sm:text-lg
            shadow-lg shadow-[#1E8A4C]/30
            border border-[#6FD67F]/40
            flex items-center justify-center gap-2.5
            transition-all duration-150 active:scale-[0.98]
            cursor-pointer
          "
        >
          <RefreshCw className={`w-5 h-5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "กำลังเชื่อมต่อใหม่..." : "ลองใหม่อีกครั้ง"}</span>
        </button>

        {/* ปุ่มยกเลิก (กลับไปหน้าก่อนหน้า) */}
        <button
          type="button"
          onClick={onCancel}
          className="
            w-full min-h-[52px] sm:min-h-[56px] px-6 py-2.5
            rounded-2xl
            bg-white hover:bg-slate-100 active:bg-slate-200
            text-[#0B2B2B] font-bold text-sm sm:text-base
            shadow-md border border-slate-300
            flex items-center justify-center gap-2
            transition-all duration-150 active:scale-[0.98]
            cursor-pointer
          "
        >
          <XCircle className="w-4 h-4 text-slate-600" />
          <span>ยกเลิก (กลับหน้าก่อนหน้า)</span>
        </button>

        {/* ปุ่มสำรองสำหรับโหมดจำลอง (Simulated Mode) */}
        {onSimulate && (
          <button
            type="button"
            onClick={onSimulate}
            className="mt-1 text-xs text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ใช้โหมดจำลองเพื่อทดสอบระบบ</span>
          </button>
        )}
      </div>
    </div>
  );
}
