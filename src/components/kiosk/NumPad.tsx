"use client";

import React from "react";
import { Delete, Check, RotateCcw } from "lucide-react";

interface NumPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  onConfirm?: () => void;
  className?: string;
  showConfirm?: boolean;
}

export function NumPad({
  onDigit,
  onBackspace,
  onClear,
  onConfirm,
  className = "",
  showConfirm = true,
}: NumPadProps) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div
      className={`grid grid-cols-3 gap-4 w-full max-w-md mx-auto p-4 bg-white/70 backdrop-blur-sm rounded-[32px] border-2 border-[#1F3A4D]/10 shadow-lg ${className}`}
    >
      {digits.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onDigit(d)}
          className="
            min-h-[96px] min-w-[96px] rounded-2xl
            bg-white hover:bg-zinc-50 active:bg-zinc-200
            text-4xl font-bold text-[#1F3A4D]
            border-2 border-[#1F3A4D]/20 shadow-md
            transition-transform active:scale-95 cursor-pointer
            flex items-center justify-center
          "
        >
          {d}
        </button>
      ))}

      {/* Clear / Cancel Button */}
      <button
        type="button"
        onClick={onClear}
        aria-label="ล้างทั้งหมด"
        className="
          min-h-[96px] min-w-[96px] rounded-2xl
          bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300
          text-[#536E80] text-xl font-bold
          border-2 border-[#1F3A4D]/20 shadow-md
          transition-transform active:scale-95 cursor-pointer
          flex flex-col items-center justify-center gap-1
        "
      >
        <RotateCcw className="w-8 h-8 stroke-[2.5]" />
        <span className="text-sm">ล้าง</span>
      </button>

      {/* 0 Button */}
      <button
        type="button"
        onClick={() => onDigit("0")}
        className="
          min-h-[96px] min-w-[96px] rounded-2xl
          bg-white hover:bg-zinc-50 active:bg-zinc-200
          text-4xl font-bold text-[#1F3A4D]
          border-2 border-[#1F3A4D]/20 shadow-md
          transition-transform active:scale-95 cursor-pointer
          flex items-center justify-center
        "
      >
        0
      </button>

      {/* Backspace Button */}
      <button
        type="button"
        onClick={onBackspace}
        aria-label="ลบตัวเลขล่าสุด"
        className="
          min-h-[96px] min-w-[96px] rounded-2xl
          bg-amber-50 hover:bg-amber-100 active:bg-amber-200
          text-[#C77700] text-xl font-bold
          border-2 border-[#C77700]/30 shadow-md
          transition-transform active:scale-95 cursor-pointer
          flex flex-col items-center justify-center gap-1
        "
      >
        <Delete className="w-8 h-8 stroke-[2.5]" />
        <span className="text-sm">ลบ</span>
      </button>

      {/* Full-width Confirm button if enabled */}
      {showConfirm && onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="
            col-span-3 min-h-[96px] rounded-2xl
            bg-[#2FB39A] hover:bg-[#269984] active:bg-[#208774]
            text-[#1F3A4D] text-3xl font-bold
            border-2 border-[#208774]/30 shadow-lg
            transition-transform active:scale-95 cursor-pointer
            flex items-center justify-center gap-3
          "
        >
          <Check className="w-8 h-8 stroke-[3]" />
          <span>ตกลง</span>
        </button>
      )}
    </div>
  );
}
