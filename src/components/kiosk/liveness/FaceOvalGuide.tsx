"use client";

import React from "react";
import { Eye, RefreshCw, Sparkles } from "lucide-react";
import { LivenessPose } from "@/lib/biometrics";

interface FaceOvalGuideProps {
  currentStepNumber: 1 | 2 | 3;
  totalSteps?: number;
  currentPose: LivenessPose;
  currentYaw: number;
  isScanning: boolean;
  instructionText: string;
}

export function FaceOvalGuide({
  currentStepNumber,
  totalSteps = 3,
  currentPose,
  currentYaw,
  isScanning,
  instructionText,
}: FaceOvalGuideProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      {/* 1. ป้ายระบุขั้นตอนและสถานะการหันด้านบน */}
      <div className="absolute top-12 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#6FD67F]/40 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg">
        <Eye className="w-4 h-4 text-[#6FD67F]" />
        <span>
          ขั้นตอนที่ {currentStepNumber}/{totalSteps}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-300 font-mono">
          มุมศีรษะ: {currentYaw > 0 ? `+${currentYaw}` : currentYaw}°
        </span>
      </div>

      {/* 2. กรอบรูปไข่นำทางสำหรับจัดตำแหน่งใบหน้า (Oval Guide Frame) */}
      <div className="relative w-56 sm:w-64 h-72 sm:h-80 border-2 border-[#6FD67F]/80 rounded-[130px] shadow-[0_0_30px_rgba(111,214,127,0.35)] flex items-center justify-center">
        {/* มาร์กเกอร์ 4 มุมของกรอบ */}
        <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-[#6FD67F] rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-[#6FD67F] rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-[#6FD67F] rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-[#6FD67F] rounded-br-xl" />

        {/* แอนิเมชันเลเซอร์สแกนใบหน้า */}
        {isScanning && (
          <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-[#6FD67F] to-transparent shadow-[0_0_14px_#6FD67F] animate-bounce" />
        )}

        {/* ลูกศรนำทางทิศทางการหันศีรษะ */}
        {currentPose === "left" && (
          <div className="absolute -left-10 bg-[#1E8A4C] text-white px-2 py-1 rounded-full text-xs font-extrabold animate-pulse shadow flex items-center gap-1">
            <span>👈 หันซ้าย</span>
          </div>
        )}
        {currentPose === "right" && (
          <div className="absolute -right-10 bg-[#1E8A4C] text-white px-2 py-1 rounded-full text-xs font-extrabold animate-pulse shadow flex items-center gap-1">
            <span>หันขวา 👉</span>
          </div>
        )}
      </div>

      {/* 3. ป้ายคำแนะนำแบบเรียลไทม์ตัวใหญ่ด้านล่างกรอบ */}
      <div className="absolute bottom-4 px-5 py-2.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-sm sm:text-base font-extrabold flex items-center gap-2.5 shadow-xl max-w-[90%] text-center">
        {isScanning ? (
          <RefreshCw className="w-4 h-4 animate-spin text-[#6FD67F] flex-shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-[#6FD67F] flex-shrink-0" />
        )}
        <span>{instructionText}</span>
      </div>
    </div>
  );
}
