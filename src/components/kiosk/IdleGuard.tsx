"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { BigButton } from "./BigButton";
import { resetKioskState } from "@/lib/kiosk";

interface IdleGuardProps {
  idleTimeoutSeconds?: number;
  warningSeconds?: number;
  onLogout?: () => void;
  enabled?: boolean;
}

export function IdleGuard({
  idleTimeoutSeconds = 45,
  warningSeconds = 10,
  onLogout,
  enabled = true,
}: IdleGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningSeconds);

  const lastActivityTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = useCallback(() => {
    setShowWarning(false);
    if (onLogout) {
      onLogout();
    }
    // สเปกข้อ 9: เรียก resetKioskState() ตัวเดียวเพื่อล้างทรัพยากรทั้งหมด
    resetKioskState({ redirectToHome: true });
  }, [onLogout]);

  const stayActive = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setShowWarning(false);
    setCountdown(warningSeconds);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [warningSeconds]);

  useEffect(() => {
    if (!enabled) return;

    lastActivityTimeRef.current = Date.now();

    const handleUserInteraction = () => {
      lastActivityTimeRef.current = Date.now();
    };

    const events = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"];
    events.forEach((event) =>
      window.addEventListener(event, handleUserInteraction, { passive: true })
    );

    const checkInterval = setInterval(() => {
      const idleDurationSeconds = (Date.now() - lastActivityTimeRef.current) / 1000;
      const warningThreshold = idleTimeoutSeconds - warningSeconds;

      if (idleDurationSeconds >= idleTimeoutSeconds) {
        clearInterval(checkInterval);
        performLogout();
      } else if (idleDurationSeconds >= warningThreshold) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil(idleTimeoutSeconds - idleDurationSeconds));
        setCountdown(remaining);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleUserInteraction)
      );
      clearInterval(checkInterval);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [enabled, idleTimeoutSeconds, warningSeconds, performLogout]);

  if (!showWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-8 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white rounded-[32px] p-10 shadow-2xl border-4 border-[#3F7FD0] text-center flex flex-col items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-[#E4F0FC] text-[#3F7FD0] flex items-center justify-center">
          <AlertCircle className="w-16 h-16 stroke-[2.5]" />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold text-[#1F3A4D]">คุณยังอยู่หน้าจอหรือไม่?</h2>
          <p className="text-2xl text-[#536E80]">
            ระบบจะออกจากระบบอัตโนมัติในอีก
          </p>
          <div className="text-6xl font-black text-[#C0392B] my-2">
            {countdown} วินาที
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <BigButton
            variant="primary-green"
            onClick={stayActive}
          >
            ฉันยังอยู่
          </BigButton>
          <BigButton
            variant="ghost"
            onClick={performLogout}
          >
            ออกจากระบบเลย
          </BigButton>
        </div>
      </div>
    </div>
  );
}
