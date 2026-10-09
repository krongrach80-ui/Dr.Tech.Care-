"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ScanFace,
  UserPlus,
  ChevronLeft,
  CheckCircle2,
  HeartPulse,
  Brain,
  Award,
  Clock,
  WifiOff,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";
import { ThaiKeyboard } from "@/components/kiosk/ThaiKeyboard";
import { NumPad } from "@/components/kiosk/NumPad";
import { CameraMirror } from "@/components/kiosk/CameraMirror";
import { PatientDashboard } from "@/components/kiosk/PatientDashboard";
import { StaffTrigger } from "@/components/kiosk/StaffTrigger";
import { formatThaiDate, maskName } from "@/lib/thai";
import { resetKioskState } from "@/lib/kiosk";
import { generateServerChallenge, type ServerChallenge, type LivenessPose } from "@/lib/biometrics";

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
  | "home" // 1. หน้าแรก (โลโก้ -> ชื่อระบบ -> 2 ปุ่มใหญ่ -> ปุ่มบุคลากร)
  | "login_consent" // 1.1 ความยินยอม PDPA ชีวมิติก่อนสแกนใบหน้า
  | "login_face_scan" // 2. สแกนใบหน้าเข้าสู่ระบบ (3-Step Liveness: มองตรง -> หันซ้าย -> หันขวา)
  | "login_confirm" // 3. ยืนยันข้อมูล ("ใช่บัญชีนี้หรือไม่?")
  | "patient_home" // 4. หน้าหลักคนไข้หลัง Login สำเร็จ (Dashboard คนไข้)
  | "register_consent" // สมัครใหม่: ความยินยอม PDPA
  | "register_face_scan" // สมัครใหม่: สแกนใบหน้า 3 มุม
  | "register_duplicate_warn" // สมัครใหม่: แจ้งเตือนพบใบหน้าซ้ำในระบบ
  | "register_form" // สมัครใหม่: กรอกชื่อ-นามสกุล-อายุ (Thai Keyboard / NumPad)
  | "register_success" // สมัครใหม่: สำเร็จ
  | "checklist_intro" // 5. แผนการฝึก: Checklist ก่อนเริ่ม (5 วินาที)
  | "mission_exercise" // 6. ภารกิจที่ 1: กายภาพบำบัด
  | "checklist_mid" // 7. Checklist ติ๊กข้อ 1 สำเร็จ (3 วินาที)
  | "mission_quiz" // 8. ภารกิจที่ 2: มินิเกมฝึกสมอง
  | "checklist_done" // 9. Checklist ติ๊กครบทุกข้อ
  | "completion"; // 10. สรุปผลการฝึก + คำแนะนำแพทย์

export default function KioskPage() {
  const router = useRouter();
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const clockTimestamp = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);

  const [state, setState] = useState<KioskFlowState>(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const flow = params.get("flow");
        const scan = params.get("scan");
        if (
          flow === "scan" ||
          flow === "login_scan" ||
          flow === "face_scan" ||
          scan === "true" ||
          scan === "1"
        ) {
          return "login_face_scan";
        }
        if (flow === "register" || flow === "register_scan") {
          return "register_face_scan";
        }
      }
    }
    return "home";
  });

  // Registration Form State
  const [regFirstName, setRegFirstName] = useState("สมพร");
  const [regLastName, setRegLastName] = useState("เจริญสุข");
  const [regAge, setRegAge] = useState("68");
  const [activeInput, setActiveInput] = useState<"none" | "firstName" | "lastName" | "age">("none");

  // Login & Registration Liveness Challenge Step with Server Challenge (Nonce + Randomized sequence)
  const [loginChallenge, setLoginChallenge] = useState<ServerChallenge>(() => generateServerChallenge());
  const [regChallenge, setRegChallenge] = useState<ServerChallenge>(() => generateServerChallenge());
  const [loginLivenessStep, setLoginLivenessStep] = useState<LivenessPose>("center");
  const [regLivenessStep, setRegLivenessStep] = useState<LivenessPose>("center");
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Daily Exercise State
  const [exerciseReps, setExerciseReps] = useState(0);
  const targetReps = 5;

  // Daily Quiz State
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);

  // Auto-advance & Auto-logout countdown timer
  const [countdown, setCountdown] = useState<number>(0);

  // Reset to Home
  const handleFullReset = () => {
    setState("home");
    setCountdown(0);
    setExerciseReps(0);
    setSelectedQuizAnswer(null);
    const freshLoginChallenge = generateServerChallenge();
    const freshRegChallenge = generateServerChallenge();
    setLoginChallenge(freshLoginChallenge);
    setRegChallenge(freshRegChallenge);
    setLoginLivenessStep(freshLoginChallenge.sequence[0]);
    setRegLivenessStep(freshRegChallenge.sequence[0]);
    resetKioskState({ redirectToHome: false });
  };

  const transitionTo = (nextState: KioskFlowState) => {
    setState(nextState);
    if (nextState === "checklist_intro") setCountdown(5);
    else if (nextState === "checklist_mid") setCountdown(3);
    else if (nextState === "register_success") setCountdown(3);
    else if (nextState === "completion") setCountdown(10);
    else if (nextState === "patient_home") setCountdown(45); // 45s idle logout on patient dashboard
    else setCountdown(0);
  };



  // Countdown timer for auto-advance / auto-logout
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
          } else if (state === "completion" || state === "patient_home") {
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
      <div className="flex-1 flex flex-col w-full h-full bg-transparent text-[#0B2B2B] px-5 sm:px-8 py-4 sm:py-6 select-none overflow-y-auto">
        
        {/* ========================================================================= */}
        {/* 1. หน้าแรก (HOME SCREEN) - สไตล์ STRONG CARE สำหรับผู้สูงอายุ              */}
        {/* ========================================================================= */}
        {state === "home" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            {/* สถานะระบบด้านบนสุด */}
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

            {/* ส่วนตรงกลาง: โลโก้ + ข้อความ + 2 ปุ่มใหญ่ */}
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

              {/* ส่วนปุ่มใหญ่ 2 ปุ่ม (สูง >= 96px สำหรับผู้สูงอายุตามเกณฑ์ Ergonomics) */}
              <div className="w-full flex flex-col gap-4 sm:gap-5 mt-6 sm:mt-7">
                
                {/* ปุ่มหลัก: สแกนใบหน้าเพื่อเข้าสู่ระบบ (Touch target >= 96px) */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginLivenessStep("center");
                    transitionTo("login_consent");
                  }}
                  className="
                    w-full min-h-[96px] px-6 py-4
                    rounded-3xl
                    bg-[#1E8A4C] hover:bg-[#17733E] active:bg-[#125C31]
                    text-white font-bold
                    shadow-xl shadow-[#1E8A4C]/25
                    border-2 border-[#156337]/50
                    flex items-center gap-4
                    transition-all duration-150 active:scale-[0.98]
                    cursor-pointer text-left
                  "
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <ScanFace className="w-8 h-8 text-white stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-[24px] font-extrabold tracking-tight">
                      สแกนใบหน้าเพื่อเข้าสู่ระบบ
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-emerald-100 mt-0.5">
                      สำหรับผู้ป่วยเดิมที่มีข้อมูลในระบบ
                    </span>
                  </div>
                </button>

                {/* ปุ่มรอง: สมัครบัญชีใหม่ (Touch target >= 96px) */}
                <button
                  type="button"
                  onClick={() => transitionTo("register_consent")}
                  className="
                    w-full min-h-[96px] px-6 py-4
                    rounded-3xl
                    bg-[#6FD67F] hover:bg-[#5EC76E] active:bg-[#4DB25D]
                    text-[#0B2B2B] font-bold
                    shadow-xl shadow-[#6FD67F]/25
                    border-2 border-[#4EA85D]/40
                    flex items-center gap-4
                    transition-all duration-150 active:scale-[0.98]
                    cursor-pointer text-left
                  "
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#0B2B2B]/10 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-8 h-8 text-[#0B2B2B] stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-[24px] font-extrabold tracking-tight text-[#0B2B2B]">
                      สมัครบัญชีใหม่
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#1A452C] mt-0.5">
                      สำหรับผู้รับบริการครั้งแรก
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ส่วนด้านล่างสุด: ปุ่มบุคลากรต้องกดค้าง 1.5 วินาทีเพื่อเข้าสู่ระบบ (StaffTrigger) */}
            <div className="w-full flex flex-col items-center pt-3 pb-1 flex-shrink-0">
              <StaffTrigger holdDurationMs={1500} />

              <p className="text-[11px] text-[#527070] font-medium text-center mt-2">
                เครื่องมือช่วยการฝึกฟื้นฟูทางกายภาพบำบัด ไม่ใช่การวินิจฉัยโรค
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1.1 ความยินยอม PDPA ก่อนสแกนใบหน้าเข้าสู่ระบบ (LOGIN PDPA CONSENT)        */}
        {/* ========================================================================= */}
        {state === "login_consent" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับหน้าแรก</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">ความยินยอมข้อมูลชีวมิติ</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              <div className="w-14 h-14 rounded-2xl bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-extrabold text-[#0B2B2B] text-center mb-1">
                ยินยอมสแกนใบหน้าเพื่อเข้าสู่ระบบ
              </h2>
              <p className="text-xs text-[#3D5A5A] text-center mb-2.5">
                ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </p>

              <div className="w-full bg-white rounded-2xl p-4 border border-slate-200 text-xs text-[#0B2B2B] leading-relaxed space-y-2 max-h-48 overflow-y-auto shadow-inner text-left">
                <p className="font-bold text-[#1E8A4C]">ข้อตกลงการประมวลผลข้อมูลชีวมิติ:</p>
                <p>1. ข้อมูลใบหน้าของท่านจะถูกแปลงเป็นค่าเวกเตอร์ตัวเลข 128 มิติ (Face Embedding) ทันทีบนอุปกรณ์</p>
                <p>2. ระบบไม่มีการบันทึกภาพถ่ายจริงหรือไฟล์วิดีโอลงในฐานข้อมูล</p>
                <p>3. ข้อมูลนำมาใช้เพื่อระบุตัวตนและดึงแผนการฝึกกายภาพบำบัดของท่านอย่างปลอดภัย</p>
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-4">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[58px] !text-base"
                  onClick={() => {
                    const fresh = generateServerChallenge();
                    setLoginChallenge(fresh);
                    setLoginLivenessStep(fresh.sequence[0]);
                    transitionTo("login_face_scan");
                  }}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                >
                  ยินยอมและเริ่มสแกนใบหน้า
                </BigButton>

                <button
                  type="button"
                  onClick={handleFullReset}
                  className="w-full py-2.5 text-xs font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors cursor-pointer"
                >
                  ไม่ยินยอม (กลับหน้าแรก)
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ท่านสามารถขอยกเลิกหรือตรวจสอบข้อมูลชีวมิติได้ตลอดเวลา
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. สแกนใบหน้าเข้าสู่ระบบ (3-STEP LIVENESS: มองตรง -> หันซ้าย -> หันขวา)     */}
        {/* ========================================================================= */}
        {state === "login_face_scan" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            {/* แถบย้อนกลับด้านบน */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ยกเลิก / หน้าแรก</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">เข้าสู่ระบบด้วยใบหน้า</span>
            </div>

            <div className="w-full flex flex-col items-center text-center my-auto py-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B2B2B] mb-0.5">
                สแกนใบหน้าเพื่อเข้าสู่ระบบ
              </h2>

              {/* Liveness 3-Step Progress Indicators */}
              <div className="flex items-center gap-2 my-2.5">
                {loginChallenge.sequence.map((pose, idx) => {
                  const stepNum = idx + 1;
                  const isCurrent = loginLivenessStep === pose;
                  const isPast =
                    (loginLivenessStep === loginChallenge.sequence[1] && idx === 0) ||
                    (loginLivenessStep === loginChallenge.sequence[2] && idx < 2);
                  const label =
                    pose === "center" ? "มองตรง" : pose === "left" ? "หันซ้าย" : "หันขวา";

                  return (
                    <div
                      key={`${pose}-${idx}`}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-[#1E8A4C] text-white shadow-sm ring-2 ring-[#1E8A4C]/30"
                          : isPast
                          ? "bg-emerald-100 text-[#1E8A4C]"
                          : "bg-slate-200/70 text-[#536E80]"
                      }`}
                    >
                      <span>{stepNum}. {label}</span>
                      {isPast && <CheckCircle2 className="w-3.5 h-3.5 inline ml-0.5" />}
                    </div>
                  );
                })}
              </div>

              {/* ข้อความบอกผู้ใช้ในขั้นตอนนี้ */}
              <p className="text-xs sm:text-sm font-semibold text-[#1E8A4C] mb-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                {loginLivenessStep === "center" && "👉 ขั้นที่ 1/3: นั่งตรง มองที่กล้องด้านบน"}
                {loginLivenessStep === "left" && "👉 หันหน้าไปทางซ้ายของท่านช้า ๆ"}
                {loginLivenessStep === "right" && "👉 หันหน้าไปทางขวาของท่านช้า ๆ"}
              </p>

              {/* กรอบกล้องสแกนใบหน้าพร้อม Error Handling และโหมดจำลอง */}
              <div className="w-full h-64 sm:h-72 rounded-3xl overflow-hidden shadow-xl border-3 border-[#1E8A4C]/30 bg-slate-900 relative flex-shrink-0">
                <CameraMirror
                  isScanning={true}
                  challenge={loginChallenge}
                  currentStep={
                    loginLivenessStep === loginChallenge.sequence[0]
                      ? 1
                      : loginLivenessStep === loginChallenge.sequence[1]
                      ? 2
                      : 3
                  }
                  totalSteps={3}
                  speechEnabled={speechEnabled}
                  onToggleSpeech={() => setSpeechEnabled((prev) => !prev)}
                  onRestartScan={() => {
                    const fresh = generateServerChallenge();
                    setLoginChallenge(fresh);
                    setLoginLivenessStep(fresh.sequence[0]);
                  }}
                  onCancelScan={handleFullReset}
                  onStepComplete={(step) => {
                    if (step === 1) setLoginLivenessStep(loginChallenge.sequence[1]);
                    else if (step === 2) setLoginLivenessStep(loginChallenge.sequence[2]);
                    else transitionTo("login_confirm");
                  }}
                  onAllStepsComplete={() => {
                    transitionTo("login_confirm");
                  }}
                  className="w-full h-full"
                />
              </div>

              {/* ปุ่มควบคุมขั้นตอน Liveness */}
              <div className="w-full flex flex-col gap-2 mt-3">
                {loginLivenessStep === loginChallenge.sequence[0] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => setLoginLivenessStep(loginChallenge.sequence[1])}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  >
                    มองตรงแล้ว (ไปขั้นที่ 2 {loginChallenge.sequence[1] === "left" ? "หันซ้าย" : "หันขวา"})
                  </BigButton>
                )}

                {loginLivenessStep === loginChallenge.sequence[1] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => setLoginLivenessStep(loginChallenge.sequence[2])}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  >
                    {loginChallenge.sequence[1] === "left" ? "หันซ้ายแล้ว" : "หันขวาแล้ว"} (ไปขั้นที่ 3 {loginChallenge.sequence[2] === "right" ? "หันขวา" : "หันซ้าย"})
                  </BigButton>
                )}

                {loginLivenessStep === loginChallenge.sequence[2] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => transitionTo("login_confirm")}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  >
                    สแกนครบ 3 มุม (ตรวจสอบข้อมูล)
                  </BigButton>
                )}


                {/* ปุ่มจำลองเข้าระบบด่วน / ปุ่มเริ่มใหม่ */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setLoginLivenessStep("center")}
                    className="flex-1 py-2 rounded-xl bg-white border border-[#0B2B2B]/20 text-[#0B2B2B] text-xs font-semibold flex items-center justify-center gap-1 shadow-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#3D5A5A]" />
                    <span>เริ่มสแกนใหม่</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => transitionTo("login_confirm")}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-[#1E8A4C] text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:bg-emerald-100 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>จำลองตรวจพบใบหน้า</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ระบบแปลงใบหน้าเป็นรหัสเวกเตอร์ตัวเลข ไม่บันทึกภาพถ่ายจริงตาม PDPA
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ยืนยันข้อมูลคนไข้ ("ใช่บัญชีนี้หรือไม่?")                               */}
        {/* ========================================================================= */}
        {state === "login_confirm" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => transitionTo("login_face_scan")}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>สแกนใหม่</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">ยืนยันตัวตน</span>
            </div>

            <div className="w-full flex flex-col items-center text-center my-auto py-2">
              <div className="w-16 h-16 rounded-full bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B2B2B] mb-0.5">
                ตรวจพบข้อมูลผู้ป่วย
              </h2>
              <p className="text-xs text-[#3D5A5A] mb-3">
                กรุณาตรวจสอบชื่อของท่านก่อนเข้าสู่ระบบ
              </p>

              {/* การ์ดข้อมูลผู้ป่วย */}
              <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#1E8A4C]/30 shadow-md flex flex-col gap-2">
                <span className="text-xs font-bold text-[#1E8A4C] uppercase tracking-wider">
                  ชื่อ-นามสกุลผู้ป่วย
                </span>
                <p className="text-2xl sm:text-3xl font-black text-[#0B2B2B]">
                  {maskName("ประเสริฐ", "รักษ์ดี")}
                </p>
                <div className="flex items-center justify-center gap-2.5 text-xs font-semibold text-[#3D5A5A] pt-2 border-t border-slate-100">
                  <span>เพศ ชาย</span>
                  <span>•</span>
                  <span>อายุ 72 ปี</span>
                  <span>•</span>
                  <span>HN: 69-00124</span>
                  <span>•</span>
                  <span className="text-[#1E8A4C] font-bold">มีนัดวันนี้</span>
                </div>
              </div>

              {/* คำถามใหญ่ "ใช่บัญชีนี้หรือไม่?" */}
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3 my-3">
                <p className="text-base font-extrabold text-[#1E8A4C]">
                  ใช่บัญชีของท่านหรือไม่?
                </p>
              </div>

              {/* ปุ่มยืนยัน / ปฏิเสธ */}
              <div className="w-full flex flex-col gap-2.5">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[64px] !text-lg"
                  onClick={() => router.push("/home")}
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  ใช่ (เข้าสู่หน้าหลักของฉัน)
                </BigButton>

                <button
                  type="button"
                  onClick={() => transitionTo("login_face_scan")}
                  className="w-full py-2.5 rounded-xl bg-white border border-[#0B2B2B]/20 text-xs sm:text-sm font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors cursor-pointer"
                >
                  ไม่ใช่ (ลองสแกนใหม่)
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              หากลองสแกนแล้วยังไม่ตรง กรุณาติดต่อเจ้าหน้าที่คลินิก
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. หน้าหลักคนไข้หลัง LOGIN สำเร็จ (PATIENT DASHBOARD)                      */}
        {/* ========================================================================= */}
        {state === "patient_home" && (
          <PatientDashboard
            patientFirstName="ประเสริฐ"
            patientLastName="รักษ์ดี"
            patientGender="male"
            patientAge={72}
            patientHn="69-00124"
            physioName="กภ. ปิยะ สมบูรณ์"
            clinicBranch="คลินิกกายภาพบำบัดฟื้นฟูข้อต่อและกล้ามเนื้อ"
            countdownSeconds={countdown}
            onStartExercise={() => transitionTo("checklist_intro")}
            onLogout={handleFullReset}
            onExtendTimer={() => setCountdown(45)}
          />
        )}

        {/* ========================================================================= */}
        {/* 5. ผู้ป่วยใหม่: ความยินยอม PDPA (REGISTER CONSENT)                         */}
        {/* ========================================================================= */}
        {state === "register_consent" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับหน้าแรก</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">สมัครบัญชีใหม่</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              <div className="w-14 h-14 rounded-2xl bg-[#6FD67F]/20 text-[#1E8A4C] flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-extrabold text-[#0B2B2B] text-center mb-1">
                ความยินยอมเก็บข้อมูล (PDPA)
              </h2>
              <p className="text-xs text-[#3D5A5A] text-center mb-2.5">
                ระบบจะเก็บค่าตัวเลขเวกเตอร์ใบหน้า เพื่อใช้เข้าสู่ระบบอย่างปลอดภัย
              </p>

              <div className="w-full bg-white rounded-2xl p-3.5 border border-slate-200 text-xs text-[#0B2B2B] leading-relaxed space-y-2 max-h-48 overflow-y-auto shadow-inner text-left">
                <p className="font-bold text-[#1E8A4C]">วัตถุประสงค์ในการประมวลผลข้อมูลชีวมิติ:</p>
                <p>1. ข้อมูลใบหน้าจะถูกแปลงเป็นค่าตัวเลขคณิตศาสตร์ (128-d Vector Embedding) ทันทีบนอุปกรณ์</p>
                <p>2. ระบบจะไม่บันทึกภาพถ่ายใบหน้าจริงลงในเซิร์ฟเวอร์</p>
                <p>3. ข้อมูลจะถูกใช้สำหรับการยืนยันตัวตนและการฝึกกายภาพบำบัดของท่านเท่านั้น</p>
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-4">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[58px] !text-base"
                  onClick={() => {
                    setRegLivenessStep("center");
                    transitionTo("register_face_scan");
                  }}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                >
                  ยินยอมและสแกนใบหน้า
                </BigButton>

                <button
                  type="button"
                  onClick={handleFullReset}
                  className="w-full py-2.5 text-xs font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors cursor-pointer"
                >
                  ไม่ยินยอม (กลับหน้าแรก)
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ท่านสามารถขอยกเลิกหรือลบข้อมูลใบหน้าได้ตลอดเวลา
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. ผู้ป่วยใหม่: สแกนใบหน้า 3 มุม (REGISTER FACE SCAN)                       */}
        {/* ========================================================================= */}
        {state === "register_face_scan" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => transitionTo("register_consent")}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">บันทึกใบหน้า 3 มุม</span>
            </div>

            <div className="w-full flex flex-col items-center text-center my-auto py-1">
              <h2 className="text-xl font-extrabold text-[#0B2B2B] mb-1">
                สแกนใบหน้าเพื่อบันทึกข้อมูล
              </h2>
              
              {/* 3 Step Indicators */}
              <div className="flex items-center gap-2 my-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${regLivenessStep === "center" ? "bg-[#1E8A4C] text-white" : "bg-emerald-100 text-[#1E8A4C]"}`}>
                  1. มองตรง
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${regLivenessStep === "left" ? "bg-[#1E8A4C] text-white" : regLivenessStep === "right" ? "bg-emerald-100 text-[#1E8A4C]" : "bg-slate-200 text-[#3D5A5A]"}`}>
                  2. หันซ้าย
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${regLivenessStep === "right" ? "bg-[#1E8A4C] text-white" : "bg-slate-200 text-[#3D5A5A]"}`}>
                  3. หันขวา
                </span>
              </div>

              <div className="w-full h-56 sm:h-64 rounded-3xl overflow-hidden shadow-xl border-3 border-[#1E8A4C]/30 bg-slate-900 relative flex-shrink-0">
                <CameraMirror
                  isScanning={true}
                  challenge={regChallenge}
                  currentStep={
                    regLivenessStep === regChallenge.sequence[0]
                      ? 1
                      : regLivenessStep === regChallenge.sequence[1]
                      ? 2
                      : 3
                  }
                  totalSteps={3}
                  speechEnabled={speechEnabled}
                  onToggleSpeech={() => setSpeechEnabled((prev) => !prev)}
                  onRestartScan={() => {
                    const fresh = generateServerChallenge();
                    setRegChallenge(fresh);
                    setRegLivenessStep(fresh.sequence[0]);
                  }}
                  onCancelScan={handleFullReset}
                  onStepComplete={(step) => {
                    if (step === 1) setRegLivenessStep(regChallenge.sequence[1]);
                    else if (step === 2) setRegLivenessStep(regChallenge.sequence[2]);
                    else transitionTo("register_form");
                  }}
                  onAllStepsComplete={() => {
                    transitionTo("register_form");
                  }}
                  className="w-full h-full"
                />
              </div>

              {/* ปุ่มบันทึกแต่ละมุม */}
              <div className="w-full flex flex-col gap-2 mt-3">
                {regLivenessStep === regChallenge.sequence[0] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => setRegLivenessStep(regChallenge.sequence[1])}
                  >
                    ถ่ายภาพมองตรง (ไปขั้นที่ 2 {regChallenge.sequence[1] === "left" ? "หันซ้าย" : "หันขวา"})
                  </BigButton>
                )}
                {regLivenessStep === regChallenge.sequence[1] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => setRegLivenessStep(regChallenge.sequence[2])}
                  >
                    ถ่ายภาพ{regChallenge.sequence[1] === "left" ? "หันซ้าย" : "หันขวา"} (ไปขั้นที่ 3 {regChallenge.sequence[2] === "right" ? "หันขวา" : "หันซ้าย"})
                  </BigButton>
                )}
                {regLivenessStep === regChallenge.sequence[2] && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[58px] !text-base"
                    onClick={() => transitionTo("register_form")}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  >
                    สแกนครบ 3 มุม (กรอกข้อมูลต่อ)
                  </BigButton>
                )}

                {/* ปุ่มจำลองเตือนใบหน้าซ้ำ เพื่อทดสอบ Duplicate Detection */}
                <button
                  type="button"
                  onClick={() => transitionTo("register_duplicate_warn")}
                  className="text-[11px] text-amber-700 hover:underline mt-1 cursor-pointer"
                >
                  (ทดสอบ: จำลองพบใบหน้าซ้ำกับบัญชีเดิม)
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ระบบตรวจสอบความมีชีวิตจริง ป้องกันการใช้ภาพถ่ายหลอก
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6.1 สมัครใหม่: แจ้งเตือนพบใบหน้าซ้ำในระบบ (DUPLICATE DETECTION)             */}
        {/* ========================================================================= */}
        {state === "register_duplicate_warn" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 text-center">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-3 py-1 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] text-xs font-semibold cursor-pointer"
              >
                กลับหน้าแรก
              </button>
              <span className="text-xs font-bold text-amber-600">ตรวจพบใบหน้าซ้ำ</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <h2 className="text-xl font-extrabold text-[#0B2B2B] mb-1">
                คุณมีบัญชีในระบบอยู่แล้ว
              </h2>
              <p className="text-xs text-[#3D5A5A] mb-4">
                ใบหน้านี้ตรงกับบัญชีของผู้ป่วยในระบบเรียบร้อยแล้ว<br />
                ไม่จำเป็นต้องลงทะเบียนใหม่
              </p>

              <div className="w-full bg-white rounded-2xl p-4 border border-amber-200 shadow-sm text-left mb-4">
                <span className="text-xs font-bold text-amber-800">บัญชีที่ตรงกัน:</span>
                <p className="text-lg font-black text-[#0B2B2B] mt-1">{maskName("ประเสริฐ", "รักษ์ดี")}</p>
                <span className="text-xs text-[#527070]">HN: 69-00124</span>
              </div>

              <div className="w-full flex flex-col gap-2">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[60px] !text-lg"
                  onClick={() => transitionTo("login_confirm")}
                >
                  เข้าสู่ระบบด้วยบัญชีนี้
                </BigButton>

                <button
                  type="button"
                  onClick={handleFullReset}
                  className="py-2.5 text-xs font-bold text-[#3D5A5A] hover:text-[#0B2B2B] cursor-pointer"
                >
                  ยกเลิก (กลับหน้าแรก)
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ป้องกันการสร้างบัญชีซ้ำตามมาตรฐานความปลอดภัย
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ผู้ป่วยใหม่: กรอกข้อมูลหน้าตู้ (REGISTER FORM)                           */}
        {/* ========================================================================= */}
        {state === "register_form" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => transitionTo("register_face_scan")}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
              <span className="text-xs font-bold text-[#1E8A4C]">กรอกข้อมูลผู้ป่วย</span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              <h2 className="text-xl font-extrabold text-[#0B2B2B] text-center mb-2.5">
                กรอกข้อมูลผู้ป่วยใหม่
              </h2>

              {/* กล่องเลือกกรอกข้อมูล */}
              <div className="w-full flex flex-col gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("firstName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("firstName");
                  }}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    activeInput === "firstName" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-[11px] font-bold text-[#3D5A5A] block">ชื่อจริง</label>
                  <p className="text-base font-bold text-[#0B2B2B]">{regFirstName || "แตะเพื่อพิมพ์"}</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("lastName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("lastName");
                  }}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    activeInput === "lastName" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-[11px] font-bold text-[#3D5A5A] block">นามสกุล</label>
                  <p className="text-base font-bold text-[#0B2B2B]">{regLastName || "แตะเพื่อพิมพ์"}</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveInput("age")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveInput("age");
                  }}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    activeInput === "age" ? "bg-white border-[#1E8A4C] shadow-md ring-2 ring-[#1E8A4C]/20" : "bg-white/90 border-slate-200"
                  }`}
                >
                  <label className="text-[11px] font-bold text-[#3D5A5A] block">อายุ (ปี)</label>
                  <p className="text-base font-bold text-[#0B2B2B]">{regAge || "แตะเพื่อพิมพ์"}</p>
                </div>
              </div>

              {/* แป้นพิมพ์เสมือนบนจอ */}
              <div className="w-full mt-2.5 bg-white/95 p-2 rounded-2xl border border-slate-200 shadow-sm">
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

              <div className="w-full mt-2.5">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[58px] !text-lg"
                  onClick={() => transitionTo("register_success")}
                >
                  บันทึกข้อมูลและเสร็จสิ้น
                </BigButton>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              แตะที่ช่องเพื่อเลือกพิมพ์ชื่อหรืออายุ
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. สมัครสำเร็จ (REGISTER SUCCESS)                                         */}
        {/* ========================================================================= */}
        {state === "register_success" && (
          <div className="flex-1 flex flex-col justify-center items-center w-full max-w-sm mx-auto py-6 text-center h-full min-h-0">
            <div className="w-20 h-20 rounded-full bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-14 h-14 stroke-[2.5]" />
            </div>

            <h2 className="text-2xl font-extrabold text-[#0B2B2B] mb-1">
              ลงทะเบียนสำเร็จเรียบร้อย
            </h2>
            <p className="text-sm text-[#3D5A5A] mb-6">
              ยินดีต้อนรับคุณ {regFirstName} {regLastName}<br />
              ระบบบันทึกรหัสใบหน้าและข้อมูลของท่านแล้ว
            </p>

            <div className="w-full">
              <BigButton
                variant="strong-primary"
                className="!min-h-[64px] !text-lg"
                onClick={handleFullReset}
              >
                กลับสู่หน้าแรก ({countdown}s)
              </BigButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. หน้า CHECKLIST (INTRO / MID / DONE)                                    */}
        {/* ========================================================================= */}
        {(state === "checklist_intro" || state === "checklist_mid" || state === "checklist_done") && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <span className="text-xs font-bold text-[#3D5A5A]">ความคืบหน้าการฝึก</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1E8A4C]">
                {countdown > 0 ? `นับถอยหลัง ${countdown} วิ` : "พร้อม"}
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B2B2B] text-center mb-4">
                รายการภารกิจวันนี้
              </h2>

              <div className="w-full flex flex-col gap-3">
                {/* ข้อ 1: กายภาพ */}
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  state === "checklist_mid" || state === "checklist_done"
                    ? "bg-emerald-50 border-[#1E8A4C] shadow-md"
                    : "bg-white border-[#1E8A4C]/40 shadow-sm"
                }`}>
                  <div className="flex items-center gap-3">
                    <HeartPulse className="w-5 h-5 text-[#1E8A4C]" />
                    <div className="flex flex-col text-left">
                      <span className="text-base font-bold text-[#0B2B2B]">1. ท่ากายภาพบริหารไหล่</span>
                      <span className="text-[11px] text-[#3D5A5A]">เป้าหมาย: ครบ 5 ครั้ง</span>
                    </div>
                  </div>
                  <div>
                    {state === "checklist_mid" || state === "checklist_done" ? (
                      <span className="w-8 h-8 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center font-bold text-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-[#3D5A5A] flex items-center justify-center font-bold text-xs">
                        รอ
                      </span>
                    )}
                  </div>
                </div>

                {/* ข้อ 2: ฝึกสมอง */}
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  state === "checklist_done"
                    ? "bg-emerald-50 border-[#1E8A4C] shadow-md"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[#3D5A5A]" />
                    <div className="flex flex-col text-left">
                      <span className="text-base font-bold text-[#0B2B2B]">2. มินิเกมฝึกความจำสมอง</span>
                      <span className="text-[11px] text-[#3D5A5A]">ตอบคำถามเพื่อสุขภาพ 1 ข้อ</span>
                    </div>
                  </div>
                  <div>
                    {state === "checklist_done" ? (
                      <span className="w-8 h-8 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center font-bold text-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-[#3D5A5A] flex items-center justify-center font-bold text-xs">
                        รอ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ปุ่มข้ามขั้นตอน */}
              <div className="w-full mt-6">
                {state === "checklist_intro" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => transitionTo("mission_exercise")}
                  >
                    เข้าสู่ภารกิจที่ 1 ทันที
                  </BigButton>
                )}
                {state === "checklist_mid" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => transitionTo("mission_quiz")}
                  >
                    เข้าสู่ภารกิจที่ 2 ทันที
                  </BigButton>
                )}
                {state === "checklist_done" && (
                  <BigButton
                    variant="strong-primary"
                    className="!min-h-[64px] !text-lg"
                    onClick={() => transitionTo("completion")}
                  >
                    ดูผลสรุปการฝึก
                  </BigButton>
                )}
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ระบบจะพาไปยังหน้าถัดไปอัตโนมัติเมื่อครบกำหนดเวลา
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. ภารกิจที่ 1: กายภาพบำบัด (MISSION EXERCISE)                            */}
        {/* ========================================================================= */}
        {state === "mission_exercise" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <span className="text-xs font-bold text-[#1E8A4C]">ภารกิจที่ 1: กายภาพบำบัด</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1E8A4C]">
                ท่าบริหารหัวไหล่
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              {/* หน้าจอกล้องส่องกระจกตรวจจับข้อต่อ */}
              <div className="w-full h-56 sm:h-64 rounded-3xl overflow-hidden shadow-xl border-3 border-[#1E8A4C]/30 bg-slate-900 relative flex-shrink-0">
                <CameraMirror isScanning={true} scanTitle="ยกแขนขึ้นช้าๆ ให้ถึงระดับไหล่" className="w-full h-full" />
              </div>

              {/* ตัวนับ Reps */}
              <div className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center my-3 flex flex-col items-center">
                <span className="text-[10px] font-bold text-[#3D5A5A] uppercase tracking-wider">
                  จำนวนครั้งที่ทำสำเร็จ
                </span>
                <div className="text-4xl font-black text-[#1E8A4C] my-0.5">
                  {exerciseReps} / {targetReps}
                </div>
                <span className="text-xs font-semibold text-[#0B2B2B]">
                  {exerciseReps >= targetReps ? "ยอดเยี่ยมมาก! ครบตามเป้าหมายแล้ว" : "ยกแขนขึ้นและลงช้าๆ"}
                </span>
              </div>

              {/* ปุ่มจำลองเพิ่ม Reps */}
              <div className="w-full flex flex-col gap-2">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[58px] !text-base"
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

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              หากรู้สึกเจ็บหรือเมื่อยล้า สามารถพักหรือหยุดได้ทันที
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. ภารกิจที่ 2: มินิเกมฝึกสมอง (MISSION QUIZ)                             */}
        {/* ========================================================================= */}
        {state === "mission_quiz" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <span className="text-xs font-bold text-[#1E8A4C]">ภารกิจที่ 2: ฝึกสมองและความจำ</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1E8A4C]">
                อาหารเพื่อสุขภาพ
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                <Brain className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-extrabold text-[#0B2B2B] text-center mb-1">
                ผลไม้ชนิดใดมีวิตามินซีสูง ช่วยเสริมภูมิคุ้มกัน?
              </h2>
              <p className="text-xs text-[#3D5A5A] text-center mb-3">
                แตะเลือกคำตอบที่ถูกต้อง 1 ข้อ
              </p>

              {/* ตัวเลือกคำถาม (ห้ามส่งข้อมูลเฉลย isCorrect มาฝั่ง client) */}
              <div className="w-full flex flex-col gap-2.5">
                {[
                  { id: 1, label: "ก. ส้มและฝรั่ง" },
                  { id: 2, label: "ข. มันฝรั่งทอด" },
                  { id: 3, label: "ค. ลูกอมรสหวาน" },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuizAnswer(choice.id);
                      setTimeout(() => transitionTo("checklist_done"), 600);
                    }}
                    className={`
                      w-full p-4 rounded-xl text-left font-bold text-base border-2 transition-all cursor-pointer shadow-sm
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

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              การฝึกสมองช่วยชะลอภาวะสมองเสื่อมในผู้สูงอายุ
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. สิ้นสุดภารกิจประจำวัน (COMPLETION SCREEN)                               */}
        {/* ========================================================================= */}
        {state === "completion" && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 text-center">
            
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
              <span className="text-xs font-bold text-[#1E8A4C]">สำเร็จทุกภารกิจ</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#1E8A4C]">
                รีเซ็ตใน {countdown} วิ
              </span>
            </div>

            <div className="w-full flex flex-col items-center my-auto py-1">
              <div className="w-16 h-16 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center mb-3 shadow-lg animate-bounce">
                <Award className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-extrabold text-[#0B2B2B] mb-1">
                ยินดีด้วย! ทำสำเร็จครบถ้วน
              </h2>
              <p className="text-xs text-[#3D5A5A] mb-3">
                ระบบได้บันทึกประวัติการฝึกส่งให้นักกายภาพบำบัดเรียบร้อยแล้ว
              </p>

              {/* การ์ดคำแนะนำของแพทย์ */}
              <div className="w-full bg-white rounded-2xl p-4 border border-[#1E8A4C]/25 shadow-sm text-left flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#1E8A4C] uppercase tracking-wider">
                  คำแนะนำจากนักกายภาพบำบัด
                </span>
                <p className="text-xs sm:text-sm font-bold text-[#0B2B2B] leading-relaxed">
                  “วันนี้ทำได้ดีมากครับ หัวไหล่เคลื่อนไหวได้มุม 90 องศาตามเกณฑ์ แนะนำให้ดื่มน้ำและพักผ่อนให้เพียงพอ พบกันใหม่ในวันพรุ่งนี้ครับ”
                </p>
                <span className="text-[11px] text-[#3D5A5A] mt-0.5">
                  โดย: กภ. ปิยะ สมบูรณ์ (นักกายภาพบำบัดประจำคลินิก)
                </span>
              </div>

              <div className="w-full mt-4">
                <BigButton
                  variant="strong-primary"
                  className="!min-h-[60px] !text-lg"
                  onClick={handleFullReset}
                >
                  เสร็จสิ้น / ออกจากระบบ ({countdown}s)
                </BigButton>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
              ขอให้ท่านมีสุขภาพร่างกายที่แข็งแรงในทุกๆ วัน
            </div>
          </div>
        )}

      </div>
    </KioskShell>
  );
}
