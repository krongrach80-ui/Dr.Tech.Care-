"use client";

import React, { useEffect } from "react";
import { StaffTrigger } from "./StaffTrigger";
import { IdleGuard } from "./IdleGuard";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

interface KioskShellProps {
  children: React.ReactNode;
  showStaffTrigger?: boolean;
  enableIdleGuard?: boolean;
  idleTimeoutSeconds?: number;
  className?: string;
}

export function KioskShell({
  children,
  showStaffTrigger = true,
  enableIdleGuard = true,
  idleTimeoutSeconds = 45,
  className = "",
}: KioskShellProps) {
  // Screen Wake Lock API เพื่อป้องกันตู้ Kiosk พักหน้าจอ
  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinelLike | null = null;

    async function requestWakeLock() {
      try {
        const nav = navigator as unknown as NavigatorWithWakeLock;
        if (nav.wakeLock?.request) {
          wakeLockSentinel = await nav.wakeLock.request("screen");
        }
      } catch (err) {
        // บางเบราว์เซอร์หรือสถานะที่ไม่มี user gesture อาจไม่อนุญาต wake lock ชั่วคราว
        console.warn("Wake lock request ignored:", err);
      }
    }

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="w-full h-full min-h-screen bg-slate-900 flex items-center justify-center overflow-hidden select-none"
    >
      {/* 9:16 Kiosk Frame (Scales to viewport height on desktop, 1080x1920 on vertical Kiosk) */}
      <div
        className={`
          relative h-[94vh] max-h-[1920px] w-auto aspect-[9/16] max-w-[100vw]
          bg-[linear-gradient(180deg,#E8F8F1_0%,#FFFFFF_50%,#E4F0FC_100%)]
          shadow-2xl overflow-hidden flex flex-col justify-between rounded-[32px] border-4 border-slate-700/60
          ${className}
        `}
      >
        {/* Main Content Area */}
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col relative">
          {children}
        </div>

        {/* Staff Button at bottom corner */}
        {showStaffTrigger && (
          <div className="absolute bottom-4 right-4 z-30">
            <StaffTrigger />
          </div>
        )}

        {/* Idle Timeout Guard */}
        {enableIdleGuard && (
          <IdleGuard idleTimeoutSeconds={idleTimeoutSeconds} />
        )}
      </div>
    </div>
  );
}
