"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ScanFace,
  UserPlus,
  Lock,
  ChevronLeft,
  CheckCircle2,
  HeartPulse,
  Brain,
  Award,
  Clock,
  WifiOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";
import { ThaiKeyboard } from "@/components/kiosk/ThaiKeyboard";
import { NumPad } from "@/components/kiosk/NumPad";
import { CameraMirror } from "@/components/kiosk/CameraMirror";
import { formatThaiDate, maskName } from "@/lib/thai";
import { resetKioskState } from "@/lib/kiosk";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot(): boolean {
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

function getClockSnapshot(): number {
  return cachedClockSnapshot;
}

function getClockServerSnapshot(): number {
  return 0;
}

export type KioskFlowState =
  | "home" // หน้าแรก: โครงสร้าง Strong Care (โลโก้ -> ชื่อระบบ -> 2 ปุ่มใหญ่ -> ปุ่มบุคลากร)
  | "login_face_scan" // สแกนใบหน้าเข้าสู่ระบบ (ผู้ป่วยเก่า)
  | "login_confirm" // ยืนยันข้อมูลชื่อ-นามสกุล
  | "register_consent" // สมัครใหม่: ความยินยอม PDPA
  | "register_face_scan" // สมัครใหม่: สแกนใบหน้า 3 ทิศทาง
  | "register_form" // สมัครใหม่: กรอกชื่อ-นามสกุล-อายุ
  | "register_success" // สมัครสำเร็จ
  | "verify_daily_tasks" // ตรวจสอบภารกิจประจำวัน
  | "checklist_intro" // Checklist เตรียมความพร้อม (5 วินาที)
  | "mission_exercise" // ภารกิจที่ 1: กายภาพบำบัด
  | "checklist_mid" // Checklist ตรวจสอบข้อ 1 ผ่าน (3 วินาที)
  | "mission_quiz" // ภารกิจที่ 2: มินิเกมฝึกสมอง
  | "checklist_done" // Checklist สำเร็จครบทุกข้อ
  | "completion"; // สิ้นสุดการฝึก สรุปผล + คำแนะนำแพทย์

export default function KioskPage() {
  const router = useRouter();
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const clockTimestamp = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);

  const [state, setState] = useState<KioskFlowState>("home");

  // Registration Form State
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

  // Reset to Home
  const handleFullReset = () => {
    setState("home");
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
            transitionTo("home");
          } else if (state === "completion") {
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
    <KioskShell idleTimeoutSeconds={60} enableIdleGuard={state !== "home"} showStaffTrigger={false}>
      <div className="flex-1 flex flex-col w-full h-full bg-[#F4FBF7] text-[#0B2B2B] px-5 sm:px-8 py-4 sm:py-6 select-none overflow-y-auto">
        
        {/* ========================================================================= */}
        {/* 1. หน้าแรก (HOME SCREEN) - สไตล์ STRONG CARE สำหรับผู้สูงอายุ              */}
        {/* ========================================================================= */}
        {state === "home" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            {/* สถานะระบบด้านบนสุด (โปร่งตา สบายตา) */}
            <div className="w-full flex items-center justify-between text-xs font-medium text-[#3D5A5A] pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {isOnline ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1E8A4C] animate-pulse" />
                    <span className="font-semibold text-[#1E8A4C]">ระบบพร้อมใช้งาน</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-amber-700">ออฟไลน์</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 font-medium whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-[#3D5A5A]" />
                <span>
                  {clockTimestamp > 0
                    ? formatThaiDate(clockTimestamp, { formatStyle: "short", includeTime: true })
                    : "10 ต.ค. 2569"}
                </span>
              </div>
            </div>

            {/* ส่วนตรงกลาง: โลโก้ + ข้อความ + 2 ปุ่มใหญ่ (เว้นระยะห่างกำลังดี ไม่เบียด) */}
            <div className="w-full flex flex-col items-center text-center my-auto py-2">
              
              {/* โลโก้ขนาดพอดี (72x72px) สไตล์ Strong Care */}
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#1E8A4C] text-white flex items-center justify-center shadow-lg shadow-[#1E8A4C]/25 border-3 border-white mb-3 transition-transform hover:scale-105 flex-shrink-0">
                <Activity className="w-10 h-10 sm:w-11 sm:h-11 stroke-[2.75]" />
              </div>

              {/* ชื่อระบบ + คำอธิบายสั้น ๆ สำหรับผู้สูงอายุ */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] tracking-tight">
                Dr.Tech.Care
              </h1>
              
              <p className="text-base sm:text-lg font-bold text-[#1E8A4C] mt-0.5">
                ศูนย์กายภาพบำบัดอัจฉริยะ
              </p>

              <p className="text-xs sm:text-sm text-[#3D5A5A] font-medium max-w-xs mt-2 leading-relaxed">
                กรุณาเลือกรายการด้านล่างเพื่อเริ่มต้นการฝึก
              </p>

              {/* ส่วนปุ่มใหญ่ 2 ปุ่ม (สูง >= 68-74px เว้นระยะห่างชัดเจน 20px) */}
              <div className="w-full flex flex-col gap-4 sm:gap-5 mt-6 sm:mt-7">
                
                {/* ปุ่มหลัก (Primary): สแกนใบหน้าเพื่อเข้าสู่ระบบ */}
                <button
                  type="button"
                  onClick={() => transitionTo("login_face_scan")}
                  className="
                    w-full min-h-[68px] sm:min-h-[74px] px-5 py-3
                    rounded-2xl
                    bg-[#1E8A4C] hover:bg-[#17733E] active:bg-[#125C31]
                    text-white font-bold
                    shadow-lg shadow-[#1E8A4C]/20
                    border border-[#156337]/50
                    flex items-center gap-3.5
                    transition-all duration-150 active:scale-[0.98]
                    cursor-pointer text-left
                  "
                >
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <ScanFace className="w-6 h-6 text-white stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight">
                      สแกนใบหน้าเพื่อเข้าสู่ระบบ
                    </span>
                    <span className="text-xs font-medium text-emerald-100">
                      สำหรับผู้ป่วยเดิมที่มีข้อมูลในระบบ
                    </span>
                  </div>
                </button>

                {/* ปุ่มรอง (Secondary): สมัครบัญชีใหม่ */}
                <button
                  type="button"
                  onClick={() => transitionTo("register_consent")}
                  className="
                    w-full min-h-[68px] sm:min-h-[74px] px-5 py-3
                    rounded-2xl
                    bg-[#6FD67F] hover:bg-[#5EC76E] active:bg-[#4DB25D]
                    text-[#0B2B2B] font-bold
                    shadow-lg shadow-[#6FD67F]/25
                    border border-[#4EA85D]/40
                    flex items-center gap-3.5
                    transition-all duration-150 active:scale-[0.98]
                    cursor-pointer text-left
                  "
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0B2B2B]/10 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-6 h-6 text-[#0B2B2B] stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0B2B2B]">
                      สมัครบัญชีใหม่
                    </span>
                    <span className="text-xs font-semibold text-[#1A452C]">
                      สำหรับผู้รับบริการครั้งแรก
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ส่วนด้านล่างสุด: ปุ่มเล็ก “สำหรับบุคลากร” และคำเตือนทางการแพทย์ */}
            <div className="w-full flex flex-col items-center pt-3 pb-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => router.push("/staff/login")}
                className="
                  px-4 py-2 rounded-full
                  bg-white hover:bg-emerald-50 text-[#0B2B2B]
                  border border-[#0B2B2B]/20 shadow-sm
                  text-xs sm:text-sm font-medium flex items-center gap-2
                  cursor-pointer active:scale-95 transition-all
                "
              >
                <Lock className="w-3.5 h-3.5 text-[#3D5A5A]" />
                <span>สำหรับบุคลากร</span>
              </button>

              <p className="text-[11px] text-[#527070] font-medium text-center mt-2">
                เครื่องมือช่วยการฝึกฟื้นฟูทางกายภาพบำบัด ไม่ใช่การวินิจฉัยโรค
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. สแกนใบหน้าเข้าสู่ระบบ (LOGIN FACE SCAN - ผู้ป่วยเดิม)                   */}
        {/* ========================================================================= */}
        {state === "login_face_scan" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            {/* ปุ่มย้อนกลับด้านบน */}
            <div className="w-full flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับหน้าแรก</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">เข้าสู่ระบบ</span>
            </div>

            {/* กล้องสแกนใบหน้าจัดตำแหน่ง */}
            <div className="w-full flex flex-col items-center my-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] text-center mb-2">
                สแกนใบหน้าเพื่อเข้าสู่ระบบ
              </h2>
              <p className="text-base text-[#3D5A5A] text-center mb-6 max-w-xs">
                กรุณานั่งตรงและมองที่กล้องด้านบนเพื่อตรวจสอบใบหน้า
              </p>

              <div className="w-full max-w-sm h-72 sm:h-80 rounded-3xl overflow-hidden shadow-xl border-4 border-[#1E8A4C]/30 bg-slate-900 relative">
                <CameraMirror scanTitle="กำลังค้นหาใบหน้า..." className="w-full h-full" />
              </div>

              {/* ปุ่มจำลองสแกนใบหน้าสำเร็จ */}
              <div className="w-full max-w-sm mt-8">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[64px] !text-xl"
                  onClick={() => transitionTo("login_confirm")}
                  icon={<CheckCircle2 className="w-6 h-6" />}
                >
                  ตรวจพบใบหน้า (จำลองเข้าระบบ)
                </BigButton>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              หากสแกนไม่ผ่าน กรุณาติดต่อเจ้าหน้าที่คลินิก
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ยืนยันข้อมูลชื่อ-นามสกุล (LOGIN CONFIRM)                               */}
        {/* ========================================================================= */}
        {state === "login_confirm" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => transitionTo("login_face_scan")}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>สแกนใหม่</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">ยืนยันตัวตน</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <div className="w-20 h-20 rounded-full bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] text-center mb-2">
                ตรวจพบข้อมูลผู้ป่วย
              </h2>
              <p className="text-base text-[#3D5A5A] text-center mb-6">
                กรุณาตรวจสอบชื่อของท่านก่อนเริ่มการฝึก
              </p>

              {/* การ์ดข้อมูลผู้ป่วย */}
              <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#1E8A4C]/20 shadow-lg text-center flex flex-col gap-3">
                <span className="text-sm font-bold text-[#1E8A4C] uppercase tracking-wider">
                  ชื่อ-นามสกุลผู้ป่วย
                </span>
                <p className="text-3xl sm:text-4xl font-black text-[#0B2B2B]">
                  {maskName("ประเสริฐ", "รักษ์ดี")}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm font-semibold text-[#3D5A5A] pt-2 border-t border-slate-100">
                  <span>อายุ 72 ปี</span>
                  <span>•</span>
                  <span>HN: 69-00124</span>
                  <span>•</span>
                  <span className="text-[#1E8A4C]">นัดหมายวันนี้</span>
                </div>
              </div>

              {/* ปุ่มยืนยัน / ปฏิเสธ */}
              <div className="w-full flex flex-col gap-4 mt-8">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[68px] !text-xl"
                  onClick={() => transitionTo("verify_daily_tasks")}
                  icon={<ArrowRight className="w-6 h-6" />}
                >
                  ถูกต้อง (เริ่มทำภารกิจ)
                </BigButton>

                <button
                  type="button"
                  onClick={handleFullReset}
                  className="w-full py-4 text-base font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors"
                >
                  ไม่ใช่ข้อมูลของฉัน (ยกเลิก)
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              ระบบรักษาความปลอดภัยตามมาตรฐาน PDPA
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ผู้ป่วยใหม่: ความยินยอม PDPA (REGISTER CONSENT)                         */}
        {/* ========================================================================= */}
        {state === "register_consent" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับหน้าแรก</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">สมัครบัญชีใหม่</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#6FD67F]/20 text-[#1E8A4C] flex items-center justify-center mb-4">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] text-center mb-2">
                ความยินยอมเก็บข้อมูล (PDPA)
              </h2>
              <p className="text-sm text-[#3D5A5A] text-center mb-4">
                ระบบจะเก็บภาพใบหน้าเพื่อใช้ในการเข้าสู่ระบบครั้งถัดไปอย่างปลอดภัย
              </p>

              <div className="w-full bg-white rounded-2xl p-5 border border-slate-200 text-sm text-[#0B2B2B] leading-relaxed space-y-2.5 max-h-56 overflow-y-auto shadow-inner">
                <p className="font-bold text-[#1E8A4C]">วัตถุประสงค์ในการประมวลผลข้อมูลชีวมิติ:</p>
                <p>1. ข้อมูลใบหน้าจะถูกแปลงเป็นค่าตัวเลขคณิตศาสตร์ (Vector Embedding) ทันทีบนอุปกรณ์</p>
                <p>2. ระบบจะไม่บันทึกภาพถ่ายใบหน้าจริงลงในเซิร์ฟเวอร์</p>
                <p>3. ข้อมูลจะถูกใช้สำหรับการยืนยันตัวตนและการฝึกกายภาพบำบัดของท่านเท่านั้น</p>
              </div>

              <div className="w-full flex flex-col gap-4 mt-8">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[68px] !text-xl"
                  onClick={() => transitionTo("register_face_scan")}
                  icon={<CheckCircle2 className="w-6 h-6" />}
                >
                  ยินยอมและสแกนใบหน้า
                </BigButton>

                <button
                  type="button"
                  onClick={handleFullReset}
                  className="w-full py-3.5 text-base font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors"
                >
                  ไม่ยินยอม (กลับหน้าแรก)
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              ท่านสามารถขอยกเลิกหรือลบข้อมูลได้ตลอดเวลา
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ผู้ป่วยใหม่: สแกนใบหน้า 3 มุม (REGISTER FACE SCAN)                       */}
        {/* ========================================================================= */}
        {state === "register_face_scan" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => transitionTo("register_consent")}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">บันทึกใบหน้า 3 มุม</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <h2 className="text-2xl font-extrabold text-[#0B2B2B] text-center mb-1">
                สแกนใบหน้าเพื่อบันทึกข้อมูล
              </h2>
              
              {/* ขั้นตอนสแกน 3 ทิศทาง */}
              <div className="flex items-center gap-3 my-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${faceChallengeStep === "center" ? "bg-[#1E8A4C] text-white" : "bg-emerald-100 text-[#1E8A4C]"}`}>
                  1. มองตรง
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${faceChallengeStep === "left" ? "bg-[#1E8A4C] text-white" : "bg-slate-100 text-[#3D5A5A]"}`}>
                  2. หันซ้าย
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${faceChallengeStep === "right" ? "bg-[#1E8A4C] text-white" : "bg-slate-100 text-[#3D5A5A]"}`}>
                  3. หันขวา
                </span>
              </div>

              <div className="w-full max-w-sm h-64 sm:h-72 rounded-3xl overflow-hidden shadow-xl border-4 border-[#1E8A4C]/30 bg-slate-900 relative">
                <CameraMirror
                  scanTitle={
                    faceChallengeStep === "center"
                      ? "กรุณามองตรงที่กล้อง"
                      : faceChallengeStep === "left"
                      ? "กรุณาหันหน้าไปทางซ้ายเล็กน้อย"
                      : "กรุณาหันหน้าไปทางขวาเล็กน้อย"
                  }
                  className="w-full h-full"
                />
              </div>

              {/* ปุ่มจำลองเปลี่ยนมุม / ผ่านขั้นตอน */}
              <div className="w-full max-w-sm flex flex-col gap-3 mt-6">
                {faceChallengeStep === "center" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => setFaceChallengeStep("left")}
                  >
                    ถ่ายภาพมองตรง (ไปขั้นที่ 2)
                  </BigButton>
                )}
                {faceChallengeStep === "left" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => setFaceChallengeStep("right")}
                  >
                    ถ่ายภาพหันซ้าย (ไปขั้นที่ 3)
                  </BigButton>
                )}
                {faceChallengeStep === "right" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => transitionTo("register_form")}
                    icon={<CheckCircle2 className="w-6 h-6" />}
                  >
                    สแกนครบ 3 มุม (กรอกข้อมูลต่อ)
                  </BigButton>
                )}
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              ระบบตรวจสอบความมีชีวิตจริง ป้องกันการใช้รูปถ่ายหลอก
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. ผู้ป่วยใหม่: กรอกข้อมูลหน้าตู้ (REGISTER FORM)                           */}
        {/* ========================================================================= */}
        {state === "register_form" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={() => transitionTo("register_face_scan")}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">กรอกข้อมูลผู้ป่วย</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <h2 className="text-2xl font-extrabold text-[#0B2B2B] text-center mb-4">
                กรอกข้อมูลผู้ป่วยใหม่
              </h2>

              {/* กล่องกรอกข้อมูล */}
              <div className="w-full flex flex-col gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("firstName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("firstName");
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    activeInput === "firstName" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-xs font-bold text-[#3D5A5A] block">ชื่อจริง</label>
                  <p className="text-xl font-bold text-[#0B2B2B] mt-0.5">{regFirstName || "แตะเพื่อพิมพ์"}</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("lastName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("lastName");
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    activeInput === "lastName" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-xs font-bold text-[#3D5A5A] block">นามสกุล</label>
                  <p className="text-xl font-bold text-[#0B2B2B] mt-0.5">{regLastName || "แตะเพื่อพิมพ์"}</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("age")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("age");
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    activeInput === "age" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-xs font-bold text-[#3D5A5A] block">อายุ (ปี)</label>
                  <p className="text-xl font-bold text-[#0B2B2B] mt-0.5">{regAge || "แตะเพื่อพิมพ์"}</p>
                </div>
              </div>

              {/* แป้นพิมพ์เสมือน (คีย์บอร์ดไทย / ปุ่มตัวเลข) */}
              <div className="w-full mt-4 bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-sm">
                {activeInput === "age" ? (
                  <NumPad
                    onDigit={(d) => setRegAge((prev) => (prev.length < 3 ? prev + d : prev))}
                    onBackspace={() => setRegAge((prev) => prev.slice(0, -1))}
                    onClear={() => setRegAge("")}
                  />
                ) : (
                  <ThaiKeyboard
                    onChar={(c) => {
                      if (activeInput === "firstName") setRegFirstName((p) => p + c);
                      else if (activeInput === "lastName") setRegLastName((p) => p + c);
                    }}
                    onBackspace={() => {
                      if (activeInput === "firstName") setRegFirstName((p) => p.slice(0, -1));
                      else if (activeInput === "lastName") setRegLastName((p) => p.slice(0, -1));
                    }}
                    onSpace={() => {
                      if (activeInput === "firstName") setRegFirstName((p) => p + " ");
                      else if (activeInput === "lastName") setRegLastName((p) => p + " ");
                    }}
                  />
                )}
              </div>

              <div className="w-full mt-4">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[64px] !text-xl"
                  onClick={() => transitionTo("register_success")}
                >
                  บันทึกข้อมูลและเสร็จสิ้น
                </BigButton>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              แตะที่ช่องเพื่อเลือกพิมพ์ชื่อหรืออายุ
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. สมัครสำเร็จ (REGISTER SUCCESS)                                         */}
        {/* ========================================================================= */}
        {state === "register_success" && (
          <div className="flex-1 flex flex-col justify-center items-center w-full max-w-lg mx-auto py-6 text-center">
            <div className="w-24 h-24 rounded-full bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#0B2B2B] mb-2">
              ลงทะเบียนสำเร็จเรียบร้อย
            </h2>
            <p className="text-lg text-[#3D5A5A] mb-8">
              ยินดีต้อนรับคุณ {regFirstName} {regLastName}<br />
              ระบบบันทึกใบหน้าและข้อมูลของท่านแล้ว
            </p>

            <div className="w-full max-w-sm">
              <BigButton
                variant="strong-primary"
                className="!min-h-[68px] !text-xl"
                onClick={handleFullReset}
              >
                กลับสู่หน้าแรก ({countdown}s)
              </BigButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. ตรวจสอบภารกิจประจำวัน (VERIFY DAILY TASKS)                             */}
        {/* ========================================================================= */}
        {state === "verify_daily_tasks" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
              <span className="text-sm font-bold text-[#1E8A4C]">ตารางประจำวัน</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-4">
                <HeartPulse className="w-9 h-9" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] text-center mb-2">
                ภารกิจประจำวันของคุณ
              </h2>
              <p className="text-base text-[#3D5A5A] text-center mb-6">
                แพทย์นักกายภาพบำบัดได้จัดชุดฝึกไว้ให้คุณ 2 รายการ
              </p>

              {/* การ์ดภารกิจ 2 ข้อ */}
              <div className="w-full flex flex-col gap-4">
                <div className="p-5 bg-white rounded-2xl border-2 border-[#1E8A4C]/25 shadow-md flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-black text-xl">
                    1
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-lg font-bold text-[#0B2B2B]">กายภาพบำบัด: ยกแขนบริหารไหล่</span>
                    <span className="text-xs text-[#3D5A5A]">เป้าหมาย: 5 ครั้ง (รักษามุมยก 90 องศา)</span>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border-2 border-[#6FD67F]/40 shadow-md flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#6FD67F]/20 text-[#0B2B2B] flex items-center justify-center font-black text-xl">
                    2
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-lg font-bold text-[#0B2B2B]">ฝึกสมอง: ทายภาพผลไม้บำรุงสุขภาพ</span>
                    <span className="text-xs text-[#3D5A5A]">กระตุ้นความจำและสมาธิ 1 ข้อ</span>
                  </div>
                </div>
              </div>

              <div className="w-full mt-8">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[72px] !text-xl"
                  onClick={() => transitionTo("checklist_intro")}
                  icon={<ArrowRight className="w-6 h-6" />}
                >
                  เริ่มทำภารกิจที่ 1
                </BigButton>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              กรุณาทำตามคำแนะนำของระบบเพื่อความปลอดภัย
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. หน้า CHECKLIST (INTRO / MID / DONE)                                    */}
        {/* ========================================================================= */}
        {(state === "checklist_intro" || state === "checklist_mid" || state === "checklist_done") && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-3">
              <span className="text-sm font-bold text-[#3D5A5A]">ความคืบหน้ารายวัน</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#1E8A4C]">
                นับถอยหลัง {countdown} วินาที
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] text-center mb-6">
                รายการภารกิจวันนี้
              </h2>

              <div className="w-full flex flex-col gap-4">
                {/* ข้อ 1: กายภาพ */}
                <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  state === "checklist_mid" || state === "checklist_done"
                    ? "bg-emerald-50 border-[#1E8A4C] shadow-md"
                    : "bg-white border-[#1E8A4C]/40 shadow"
                }`}>
                  <div className="flex items-center gap-3.5">
                    <HeartPulse className="w-6 h-6 text-[#1E8A4C]" />
                    <div className="flex flex-col text-left">
                      <span className="text-lg font-bold text-[#0B2B2B]">1. ท่ากายภาพบำบัดยกแขน</span>
                      <span className="text-xs text-[#3D5A5A]">เป้าหมาย: ครบ 5 ครั้ง</span>
                    </div>
                  </div>
                  <div>
                    {state === "checklist_mid" || state === "checklist_done" ? (
                      <span className="w-9 h-9 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-slate-100 text-[#3D5A5A] flex items-center justify-center font-bold text-sm">
                        รอ
                      </span>
                    )}
                  </div>
                </div>

                {/* ข้อ 2: ฝึกสมอง */}
                <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  state === "checklist_done"
                    ? "bg-emerald-50 border-[#1E8A4C] shadow-md"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="flex items-center gap-3.5">
                    <Brain className="w-6 h-6 text-[#3D5A5A]" />
                    <div className="flex flex-col text-left">
                      <span className="text-lg font-bold text-[#0B2B2B]">2. มินิเกมฝึกความจำสมอง</span>
                      <span className="text-xs text-[#3D5A5A]">ตอบคำถามเพื่อสุขภาพ 1 ข้อ</span>
                    </div>
                  </div>
                  <div>
                    {state === "checklist_done" ? (
                      <span className="w-9 h-9 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-slate-100 text-[#3D5A5A] flex items-center justify-center font-bold text-sm">
                        รอ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ปุ่มข้ามไปยังขั้นตอนถัดไปทันที */}
              <div className="w-full mt-8">
                {state === "checklist_intro" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-xl"
                    onClick={() => transitionTo("mission_exercise")}
                  >
                    เข้าสู่ภารกิจที่ 1 ทันที
                  </BigButton>
                )}
                {state === "checklist_mid" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-xl"
                    onClick={() => transitionTo("mission_quiz")}
                  >
                    เข้าสู่ภารกิจที่ 2 ทันที
                  </BigButton>
                )}
                {state === "checklist_done" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-xl"
                    onClick={() => transitionTo("completion")}
                  >
                    ดูผลสรุปการฝึก
                  </BigButton>
                )}
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              ระบบจะพาไปยังหน้าถัดไปอัตโนมัติเมื่อครบกำหนดเวลา
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. ภารกิจที่ 1: กายภาพบำบัด (MISSION EXERCISE)                            */}
        {/* ========================================================================= */}
        {state === "mission_exercise" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-2">
              <span className="text-sm font-bold text-[#1E8A4C]">ภารกิจที่ 1: กายภาพบำบัด</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#1E8A4C]">
                ท่าบริหารหัวไหล่
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              {/* หน้าจอกล้องส่องกระจกตรวจจับข้อต่อ */}
              <div className="w-full max-w-sm h-64 sm:h-72 rounded-3xl overflow-hidden shadow-xl border-4 border-[#1E8A4C]/30 bg-slate-900 relative">
                <CameraMirror scanTitle="ยกแขนขึ้นช้าๆ ให้ถึงระดับไหล่" className="w-full h-full" />
              </div>

              {/* ตัวนับ Reps */}
              <div className="w-full bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md text-center my-5 flex flex-col items-center">
                <span className="text-xs font-bold text-[#3D5A5A] uppercase tracking-wider">
                  จำนวนครั้งที่ทำสำเร็จ
                </span>
                <div className="text-5xl font-black text-[#1E8A4C] my-1">
                  {exerciseReps} / {targetReps}
                </div>
                <span className="text-sm font-semibold text-[#0B2B2B]">
                  {exerciseReps >= targetReps ? "ยอดเยี่ยมมาก! ครบตามเป้าหมายแล้ว" : "ยกแขนขึ้นและลงช้าๆ"}
                </span>
              </div>

              {/* ปุ่มจำลองเพิ่ม Reps */}
              <div className="w-full flex flex-col gap-3">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[64px] !text-xl"
                  onClick={() => {
                    const next = exerciseReps + 1;
                    setExerciseReps(next);
                    if (next >= targetReps) {
                      setTimeout(() => transitionTo("checklist_mid"), 500);
                    }
                  }}
                >
                  {exerciseReps < targetReps ? `จำลองทำสำเร็จ +1 ครั้ง (${exerciseReps + 1}/${targetReps})` : "กำลังบันทึกผล..."}
                </BigButton>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              หากรู้สึกเจ็บหรือเมื่อยล้า สามารถพักหรือหยุดได้ทันที
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. ภารกิจที่ 2: มินิเกมฝึกสมอง (MISSION QUIZ)                             */}
        {/* ========================================================================= */}
        {state === "mission_quiz" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2">
            
            <div className="w-full flex items-center justify-between pb-2">
              <span className="text-sm font-bold text-[#1E8A4C]">ภารกิจที่ 2: ฝึกสมองและความจำ</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#1E8A4C]">
                หมวด: อาหารเพื่อสุขภาพ
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Brain className="w-9 h-9" />
              </div>

              <h2 className="text-2xl font-extrabold text-[#0B2B2B] text-center mb-1">
                ผลไม้ชนิดใดมีวิตามินซีสูง ช่วยเสริมภูมิคุ้มกัน?
              </h2>
              <p className="text-sm text-[#3D5A5A] text-center mb-6">
                แตะเลือกคำตอบที่ถูกต้อง 1 ข้อ
              </p>

              {/* ตัวเลือกคำถาม */}
              <div className="w-full flex flex-col gap-3.5">
                {[
                  { id: 1, label: "ก. ส้มและฝรั่ง", isCorrect: true },
                  { id: 2, label: "ข. มันฝรั่งทอด", isCorrect: false },
                  { id: 3, label: "ค. ลูกอมรสหวาน", isCorrect: false },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuizAnswer(choice.id);
                      setTimeout(() => transitionTo("checklist_done"), 600);
                    }}
                    className={`
                      w-full p-5 rounded-2xl text-left font-bold text-lg border-2 transition-all cursor-pointer shadow-sm
                      ${
                        selectedQuizAnswer === choice.id
                          ? "bg-emerald-100 border-[#1E8A4C] text-[#1E8A4C] scale-[0.99]"
                          : "bg-white hover:bg-emerald-50/50 border-slate-200 text-[#0B2B2B]"
                      }
                    `}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              การฝึกสมองช่วยชะลอภาวะสมองเสื่อมในผู้สูงอายุ
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. สิ้นสุดภารกิจประจำวัน (COMPLETION SCREEN)                               */}
        {/* ========================================================================= */}
        {state === "completion" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-lg mx-auto py-2 text-center">
            
            <div className="w-full flex items-center justify-between pb-2">
              <span className="text-sm font-bold text-[#1E8A4C]">สำเร็จทุกภารกิจ</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#1E8A4C]">
                รีเซ็ตใน {countdown} วินาที
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto">
              <div className="w-20 h-20 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center mb-4 shadow-lg animate-bounce">
                <Award className="w-12 h-12" />
              </div>

              <h2 className="text-3xl font-extrabold text-[#0B2B2B] mb-1">
                ยินดีด้วย! ท่านทำสำเร็จครบถ้วน
              </h2>
              <p className="text-base text-[#3D5A5A] mb-6">
                ระบบได้บันทึกประวัติการฝึกส่งให้นักกายภาพบำบัดเรียบร้อยแล้ว
              </p>

              {/* การ์ดคำแนะนำของแพทย์ */}
              <div className="w-full bg-white rounded-3xl p-6 border-2 border-[#1E8A4C]/25 shadow-md text-left flex flex-col gap-2">
                <span className="text-xs font-bold text-[#1E8A4C] uppercase tracking-wider">
                  คำแนะนำจากนักกายภาพบำบัด
                </span>
                <p className="text-base font-bold text-[#0B2B2B]">
                  “วันนี้ทำได้ดีมากครับ หัวไหล่เคลื่อนไหวได้มุม 90 องศาตามเกณฑ์ แนะนำให้ดื่มน้ำและพักผ่อนให้เพียงพอ พบกันใหม่ในวันพรุ่งนี้ครับ”
                </p>
                <span className="text-xs text-[#3D5A5A] mt-1">
                  โดย: กภ. ปิยะ สมบูรณ์ (นักกายภาพบำบัดประจำคลินิก)
                </span>
              </div>

              <div className="w-full mt-6">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[68px] !text-xl"
                  onClick={handleFullReset}
                >
                  เสร็จสิ้น / ออกจากระบบ ({countdown}s)
                </BigButton>
              </div>
            </div>

            <div className="text-center text-xs text-[#527070] mt-auto">
              ขอให้ท่านมีสุขภาพร่างกายที่แข็งแรงในทุกๆ วัน
            </div>
          </div>
        )}

      </div>
    </KioskShell>
  );
}
