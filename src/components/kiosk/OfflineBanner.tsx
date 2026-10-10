"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/heartbeat", { cache: "no-store" });
      if (res.ok) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-amber-500 text-[#0B2B2B] px-4 py-2.5 flex items-center justify-between shadow-md z-40 text-xs sm:text-sm font-bold border-b border-amber-600/30"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-[#0B2B2B] flex-shrink-0" />
        <span>ตู้กำลังทำงานในโหมดออฟไลน์ (เชื่อมต่อเครือข่ายไม่ได้) — ยังสามารถใช้งานเบื้องต้นได้</span>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isChecking}
        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-60"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
        <span>ลองใหม่</span>
      </button>
    </div>
  );
}
