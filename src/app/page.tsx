"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  Activity,
  ShieldCheck,
  Wifi,
  WifiOff,
  UserCheck,
  UserPlus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  HeartPulse,
  Brain,
  Award,
  RefreshCw,
  QrCode,
  Hand,
  Clock,
  ArrowRight,
} from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";
import { ThaiKeyboard } from "@/components/kiosk/ThaiKeyboard";
import { NumPad } from "@/components/kiosk/NumPad";
import { CameraMirror } from "@/components/kiosk/CameraMirror";
import { formatThaiDate, maskName } from "@/lib/thai";
import { resetKioskState } from "@/lib/kiosk";
import thMessages from "@/messages/th.json";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

let cachedClockSnapshot = typeof window !== "undefined" ? Date.now() : 0;

function subscribeClock(callback: () => void) {
  const timer = setInterval(() => {
    cachedClockSnapshot = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(timer);
}

function getClockSnapshot() {
  return cachedClockSnapshot;
}

function getClockServerSnapshot() {
  return 0;
}

export type KioskFlowState =
  | "idle" // 1. หน้าจอพักเครื่อง (โลโก้ตรงกลาง)
  | "check_account" // 2. ตรวจสอบบัญชี ("ไม่มี" / "มี")
  | "register_consent" // 3A. ผู้ป่วยใหม่: ความยินยอม PDPA
  | "register_face_scan" // 3A. สแกนใบหน้าลงทะเบียน (มองตรง -> หันซ้าย -> หันขวา)
  | "register_form" // 3A. กรอกข้อมูล (หน้าตู้ / หลังบ้าน)
  | "register_success" // 3A. สมัครสำเร็จ -> กลับหน้าแรก
  | "login_face_scan" // 3B. ผู้ป่วยเก่า: สแกนใบหน้าเข้าสู่ระบบ
  | "login_confirm" // 3B. ยืนยันข้อมูลชื่อ-นามสกุล
  | "login_success" // 3B. ล็อกอินสำเร็จ
  | "verify_daily_tasks" // 4. ตรวจสอบภารกิจประจำวัน
  | "no_task" // 4. วันนี้ไม่มีนัดหมาย
  | "checklist_intro" // 5. หน้า Checklist ค้าง 5 วิ ก่อนเข้าภารกิจ 1
  | "mission_exercise" // 6. ภารกิจที่ 1: กายภาพบำบัด
  | "checklist_mid" // 7. กลับมา Checklist ติ๊ก ✔️ ข้อ 1 ค้าง 3 วิ
  | "mission_quiz" // 8. ภารกิจที่ 2: เล่นมินิเกมฝึกสมอง
  | "checklist_done" // 9. กลับมา Checklist ติ๊ก ✔️ ข้อ 2
  | "completion"; // 10. สิ้นสุดภารกิจประจำวัน (สรุปผล + คำแนะนำแพทย์)

export default function KioskPage() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const clockTimestamp = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);

  const [state, setState] = useState<KioskFlowState>("idle");

  // Registration Form State
  const [regChannel, setRegChannel] = useState<"kiosk" | "admin">("kiosk");
  const [regFirstName, setRegFirstName] = useState("สมพร");
  const [regLastName, setRegLastName] = useState("เจริญสุข");
  const [regAge, setRegAge] = useState("68");
  const [activeInput, setActiveInput] = useState<"none" | "firstName" | "lastName" | "age">("none");

  // Face Scan Challenge Step
  const [faceChallengeStep, setFaceChallengeStep] = useState<"center" | "left" | "right">("center");

  // Daily Exercise Simulation State
  const [exerciseReps, setExerciseReps] = useState(0);
  const targetReps = 5;

  // Daily Quiz Simulation State
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);

  // Auto-advance Timer Counter
  const [countdown, setCountdown] = useState<number>(0);

  // Reset to Idle
  const handleFullReset = () => {
    setState("idle");
    setCountdown(0);
    setExerciseReps(0);
    setSelectedQuizAnswer(null);
    setFaceChallengeStep("center");
    resetKioskState({ redirectToHome: false });
  };

  const transitionTo = (nextState: KioskFlowState) => {
    setState(nextState);
    if (nextState === "checklist_intro") setCountdown(5);
    else if (nextState === "checklist_mid") setCountdown(3);
    else if (nextState === "register_success") setCountdown(3);
    else if (nextState === "no_task") setCountdown(5);
    else if (nextState === "completion") setCountdown(10);
    else setCountdown(0);
  };

  // Auto-advance countdown interval
  useEffect(() => {
    if (countdown <= 0) return undefined;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (state === "checklist_intro") {
            transitionTo("mission_exercise");
          } else if (state === "checklist_mid") {
            transitionTo("mission_quiz");
          } else if (state === "register_success") {
            transitionTo("check_account");
          } else if (state === "no_task" || state === "completion") {
            handleFullReset();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, countdown]);

  return (
    <KioskShell idleTimeoutSeconds={60} enableIdleGuard={state !== "idle"}>
      <div className="flex-1 flex flex-col justify-between p-8 text-[#1F3A4D] h-full relative">
        {/* TOP STATUS BAR (Visible across all active screens) */}
        <header
          className={`w-full flex items-center justify-between border-b-2 border-[#1F3A4D]/10 pb-4 transition-all duration-700 ${
            state === "idle" ? "opacity-40" : "opacity-100"
          }`}
        >
          {/* Logo & Hospital Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#2FB39A] flex items-center justify-center shadow-md">
              <Activity className="w-10 h-10 text-[#1F3A4D] stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1F3A4D] leading-tight">
                {thMessages.app.name}
              </h1>
              <p className="text-base font-semibold text-[#536E80]">
                ศูนย์กายภาพบำบัดอัจฉริยะ (Smart Kiosk)
              </p>
            </div>
          </div>

          {/* Clock & Realtime Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Sync</span>
            </div>

            <div className="flex items-center gap-2 bg-white/80 px-4 py-1.5 rounded-full border border-[#1F3A4D]/10 text-base font-semibold">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-[#1E8C78]" />
                  <span className="text-[#1E8C78]">ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-[#C0392B]" />
                  <span className="text-[#C0392B]">ออฟไลน์</span>
                </>
              )}
            </div>

            <div className="text-xl font-bold text-[#1F3A4D]">
              {clockTimestamp > 0 && formatThaiDate(clockTimestamp, { formatStyle: "short", includeTime: true })}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* 1. หน้าจอพักเครื่อง (IDLE STATE)                               */}
        {/* ------------------------------------------------------------- */}
        {state === "idle" && (
          <main className="flex-1 flex flex-col items-center justify-center my-auto text-center gap-10 animate-in fade-in duration-700">
            {/* Center Logo with Gentle Pulsing Aura */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-72 h-72 rounded-full bg-[#2FB39A]/20 animate-ping opacity-50" />
              <div className="relative w-64 h-64 rounded-[48px] bg-gradient-to-tr from-[#2FB39A] to-[#3F7FD0] flex flex-col items-center justify-center shadow-2xl p-6 text-white border-4 border-white">
                <Activity className="w-32 h-32 text-white stroke-[2.5]" />
                <span className="text-3xl font-black mt-2 tracking-wider">Dr.Tech.Care</span>
              </div>
            </div>

            <div className="max-w-xl flex flex-col gap-3">
              <h2 className="text-5xl font-black text-[#1F3A4D]">
                ระบบกายภาพบำบัดฟื้นฟูอัจฉริยะ
              </h2>
              <p className="text-2xl text-[#536E80] font-medium leading-relaxed">
                กล้องสแตนด์บายตรวจจับอัตโนมัติ<br />
                เมื่อคนไข้มานั่งที่เก้าอี้ ระบบจะเริ่มทำงานทันที
              </p>
            </div>

            {/* Standby Detection Button */}
            <div className="w-full max-w-lg mt-6">
              <BigButton
                variant="primary-green"
                icon={<CameraMirror className="w-10 h-10 hidden" />}
                onClick={() => transitionTo("check_account")}
              >
                ผู้ป่วยมานั่งหน้าตู้ (เริ่มใช้งาน)
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. หน้าจอตรวจสอบบัญชี (CHECK ACCOUNT)                          */}
        {/* ------------------------------------------------------------- */}
        {state === "check_account" && (
          <main className="flex-1 flex flex-col items-center justify-between py-6 max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-500">
            {/* Live Mirror Camera at the top (Mirror effect like a looking glass) */}
            <div className="w-full max-w-md h-72 mb-4">
              <CameraMirror
                scanTitle="ส่องกระจกจัดตำแหน่งใบหน้า"
                className="w-full h-full"
              />
            </div>

            {/* Central Question Card */}
            <div className="w-full bg-white/95 rounded-[40px] p-8 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#E4F0FC] text-[#3F7FD0] flex items-center justify-center">
                <HelpCircle className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-4xl font-black text-[#1F3A4D] leading-tight">
                  คุณมีบัญชีกายภาพอยู่แล้วหรือไม่?
                </h2>
                <p className="text-xl text-[#536E80] mt-2">
                  ควบคุมไร้สัมผัส: กวาดมือไปทางซ้ายหรือขวา หรือแตะปุ่มเพื่อเลือก
                </p>
              </div>

              {/* Dual Selection (Contactless + Touch) */}
              <div className="grid grid-cols-2 gap-8 w-full mt-2">
                {/* LEFT: ไม่มีบัญชี (Flow A: ผู้ป่วยใหม่) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#3F7FD0] bg-blue-50 py-2 rounded-xl border border-blue-200">
                    <Hand className="w-5 h-5 -rotate-45" />
                    <span>กวาดมือซ้าย (ไร้สัมผัส)</span>
                  </div>
                  <BigButton
                    variant="primary-blue"
                    icon={<UserPlus className="w-8 h-8" />}
                    onClick={() => transitionTo("register_consent")}
                  >
                    ไม่มีบัญชี
                  </BigButton>
                </div>

                {/* RIGHT: มีบัญชี (Flow B: ผู้ป่วยเก่า) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#1E8C78] bg-teal-50 py-2 rounded-xl border border-teal-200">
                    <Hand className="w-5 h-5 rotate-45" />
                    <span>กวาดมือขวา (ไร้สัมผัส)</span>
                  </div>
                  <BigButton
                    variant="primary-green"
                    icon={<UserCheck className="w-8 h-8" />}
                    onClick={() => transitionTo("login_face_scan")}
                  >
                    มีบัญชีแล้ว
                  </BigButton>
                </div>
              </div>
            </div>

            <div className="w-full flex justify-center mt-4">
              <button
                type="button"
                onClick={handleFullReset}
                className="text-lg font-bold text-[#536E80] hover:text-[#1F3A4D] underline py-2 cursor-pointer"
              >
                กลับสู่หน้าพักเครื่อง (Reset)
              </button>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3A. ผู้ป่วยใหม่ (FLOW A) — ขั้นตอนยินยอม PDPA                   */}
        {/* ------------------------------------------------------------- */}
        {state === "register_consent" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-300">
            <div className="w-full bg-white/95 rounded-[40px] p-10 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-24 h-24 rounded-full bg-emerald-50 text-[#2FB39A] flex items-center justify-center">
                <ShieldCheck className="w-14 h-14 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-4xl font-black text-[#1F3A4D]">
                  นโยบายความยินยอมข้อมูลใบหน้า
                </h2>
                <div className="mt-4 p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl text-left text-lg text-[#1F3A4D] space-y-3">
                  <p className="font-bold text-teal-800">
                    🔒 มาตรฐานความปลอดภัยตาม PDPA:
                  </p>
                  <p>
                    1. ระบบจะแปลงลักษณะใบหน้าเป็น <strong>รหัสเวกเตอร์ตัวเลข 128 มิติ</strong> เท่านั้น
                  </p>
                  <p>
                    2. <strong>ไม่มีการบันทึกหรือเก็บภาพถ่ายหรือวิดีโอ</strong> ของคนไข้ลงในเซิร์ฟเวอร์
                  </p>
                  <p>
                    3. รหัสเวกเตอร์จะถูกใช้เฉพาะการล็อกอินหน้าตู้กายภาพบำบัดนี้เท่านั้น
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("register_face_scan")}
                >
                  ยินยอมและสแกนใบหน้า
                </BigButton>
                <BigButton
                  variant="ghost"
                  onClick={() => transitionTo("check_account")}
                >
                  ย้อนกลับ
                </BigButton>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3A. ผู้ป่วยใหม่ (FLOW A) — สแกนใบหน้า Liveness (หน้าตรง-ซ้าย-ขวา) */}
        {/* ------------------------------------------------------------- */}
        {state === "register_face_scan" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-2xl mx-auto w-full py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#1F3A4D]">
                สแกนใบหน้าลงทะเบียน (Face Enrollment)
              </h2>
              <p className="text-xl text-[#536E80] mt-1">
                กรุณาทำตามคำสั่งบนหน้าจอเพื่อยืนยันตัวตนว่ามีชีวิตจริง
              </p>
            </div>

            {/* Camera Frame */}
            <div className="w-full max-w-md h-96">
              <CameraMirror
                isScanning={true}
                scanTitle={
                  faceChallengeStep === "center"
                    ? "ขั้นตอนที่ 1/3: กรุณามองตรงที่กล้อง"
                    : faceChallengeStep === "left"
                    ? "ขั้นตอนที่ 2/3: กรุณาหันศีรษะไปทางซ้ายช้าๆ"
                    : "ขั้นตอนที่ 3/3: กรุณาหันศีรษะไปทางขวาช้าๆ"
                }
                className="w-full h-full"
              />
            </div>

            {/* Instruction Stepper Card */}
            <div className="w-full bg-white/95 rounded-3xl p-6 border-2 border-[#1F3A4D]/10 shadow-lg flex items-center justify-between">
              <div
                className={`flex-1 p-3 text-center rounded-2xl font-bold text-lg transition-colors ${
                  faceChallengeStep === "center"
                    ? "bg-[#2FB39A] text-[#1F3A4D]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                1. หน้าตรง
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400" />
              <div
                className={`flex-1 p-3 text-center rounded-2xl font-bold text-lg transition-colors ${
                  faceChallengeStep === "left"
                    ? "bg-[#2FB39A] text-[#1F3A4D]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                2. หันซ้าย
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400" />
              <div
                className={`flex-1 p-3 text-center rounded-2xl font-bold text-lg transition-colors ${
                  faceChallengeStep === "right"
                    ? "bg-[#2FB39A] text-[#1F3A4D]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                3. หันขวา
              </div>
            </div>

            {/* Action Simulator buttons for Liveness */}
            <div className="w-full flex gap-4">
              {faceChallengeStep === "center" && (
                <BigButton
                  variant="primary-blue"
                  onClick={() => setFaceChallengeStep("left")}
                >
                  จำลอง: ตรวจจับหน้าตรงผ่าน (ไปหันซ้าย)
                </BigButton>
              )}
              {faceChallengeStep === "left" && (
                <BigButton
                  variant="primary-blue"
                  onClick={() => setFaceChallengeStep("right")}
                >
                  จำลอง: หันซ้ายผ่าน (ไปหันขวา)
                </BigButton>
              )}
              {faceChallengeStep === "right" && (
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("register_form")}
                >
                  สแกนครบ 3 ท่าสำเร็จ (ไปกรอกข้อมูล)
                </BigButton>
              )}
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3A. ผู้ป่วยใหม่ (FLOW A) — กรอกข้อมูล (2 ทางเลือก)             */}
        {/* ------------------------------------------------------------- */}
        {state === "register_form" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="text-4xl font-black text-[#1F3A4D]">
                กรอกข้อมูลผู้ป่วยใหม่
              </h2>
              <p className="text-xl text-[#536E80] mt-1">
                เลือกกรอกผ่านหน้าตู้ หรือ ให้เจ้าหน้าที่/แพทย์กรอกให้จากคอมพิวเตอร์หลังบ้าน
              </p>
            </div>

            {/* Channel Switcher */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                type="button"
                onClick={() => setRegChannel("kiosk")}
                className={`p-4 rounded-2xl font-bold text-xl border-3 flex items-center justify-center gap-3 transition-all ${
                  regChannel === "kiosk"
                    ? "bg-[#2FB39A] text-[#1F3A4D] border-[#1F3A4D]/30 shadow-lg"
                    : "bg-white text-[#536E80] border-slate-200"
                }`}
              >
                <span>ทางเลือก 1: กรอกหน้าตู้</span>
              </button>

              <button
                type="button"
                onClick={() => setRegChannel("admin")}
                className={`p-4 rounded-2xl font-bold text-xl border-3 flex items-center justify-center gap-3 transition-all ${
                  regChannel === "admin"
                    ? "bg-[#3F7FD0] text-white border-blue-900 shadow-lg"
                    : "bg-white text-[#536E80] border-slate-200"
                }`}
              >
                <span>ทางเลือก 2: เจ้าหน้าที่กรอกให้ (หลังบ้าน)</span>
              </button>
            </div>

            {/* Form Content based on Channel */}
            {regChannel === "kiosk" ? (
              <div className="w-full bg-white/95 rounded-3xl p-6 border-2 border-[#1F3A4D]/10 shadow-xl flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-bold text-[#1F3A4D]">ชื่อจริง</label>
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      value={regFirstName}
                      onClick={() => setActiveInput("firstName")}
                      className="w-full p-3 rounded-xl border-2 border-teal-300 text-xl font-bold bg-teal-50/50 mt-1 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-base font-bold text-[#1F3A4D]">นามสกุล</label>
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      value={regLastName}
                      onClick={() => setActiveInput("lastName")}
                      className="w-full p-3 rounded-xl border-2 border-teal-300 text-xl font-bold bg-teal-50/50 mt-1 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-[#1F3A4D]">อายุ (ปี)</label>
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={regAge}
                    onClick={() => setActiveInput("age")}
                    className="w-full p-3 rounded-xl border-2 border-teal-300 text-xl font-bold bg-teal-50/50 mt-1 cursor-pointer"
                  />
                </div>

                {/* Virtual Thai Keyboard or NumPad */}
                {activeInput === "firstName" && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-bold text-[#1F3A4D] mb-1">แตะแป้นพิมพ์เพื่อแก้ไขชื่อ:</p>
                    <ThaiKeyboard
                      onChar={(c) => setRegFirstName((prev) => prev + c)}
                      onBackspace={() => setRegFirstName((prev) => prev.slice(0, -1))}
                      onSpace={() => setRegFirstName((prev) => prev + " ")}
                      onClose={() => setActiveInput("none")}
                    />
                  </div>
                )}
                {activeInput === "lastName" && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-bold text-[#1F3A4D] mb-1">แตะแป้นพิมพ์เพื่อแก้ไขนามสกุล:</p>
                    <ThaiKeyboard
                      onChar={(c) => setRegLastName((prev) => prev + c)}
                      onBackspace={() => setRegLastName((prev) => prev.slice(0, -1))}
                      onSpace={() => setRegLastName((prev) => prev + " ")}
                      onClose={() => setActiveInput("none")}
                    />
                  </div>
                )}
                {activeInput === "age" && (
                  <div className="border-t pt-3 flex flex-col items-center">
                    <p className="text-sm font-bold text-[#1F3A4D] mb-1">แตะตัวเลขเพื่อแก้ไขอายุ:</p>
                    <NumPad
                      onDigit={(d) => setRegAge((prev) => (prev.length < 3 ? prev + d : prev))}
                      onBackspace={() => setRegAge((prev) => prev.slice(0, -1))}
                      onClear={() => setRegAge("")}
                      onConfirm={() => setActiveInput("none")}
                    />
                  </div>
                )}

                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("register_success")}
                >
                  บันทึกข้อมูลและสมัครสมาชิก
                </BigButton>
              </div>
            ) : (
              <div className="w-full bg-white/95 rounded-3xl p-8 border-2 border-[#1F3A4D]/10 shadow-xl flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-[#3F7FD0] flex items-center justify-center">
                  <QrCode className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#1F3A4D]">
                    รอเจ้าหน้าที่กรอกข้อมูลจาก Admin Dashboard
                  </h3>
                  <p className="text-lg text-[#536E80] mt-1">
                    รหัสเชื่อมโยงชั่วคราว: <strong className="text-[#3F7FD0] text-2xl font-mono">DTC-7892</strong>
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    (ระบบใช้ฐานข้อมูล Supabase เดียวกันแบบ Realtime เมื่อเจ้าหน้าที่กดบันทึก ตู้จะอัปเดตทันที)
                  </p>
                </div>

                <div className="flex items-center gap-2 text-teal-700 bg-teal-50 px-4 py-2 rounded-full border border-teal-200">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>กำลังรอสัญญาณบันทึกข้อมูลจากหลังบ้าน...</span>
                </div>

                <BigButton
                  variant="primary-blue"
                  onClick={() => transitionTo("register_success")}
                >
                  จำลอง: เจ้าหน้าที่กดบันทึกสำเร็จ (Realtime Trigger)
                </BigButton>
              </div>
            )}
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3A. ผู้ป่วยใหม่ (FLOW A) — สมัครสำเร็จ (Auto กลับหน้าแรก)       */}
        {/* ------------------------------------------------------------- */}
        {state === "register_success" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="w-full bg-white/95 rounded-[40px] p-12 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-28 h-28 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-5xl font-black text-[#1F3A4D]">
                  สมัครบัญชีสำเร็จ!
                </h2>
                <p className="text-2xl text-[#536E80] mt-3">
                  บันทึกข้อมูลใบหน้าและประวัติเรียบร้อยแล้ว
                </p>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl w-full text-lg font-bold text-teal-800">
                ระบบจะพาท่านกลับสู่หน้าแรกเพื่อสแกนเข้าสู่ระบบจริงในอีก {countdown} วินาที...
              </div>

              <BigButton
                variant="primary-green"
                onClick={() => transitionTo("check_account")}
              >
                เข้าสู่หน้าแรกทันที
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3B. ผู้ป่วยเก่า (FLOW B) — สแกนใบหน้าเข้าสู่ระบบ                */}
        {/* ------------------------------------------------------------- */}
        {state === "login_face_scan" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-2xl mx-auto w-full py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="text-4xl font-black text-[#1F3A4D]">
                สแกนใบหน้าเข้าสู่ระบบ
              </h2>
              <p className="text-xl text-[#536E80] mt-1">
                กรุณามองตรงที่กล้องเพื่อยืนยันตัวตน
              </p>
            </div>

            <div className="w-full max-w-md h-96">
              <CameraMirror
                isScanning={true}
                scanTitle="กำลังจับคู่รหัสใบหน้ากับฐานข้อมูล..."
                className="w-full h-full"
              />
            </div>

            <div className="w-full flex flex-col gap-4">
              <BigButton
                variant="primary-green"
                onClick={() => transitionTo("login_confirm")}
              >
                จำลอง: สแกนใบหน้าพบข้อมูล (ไปยืนยันชื่อ)
              </BigButton>
              <BigButton
                variant="ghost"
                onClick={() => transitionTo("check_account")}
              >
                ย้อนกลับ
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3B. ผู้ป่วยเก่า (FLOW B) — ยืนยันข้อมูลชื่อ-นามสกุล             */}
        {/* ------------------------------------------------------------- */}
        {state === "login_confirm" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-300">
            <div className="w-full bg-white/95 rounded-[40px] p-10 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-24 h-24 rounded-full bg-teal-50 text-[#2FB39A] flex items-center justify-center">
                <UserCheck className="w-14 h-14 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-lg font-bold text-[#536E80]">ตรวจพบข้อมูลผู้ใช้งาน</span>
                <h2 className="text-5xl font-black text-[#1F3A4D] mt-2">
                  {maskName("สมพงษ์", "สุขใจ")}
                </h2>
                <p className="text-2xl text-[#536E80] mt-2">
                  HN: 67-00124 • อายุ 65 ปี
                </p>
                <p className="text-xl font-bold text-teal-700 mt-4">
                  ใช่บัญชีของท่านหรือไม่?
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("login_success")}
                >
                  ยืนยันการใช้งาน (ใช่บัญชีนี้)
                </BigButton>

                <BigButton
                  variant="ghost"
                  onClick={() => transitionTo("login_face_scan")}
                >
                  ไม่ใช่ (สแกนใบหน้าใหม่)
                </BigButton>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3B. ล็อกอินสำเร็จ (Auto ไปตรวจสอบภารกิจ)                        */}
        {/* ------------------------------------------------------------- */}
        {state === "login_success" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="w-full bg-white/95 rounded-[40px] p-12 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-28 h-28 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-5xl font-black text-[#1F3A4D]">
                  ล็อกอินสำเร็จ
                </h2>
                <p className="text-3xl font-bold text-teal-700 mt-3">
                  สวัสดีคุณ สมพงษ์ สุขใจ
                </p>
              </div>

              <div className="w-full">
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("verify_daily_tasks")}
                >
                  ตรวจสอบภารกิจประจำวันทันที
                </BigButton>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. ตรวจสอบภารกิจประจำวัน (DAILY TASK VERIFICATION)             */}
        {/* ------------------------------------------------------------- */}
        {state === "verify_daily_tasks" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="w-full bg-white/95 rounded-[40px] p-10 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>

              <div>
                <h2 className="text-4xl font-black text-[#1F3A4D]">
                  ตรวจสอบภารกิจประจำวัน
                </h2>
                <p className="text-xl text-[#536E80] mt-2">
                  ระบบกำลังค้นหาตารางนัดหมายและท่ากายภาพที่แพทย์กำหนดไว้สำหรับวันนี้...
                </p>
              </div>

              {/* Testing switches for both cases */}
              <div className="flex flex-col gap-4 w-full">
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("checklist_intro")}
                >
                  กรณีมีภารกิจ (เข้าสู่ Daily Checklist)
                </BigButton>

                <BigButton
                  variant="primary-blue"
                  onClick={() => transitionTo("no_task")}
                >
                  กรณีไม่มีภารกิจ (แพทย์ไม่ได้นัดวันนี้)
                </BigButton>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. กรณีไม่มีภารกิจ (NO TASK SCREEN)                           */}
        {/* ------------------------------------------------------------- */}
        {state === "no_task" && (
          <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="w-full bg-white/95 rounded-[40px] p-12 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center text-center gap-8">
              <div className="w-24 h-24 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-14 h-14 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-4xl font-black text-[#1F3A4D]">
                  วันนี้แพทย์ไม่ได้มีการนัดหมายกายภาพ
                </h2>
                <p className="text-2xl text-[#536E80] mt-3">
                  ขอให้ท่านมีสุขภาพแข็งแรงและพักผ่อนให้เพียงพอครับ
                </p>
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl w-full text-lg font-bold text-slate-600">
                ระบบจะจบการทำงานและกลับสู่หน้าแรกในอีก {countdown} วินาที...
              </div>

              <BigButton
                variant="ghost"
                onClick={handleFullReset}
              >
                กลับสู่หน้าหลักทันที
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 5. หน้าจอภารกิจประจำวัน (DAILY CHECKLIST - INTRO ค้าง 5 วิ)    */}
        {/* ------------------------------------------------------------- */}
        {state === "checklist_intro" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full py-6 animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <span className="text-lg font-bold text-teal-700 bg-teal-50 px-4 py-1 rounded-full border border-teal-200">
                ตารางนัดหมายวันนี้
              </span>
              <h2 className="text-5xl font-black text-[#1F3A4D] mt-3">
                ภารกิจประจำวัน (Daily Checklist)
              </h2>
              <p className="text-2xl text-[#536E80] mt-2">
                กรุณาทำกิจกรรมตามลำดับที่แพทย์กำหนด
              </p>
            </div>

            {/* Checklist Items */}
            <div className="w-full flex flex-col gap-6 my-auto">
              {/* Item 1: กายภาพบำบัด */}
              <div className="w-full bg-white rounded-3xl p-8 border-4 border-[#2FB39A] shadow-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-[#E8F8F1] text-[#2FB39A] flex items-center justify-center">
                    <HeartPulse className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#2FB39A]">ภารกิจที่ 1</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      กายภาพบำบัดประจำวัน
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      ท่ากางแขนขึ้นลง (Shoulder Abduction) • 5 ครั้ง
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  กำลังจะเริ่ม ⏳
                </div>
              </div>

              {/* Item 2: มินิเกมฝึกสมอง */}
              <div className="w-full bg-white/70 rounded-3xl p-8 border-2 border-slate-200 shadow-md flex items-center justify-between opacity-70">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-[#E4F0FC] text-[#3F7FD0] flex items-center justify-center">
                    <Brain className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#3F7FD0]">ภารกิจที่ 2</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      เล่นมินิเกมฝึกสมอง
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      แบบฝึกทักษะความจำและการสังเกต
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl">
                  ลำดับถัดไป
                </div>
              </div>
            </div>

            {/* Auto countdown bar */}
            <div className="w-full flex flex-col items-center gap-3">
              <div className="text-2xl font-black text-teal-800 flex items-center gap-2">
                <Clock className="w-6 h-6 animate-spin text-teal-600" />
                <span>กำลังพาเข้าสู่ภารกิจที่ 1 อัตโนมัติใน {countdown} วินาที...</span>
              </div>
              <BigButton
                variant="primary-green"
                icon={<ArrowRight className="w-8 h-8" />}
                onClick={() => transitionTo("mission_exercise")}
              >
                เริ่มภารกิจที่ 1 ทันที
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 6. ภารกิจที่ 1: กายภาพบำบัด (MISSION 1: EXERCISE)               */}
        {/* ------------------------------------------------------------- */}
        {state === "mission_exercise" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-4xl mx-auto w-full py-2 animate-in zoom-in-95 duration-300">
            {/* Header info */}
            <div className="w-full flex items-center justify-between border-b pb-2">
              <div>
                <span className="text-base font-extrabold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                  ภารกิจที่ 1 / 2
                </span>
                <h2 className="text-3xl font-black text-[#1F3A4D] mt-1">
                  ท่ากางแขนขึ้นลง (Shoulder Abduction)
                </h2>
              </div>
              <div className="text-right">
                <span className="text-sm text-[#536E80] font-bold">เป้าหมาย</span>
                <div className="text-3xl font-black text-[#1F3A4D]">
                  {exerciseReps} / {targetReps} <span className="text-xl font-normal">ครั้ง</span>
                </div>
              </div>
            </div>

            {/* Video Posture & Rep Counter Display */}
            <div className="w-full max-w-lg h-96 relative my-2">
              <CameraMirror
                isScanning={true}
                scanTitle="AI ตรวจจับข้อต่อหัวไหล่และแขน (Pose Detection)"
                className="w-full h-full"
              />
              {/* Rep overlay counter badge */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-white text-center">
                <span className="text-xs font-bold text-teal-300 uppercase tracking-widest">ทำได้แล้ว</span>
                <div className="text-5xl font-black text-[#2FB39A]">{exerciseReps}</div>
              </div>
            </div>

            {/* Rep simulator and actions */}
            <div className="w-full flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExerciseReps((prev) => Math.min(targetReps, prev + 1))}
                  className="p-5 bg-teal-500 hover:bg-teal-600 text-[#1F3A4D] rounded-2xl font-black text-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Sparkles className="w-8 h-8" />
                  <span>กางแขนครบ 1 ครั้ง (+1 Rep)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExerciseReps(targetReps)}
                  className="p-5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3 cursor-pointer"
                >
                  <CheckCircle2 className="w-8 h-8" />
                  <span>ทำครบ {targetReps} ครั้งทันที</span>
                </button>
              </div>

              {exerciseReps >= targetReps && (
                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("checklist_mid")}
                >
                  ภารกิจที่ 1 สำเร็จ! (กลับสู่ Checklist เพื่อบันทึกผล)
                </BigButton>
              )}
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 7. กลับมา Checklist ติ๊ก ✔️ ข้อ 1 (ค้าง 3 วินาที)               */}
        {/* ------------------------------------------------------------- */}
        {state === "checklist_mid" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full py-6 animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <span className="text-lg font-bold text-teal-700 bg-teal-50 px-4 py-1 rounded-full border border-teal-200">
                บันทึกผลลงฐานข้อมูลเรียบร้อย
              </span>
              <h2 className="text-5xl font-black text-[#1F3A4D] mt-3">
                ภารกิจประจำวัน (Daily Checklist)
              </h2>
              <p className="text-2xl text-[#536E80] mt-2">
                ภารกิจที่ 1 สำเร็จแล้ว ระบบกำลังพาไปต่อภารกิจที่ 2
              </p>
            </div>

            {/* Checklist Items */}
            <div className="w-full flex flex-col gap-6 my-auto">
              {/* Item 1: กายภาพบำบัด (TICKED ✔️) */}
              <div className="w-full bg-emerald-50/90 rounded-3xl p-8 border-4 border-emerald-500 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-emerald-700">ภารกิจที่ 1 • สำเร็จแล้ว ✔️</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      กายภาพบำบัดประจำวัน
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      ท่ากางแขนขึ้นลง • ครบ {targetReps} ครั้ง
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 bg-white px-5 py-2.5 rounded-2xl border border-emerald-300 shadow-sm">
                  เสร็จสิ้น ✔️
                </div>
              </div>

              {/* Item 2: เล่นมินิเกมฝึกสมอง (Next) */}
              <div className="w-full bg-white rounded-3xl p-8 border-4 border-[#3F7FD0] shadow-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-[#E4F0FC] text-[#3F7FD0] flex items-center justify-center">
                    <Brain className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-[#3F7FD0]">ภารกิจที่ 2</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      เล่นมินิเกมฝึกสมอง
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      แบบฝึกทักษะความจำและการสังเกต
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
                  กำลังจะเริ่ม ⏳
                </div>
              </div>
            </div>

            {/* Auto countdown bar */}
            <div className="w-full flex flex-col items-center gap-3">
              <div className="text-2xl font-black text-blue-800 flex items-center gap-2">
                <Clock className="w-6 h-6 animate-spin text-blue-600" />
                <span>กำลังพาเข้าสู่ภารกิจที่ 2 อัตโนมัติใน {countdown} วินาที...</span>
              </div>
              <BigButton
                variant="primary-blue"
                icon={<ArrowRight className="w-8 h-8" />}
                onClick={() => transitionTo("mission_quiz")}
              >
                เริ่มภารกิจที่ 2 ทันที
              </BigButton>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 8. ภารกิจที่ 2: มินิเกมฝึกสมอง (MISSION 2: QUIZ)                */}
        {/* ------------------------------------------------------------- */}
        {state === "mission_quiz" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-4 py-1 rounded-full border border-blue-200">
                ภารกิจที่ 2 / 2: มินิเกมฝึกสมอง
              </span>
              <h2 className="text-4xl font-black text-[#1F3A4D] mt-3">
                ผลไม้อะไรมีสีเหลืองและลิงชอบกิน?
              </h2>
              <p className="text-xl text-[#536E80] mt-1">
                แตะเลือกคำตอบที่ถูกต้อง
              </p>
            </div>

            {/* Quiz Choices */}
            <div className="grid grid-cols-2 gap-6 w-full my-auto">
              {[
                { id: 0, text: "1. แอปเปิ้ล", correct: false },
                { id: 1, text: "2. กล้วย", correct: true },
                { id: 2, text: "3. แตงโม", correct: false },
                { id: 3, text: "4. ส้ม", correct: false },
              ].map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setSelectedQuizAnswer(choice.id)}
                  className={`p-8 rounded-3xl font-black text-3xl border-4 text-left transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-between ${
                    selectedQuizAnswer === choice.id
                      ? choice.correct
                        ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                        : "bg-rose-100 border-rose-500 text-rose-900"
                      : "bg-white border-slate-200 hover:border-blue-400 text-[#1F3A4D]"
                  }`}
                >
                  <span>{choice.text}</span>
                  {selectedQuizAnswer === choice.id && (
                    choice.correct ? (
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-rose-600" />
                    )
                  )}
                </button>
              ))}
            </div>

            {/* Answer feedback */}
            {selectedQuizAnswer !== null && (
              <div className="w-full flex flex-col gap-4 animate-in fade-in">
                {selectedQuizAnswer === 1 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center text-xl font-bold text-emerald-800">
                    🎉 ถูกต้อง! กล้วยมีเปลือกสีเหลืองและเป็นอาหารโปรดของลิง
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-center text-xl font-bold text-amber-800">
                    คำตอบที่ถูกต้องคือกล้วย ลองดูคำอธิบายและดำเนินการต่อนะครับ
                  </div>
                )}

                <BigButton
                  variant="primary-green"
                  onClick={() => transitionTo("checklist_done")}
                >
                  เล่นเกมเสร็จสิ้น (ไปหน้าสรุปผล)
                </BigButton>
              </div>
            )}
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 9. หน้าจอ Checklist ครบทั้ง 2 ข้อ (CHECKLIST ALL DONE)         */}
        {/* ------------------------------------------------------------- */}
        {state === "checklist_done" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full py-6 animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <span className="text-lg font-bold text-emerald-700 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200">
                ทำครบทุกภารกิจประจำวันแล้ว 100%
              </span>
              <h2 className="text-5xl font-black text-[#1F3A4D] mt-3">
                ภารกิจประจำวัน (Daily Checklist)
              </h2>
            </div>

            {/* Checklist Items Both Done */}
            <div className="w-full flex flex-col gap-6 my-auto">
              {/* Item 1 ✔️ */}
              <div className="w-full bg-emerald-50/90 rounded-3xl p-8 border-4 border-emerald-500 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-emerald-700">ภารกิจที่ 1 • สำเร็จแล้ว ✔️</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      กายภาพบำบัดประจำวัน
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      ท่ากางแขนขึ้นลง • ครบ {targetReps} ครั้ง
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 bg-white px-5 py-2.5 rounded-2xl border border-emerald-300 shadow-sm">
                  เสร็จสิ้น ✔️
                </div>
              </div>

              {/* Item 2 ✔️ */}
              <div className="w-full bg-emerald-50/90 rounded-3xl p-8 border-4 border-emerald-500 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-18 h-18 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-lg font-extrabold text-emerald-700">ภารกิจที่ 2 • สำเร็จแล้ว ✔️</span>
                    <h3 className="text-3xl font-black text-[#1F3A4D]">
                      เล่นมินิเกมฝึกสมอง
                    </h3>
                    <p className="text-xl text-[#536E80] mt-1">
                      ทำแบบฝึกทักษะความจำเสร็จสมบูรณ์
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 bg-white px-5 py-2.5 rounded-2xl border border-emerald-300 shadow-sm">
                  เสร็จสิ้น ✔️
                </div>
              </div>
            </div>

            <BigButton
              variant="primary-green"
              icon={<Award className="w-10 h-10" />}
              onClick={() => transitionTo("completion")}
            >
              ดูหน้าสรุปผลและความสำเร็จ
            </BigButton>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 10. สิ้นสุดภารกิจประจำวัน (COMPLETION SCREEN)                  */}
        {/* ------------------------------------------------------------- */}
        {state === "completion" && (
          <main className="flex-1 flex flex-col items-center justify-between max-w-2xl mx-auto w-full py-6 animate-in zoom-in-95 duration-500">
            {/* Celebratory Icon */}
            <div className="relative flex items-center justify-center mt-4">
              <div className="w-32 h-32 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center shadow-xl border-4 border-amber-300 animate-bounce">
                <Award className="w-20 h-20" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-5xl font-black text-[#1F3A4D]">
                ยินดีด้วย! คุณทำกายภาพรายวันเสร็จสิ้นแล้ว
              </h2>
              <p className="text-2xl text-[#536E80] mt-2">
                คุณ สมพงษ์ สุขใจ ทำภารกิจครบถ้วนสมบูรณ์ในวันนี้
              </p>
            </div>

            {/* Doctor's Notes Banner */}
            <div className="w-full bg-white/95 rounded-3xl p-6 border-3 border-teal-300 shadow-xl flex flex-col gap-2 text-left">
              <div className="flex items-center gap-3 text-teal-800 font-black text-xl">
                <Sparkles className="w-6 h-6 text-[#2FB39A]" />
                <span>คำแนะนำเพิ่มเติมจากแพทย์ / นักกายภาพบำบัด</span>
              </div>
              <p className="text-xl text-[#1F3A4D] font-medium leading-relaxed bg-teal-50/60 p-4 rounded-2xl border border-teal-100">
                “วันนี้องศาการยกแขนทำได้ดีขึ้นอย่างเห็นได้ชัด ไม่มีอาการส่ายหรือเกร็งไหล่ พยายามดื่มน้ำมากๆ และรักษาระดับการยืดเหยียดต่อไปครับ”
              </p>
              <span className="text-sm font-bold text-[#536E80] text-right">
                — กภ. สมชาย ใจดี (นักกายภาพบำบัดผู้รับผิดชอบ)
              </span>
            </div>

            {/* Auto Logout Countdown */}
            <div className="w-full flex flex-col items-center gap-3">
              <div className="text-xl font-bold text-[#536E80] flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>ระบบจะออกจากระบบและกลับสู่หน้าพักเครื่องอัตโนมัติใน {countdown} วินาที</span>
              </div>

              <BigButton
                variant="primary-green"
                onClick={handleFullReset}
              >
                ออกจากระบบทันที (เสร็จสิ้น)
              </BigButton>
            </div>
          </main>
        )}

        {/* FOOTER DISCLAIMER */}
        <footer className="pt-3 border-t border-[#1F3A4D]/10 flex items-center justify-between text-xs text-[#536E80]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2FB39A]" />
            <span>อุปกรณ์สนับสนุนการฟื้นฟู ไม่ใช่เครื่องมือวินิจฉัยโรคขั้นวิกฤต</span>
          </div>
          <div>
            Dr.Tech.Care Kiosk Edition 1080×1920 • Real-time DB Synced
          </div>
        </footer>
      </div>
    </KioskShell>
  );
}
