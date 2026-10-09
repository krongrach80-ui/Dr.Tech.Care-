"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { notFound } from "next/navigation";
import { useCamera } from "@/hooks/useCamera";
import {
  createFaceLandmarker,
  createPoseLandmarker,
  getActualDelegate,
  dispose,
  type DelegateType,
} from "@/lib/mediapipe/loader";
import { getFaceEmbedder, EMBEDDING_DIM } from "@/features/face/embedder";
import { calculateHeadPoseFromLandmarks } from "@/lib/mediapipe";
import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

export default function MediaPipeCheckPage() {
  // บล็อกการเข้าถึงใน Production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { videoRef, isStreaming, error: cameraError, restart: restartCamera } = useCamera({
    autoStart: true,
  });

  // สถานะโมเดลและการประมวลผล
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [actualDelegate, setActualDelegate] = useState<DelegateType | null>(null);

  // เมตริก Real-time
  const [fps, setFps] = useState<number>(0);
  const [facesCount, setFacesCount] = useState<number>(0);
  const [yaw, setYaw] = useState<number>(0);
  const [poseLandmarksCount, setPoseLandmarksCount] = useState<number>(0);

  // สถานะการทดสอบ Embedding 128 มิติ
  const [isEmbeddingTesting, setIsEmbeddingTesting] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<{
    length: number;
    sampleValues: string;
    durationMs: number;
    timestamp: string;
  } | null>(null);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // 1. โหลดโมเดลทั้ง FaceLandmarker และ PoseLandmarker
  useEffect(() => {
    let isCancelled = false;

    async function initModels() {
      setIsModelLoading(true);
      setModelLoadError(null);

      try {
        const [faceLandmarker, poseLandmarker] = await Promise.all([
          createFaceLandmarker(),
          createPoseLandmarker("lite"),
        ]);

        if (!isCancelled) {
          faceLandmarkerRef.current = faceLandmarker;
          poseLandmarkerRef.current = poseLandmarker;
          setActualDelegate(getActualDelegate());
          setIsModelLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "ไม่สามารถโหลดโมเดล MediaPipe ได้";
          setModelLoadError(msg);
          setIsModelLoading(false);
        }
      }
    }

    void initModels();

    return () => {
      isCancelled = true;
      dispose();
    };
  }, []);

  // 2. Real-time Detection Loop
  useEffect(() => {
    if (!isStreaming || isModelLoading) return undefined;

    let isRunning = true;
    let animId: number | null = null;

    const loop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const now = performance.now();

      // คำนวณ FPS
      frameCountRef.current++;
      if (now - fpsTimerRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - fpsTimerRef.current)));
        frameCountRef.current = 0;
        fpsTimerRef.current = now;
      }

      if (video && video.readyState >= 2 && !video.paused) {
        const timestamp = performance.now();

        // 2.1 ตรวจจับใบหน้าด้วย FaceLandmarker
        if (faceLandmarkerRef.current) {
          try {
            const faceResult = faceLandmarkerRef.current.detectForVideo(video, timestamp);
            if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
              setFacesCount(faceResult.faceLandmarks.length);
              const firstFace = faceResult.faceLandmarks[0];
              if (firstFace) {
                const pose = calculateHeadPoseFromLandmarks(firstFace);
                setYaw(pose.yaw);
              }
            } else {
              setFacesCount(0);
              setYaw(0);
            }
          } catch {
            // no-op
          }
        }

        // 2.2 ตรวจจับโครงสร้างร่างกายด้วย PoseLandmarker
        if (poseLandmarkerRef.current) {
          try {
            const poseResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
            if (poseResult.landmarks && poseResult.landmarks.length > 0) {
              const firstPose = poseResult.landmarks[0];
              setPoseLandmarksCount(firstPose ? firstPose.length : 0);
            } else {
              setPoseLandmarksCount(0);
            }
          } catch {
            // no-op
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [isStreaming, isModelLoading, videoRef]);

  // 3. ฟังก์ชันทดสอบสกัด Biometric Embedding 128 มิติ
  const handleTestEmbedding = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setEmbeddingError("วิดีโอยังไม่พร้อมสำหรับการประมวลผล");
      return;
    }

    setIsEmbeddingTesting(true);
    setEmbeddingError(null);
    setEmbeddingResult(null);

    const startTime = performance.now();

    try {
      const embedder = getFaceEmbedder();
      // สกัดเวกเตอร์ 128 มิติโดยตรงจากเฟรม ไม่บันทึกหรืออัปโหลดภาพ
      const vector = await embedder.embed(video);
      const durationMs = Math.round(performance.now() - startTime);

      if (vector.length !== EMBEDDING_DIM) {
        throw new Error(`มิติของเวกเตอร์ไม่ถูกต้อง: ได้ ${vector.length} แทนที่จะเป็น ${EMBEDDING_DIM}`);
      }

      const sample = `[${vector.slice(0, 4).map((v) => v.toFixed(4)).join(", ")}, ..., ${vector.slice(-4).map((v) => v.toFixed(4)).join(", ")}]`;

      setEmbeddingResult({
        length: vector.length,
        sampleValues: sample,
        durationMs,
        timestamp: new Date().toLocaleTimeString("th-TH"),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการคำนวณ Embedding";
      setEmbeddingError(message);
    } finally {
      setIsEmbeddingTesting(false);
    }
  }, [videoRef]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
              DEVELOPMENT ONLY
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Dr.Tech.Care — MediaPipe & Face Embedding Diagnostic
            </h1>
            <p className="text-sm text-slate-400">
              หน้าทดสอบความสมบูรณ์ของระบบกล้อง, MediaPipe WASM Local Loader, และ Biometric Embedding
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                actualDelegate === "GPU"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : actualDelegate === "CPU"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${actualDelegate ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
              Delegate: {actualDelegate || "กำลังตรวจสอบ..."}
            </span>
          </div>
        </div>

        {/* Camera and Metrics Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* กล้อง Video Feed */}
          <div className="md:col-span-2 relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Error Overlay ของกล้อง */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center">
                <span className="text-rose-400 text-2xl font-bold mb-2">{cameraError.title}</span>
                <p className="text-sm text-slate-300 mb-2">{cameraError.description}</p>
                <p className="text-xs text-amber-300 mb-4">{cameraError.suggestion}</p>
                <button
                  onClick={() => void restartCamera()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm"
                >
                  ลองเปิดกล้องใหม่
                </button>
              </div>
            )}

            {/* สถานะโหลดโมเดล */}
            {isModelLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-sm font-medium text-emerald-300">
                  กำลังโหลดโมเดล MediaPipe จาก Local WASM...
                </span>
              </div>
            )}

            {/* Error สถานะโหลดโมเดล */}
            {modelLoadError && (
              <div className="absolute inset-0 bg-rose-950/90 p-6 flex flex-col items-center justify-center text-center">
                <span className="text-rose-300 font-bold mb-2">โหลดโมเดลไม่สำเร็จ</span>
                <p className="text-xs text-slate-300">{modelLoadError}</p>
              </div>
            )}

            {/* Overlay FPS Badge */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">FPS:</span>{" "}
              <span className={`font-bold ${fps >= 24 ? "text-emerald-400" : fps >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                {fps}
              </span>
            </div>
          </div>

          {/* รายการ Real-time Telemetry Metrics */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
                Real-time Vision Metrics
              </h2>

              <div>
                <div className="text-xs text-slate-400">Hardware Delegate</div>
                <div className="text-lg font-bold text-white font-mono">
                  {actualDelegate || "None"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">จำนวนใบหน้าที่ตรวจพบ</div>
                <div className={`text-xl font-bold font-mono ${facesCount === 1 ? "text-emerald-400" : facesCount > 1 ? "text-amber-400" : "text-slate-500"}`}>
                  {facesCount} ใบหน้า
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">มุมหันศีรษะ (Yaw)</div>
                <div className="text-xl font-bold text-white font-mono">
                  {yaw > 0 ? `+${yaw}°` : `${yaw}°`}
                  <span className="text-xs text-slate-400 ml-2 font-normal">
                    {Math.abs(yaw) <= 8 ? "(มองตรง)" : yaw < -8 ? "(หันซ้าย)" : "(หันขวา)"}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Pose Landmarks ที่ตรวจพบ</div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  {poseLandmarksCount} / 33 จุด
                </div>
              </div>
            </div>

            {/* ปุ่มทดสอบ Embedding */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">
                Biometric Descriptor Check
              </h2>
              <button
                onClick={() => void handleTestEmbedding()}
                disabled={isEmbeddingTesting || !isStreaming}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition text-sm shadow-lg flex items-center justify-center gap-2"
              >
                {isEmbeddingTesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังสกัดเวกเตอร์...
                  </>
                ) : (
                  "ทดสอบ Biometric Embedding (128-d)"
                )}
              </button>
              <p className="text-[11px] text-slate-400 leading-tight">
                * ระบบประมวลผลเวกเตอร์ในหน่วยความจำเท่านั้น ไม่มีการบันทึกหรืออัปโหลดภาพใดๆ (PDPA Compliance)
              </p>
            </div>

          </div>
        </div>

        {/* กล่องแสดงผลลัพธ์ Biometric Embedding */}
        {embeddingResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300">
                  สกัดเวกเตอร์ชีวมิติสำเร็จ — ขนาด {embeddingResult.length} มิติ
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                เวลาประมวลผล: {embeddingResult.durationMs}ms ({embeddingResult.timestamp})
              </span>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 font-mono text-xs text-emerald-400 overflow-x-auto">
              <code>{embeddingResult.sampleValues}</code>
            </div>
          </div>
        )}

        {/* กล่องแสดงข้อผิดพลาดของ Embedding */}
        {embeddingError && (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 text-sm text-rose-300">
            <span className="font-bold block mb-1">การทดสอบ Embedding ล้มเหลว:</span>
            {embeddingError}
          </div>
        )}

      </div>
    </div>
  );
}
