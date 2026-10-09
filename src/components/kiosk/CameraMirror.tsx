"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw } from "lucide-react";

interface CameraMirrorProps {
  className?: string;
  isScanning?: boolean;
  scanTitle?: string;
  showOverlayGrid?: boolean;
  mirrored?: boolean;
}

export function CameraMirror({
  className = "",
  isScanning = false,
  scanTitle = "กำลังจัดตำแหน่งใบหน้า...",
  showOverlayGrid = true,
  mirrored = true,
}: CameraMirrorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isMounted = true;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("กล้องไม่ได้รับการสนับสนุนบนเบราว์เซอร์นี้");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStreamActive(true);
        setCameraError(null);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "ไม่สามารถเข้าถึงกล้องได้";
        setCameraError(msg);
        setStreamActive(false);
      }
    }

    void initCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-slate-900 border-4 border-[#2FB39A]/30 shadow-2xl flex items-center justify-center ${className}`}
    >
      {/* Video Feed or Simulated Mirror Fallback */}
      {streamActive ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 p-6 text-center">
          {/* Simulated Face Outline for Demonstration / Test Mode */}
          <div className="relative w-48 h-64 border-4 border-dashed border-[#2FB39A]/40 rounded-full flex flex-col items-center justify-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-[#2FB39A]/20 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-[#2FB39A]" />
            </div>
            <span className="text-sm font-semibold text-teal-200">
              {cameraError ? "โหมดจำลองกล้องหน้าตู้" : "กำลังเปิดกล้องสแตนด์บาย..."}
            </span>
          </div>
          {cameraError && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-300 bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-500/30">
              <CameraOff className="w-4 h-4" />
              <span>ภาพจำลอง (สิทธิกล้อง: {cameraError})</span>
            </div>
          )}
        </div>
      )}

      {/* Biometric Scanning Overlay Elements */}
      {showOverlayGrid && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {/* Central Face Target Oval */}
          <div className="relative w-64 h-80 border-2 border-[#2FB39A]/60 rounded-[120px] shadow-[0_0_20px_rgba(47,179,154,0.3)]">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#2FB39A] rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#2FB39A] rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#2FB39A] rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#2FB39A] rounded-br-lg" />

            {/* Scanning Laser Animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#2FB39A] to-transparent shadow-[0_0_12px_#2FB39A] animate-bounce" />
            )}
          </div>

          {/* Subtitle / Status */}
          {scanTitle && (
            <div className="absolute bottom-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-sm font-bold flex items-center gap-2">
              {isScanning && <RefreshCw className="w-4 h-4 animate-spin text-[#2FB39A]" />}
              <span>{scanTitle}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
