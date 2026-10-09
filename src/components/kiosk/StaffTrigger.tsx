"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

interface StaffTriggerProps {
  holdDurationMs?: number;
  className?: string;
}

export function StaffTrigger({
  holdDurationMs = 1500,
  className = "",
}: StaffTriggerProps) {
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearHold = useCallback(() => {
    setHolding(false);
    setProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setHolding(true);
    startTimeRef.current = performance.now();

    const updateProgress = () => {
      if (startTimeRef.current === null) return;
      const elapsed = performance.now() - startTimeRef.current;
      const ratio = Math.min(1, elapsed / holdDurationMs);
      setProgress(ratio * 100);

      if (ratio < 1) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    timerRef.current = setTimeout(() => {
      clearHold();
      router.push("/staff/login");
    }, holdDurationMs);
  };

  useEffect(() => {
    return () => {
      clearHold();
    };
  }, [clearHold]);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        aria-label="สำหรับบุคลากร กดค้าง 1.5 วินาที"
        className="
          relative overflow-hidden
          px-4 py-2.5 rounded-full
          bg-white/80 hover:bg-white text-[#1F3A4D]
          border border-[#1F3A4D]/20 shadow-sm
          text-sm font-medium flex items-center gap-2
          cursor-pointer select-none touch-none
          active:scale-95 transition-transform
        "
      >
        <Lock className="w-4 h-4 text-[#1F3A4D]/70" />
        <span className="text-sm font-medium">สำหรับบุคลากร</span>

        {/* Progress Fill bar when holding */}
        {holding && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-[#3F7FD0] transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        )}
      </button>

      {/* Floating Tooltip when holding */}
      {holding && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1F3A4D] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
          กดค้างไว้เพื่อเข้าสู่ระบบเจ้าหน้าที่ ({Math.round(progress)}%)
        </div>
      )}
    </div>
  );
}
