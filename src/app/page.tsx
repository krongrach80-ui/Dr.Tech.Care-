"use client";

import React, { useState, useSyncExternalStore } from "react";
import {
  Activity,
  ShieldCheck,
  Wifi,
  WifiOff,
  UserCheck,
  UserPlus,
  HelpCircle,
  Keyboard as KeyboardIcon,
  X,
} from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";
import { ThaiKeyboard } from "@/components/kiosk/ThaiKeyboard";
import { NumPad } from "@/components/kiosk/NumPad";
import { formatThaiDate } from "@/lib/thai";
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

// Clock subscription via useSyncExternalStore for deterministic SSR / Turbopack Prerender
function subscribeClock(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}

function getClockSnapshot() {
  return Date.now();
}

function getClockServerSnapshot() {
  return 0;
}

export default function KioskHomePage() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const clockTimestamp = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot
  );

  const [flowStep, setFlowStep] = useState<"initial" | "confirm_new">("initial");
  const [activeModal, setActiveModal] = useState<"none" | "demo_keyboard" | "demo_numpad">("none");
  const [testInputValue, setTestInputValue] = useState<string>("");

  const handleHasAccount = () => {
    // Flow B: ล็อกอินใบหน้า (เตรียมไปหน้า /auth/login/scan ใน M3)
    alert("ระบบกำลังเตรียมกล้องสแกนใบหน้าสำหรับผู้มีบัญชี (Flow B)");
  };

  const handleNoAccount = () => {
    setFlowStep("confirm_new");
  };

  const handleConfirmRegisterYes = () => {
    // Flow A: สมัครสมาชิกใหม่ (เตรียมไปหน้า /auth/register/consent ใน M3)
    alert("เข้าสู่ขั้นตอนอ่านเงื่อนไขความยินยอมและสแกนใบหน้า (Flow A)");
  };

  const handleConfirmRegisterNo = () => {
    setFlowStep("initial");
  };

  return (
    <KioskShell idleTimeoutSeconds={60}>
      <div className="flex-1 flex flex-col justify-between p-12 text-[#1F3A4D] h-full">
        {/* Header Section: Status, Logo, Clock */}
        <header className="flex items-center justify-between border-b-2 border-[#1F3A4D]/10 pb-6">
          {/* Logo & Clinic Name */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[#2FB39A] flex items-center justify-center shadow-lg shadow-[#2FB39A]/20">
              <Activity className="w-12 h-12 text-[#1F3A4D] stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#1F3A4D] leading-none">
                {thMessages.app.name}
              </h1>
              <p className="text-xl font-medium text-[#536E80] mt-1">
                {thMessages.app.tagline}
              </p>
            </div>
          </div>

          {/* Kiosk Status & Buddhist Era Clock */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3 bg-white/80 px-5 py-2.5 rounded-full border border-[#1F3A4D]/10 shadow-sm">
              {isOnline ? (
                <>
                  <Wifi className="w-6 h-6 text-[#1E8C78]" />
                  <span className="text-lg font-semibold text-[#1E8C78]">
                    {thMessages.kiosk.status.online}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-6 h-6 text-[#C0392B]" />
                  <span className="text-lg font-semibold text-[#C0392B]">
                    {thMessages.kiosk.status.offline}
                  </span>
                </>
              )}
            </div>
            <div className="text-2xl font-bold text-[#1F3A4D]">
              {clockTimestamp > 0 ? (
                formatThaiDate(clockTimestamp, { formatStyle: "full", includeTime: true })
              ) : (
                <span>กำลังโหลดเวลา...</span>
              )}
            </div>
          </div>
        </header>

        {/* Medical Disclaimer Banner (Mandatory by Section 0 & 8) */}
        <div className="w-full bg-amber-50/90 border-2 border-[#C77700]/30 rounded-2xl p-4 flex items-center justify-center gap-3 text-center my-4">
          <ShieldCheck className="w-8 h-8 text-[#C77700] flex-shrink-0" />
          <span className="text-xl font-bold text-[#C77700]">
            {thMessages.app.disclaimer}
          </span>
        </div>

        {/* Center Decision Card: One Page = One Decision */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full my-auto">
          {flowStep === "initial" ? (
            <div className="w-full bg-white/95 backdrop-blur-md rounded-[40px] p-12 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center gap-10 text-center animate-in zoom-in-95 duration-200">
              <div className="w-28 h-28 rounded-full bg-[#E4F0FC] text-[#3F7FD0] flex items-center justify-center shadow-inner">
                <HelpCircle className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-5xl font-black text-[#1F3A4D] leading-tight">
                  {thMessages.onboarding.has_account_question}
                </h2>
                <p className="text-2xl text-[#536E80] mt-3">
                  กรุณาเลือกเพื่อดำเนินการต่อเข้าสู่การออกกำลังกาย
                </p>
              </div>

              <div className="flex flex-col gap-6 w-full">
                {/* Contrast Compliant Green Button */}
                <BigButton
                  variant="primary-green"
                  icon={<UserCheck className="w-10 h-10 stroke-[2.5]" />}
                  onClick={handleHasAccount}
                >
                  {thMessages.onboarding.btn_has_account}
                </BigButton>

                {/* Contrast Compliant Blue Button */}
                <BigButton
                  variant="primary-blue"
                  icon={<UserPlus className="w-10 h-10 stroke-[2.5]" />}
                  onClick={handleNoAccount}
                >
                  {thMessages.onboarding.btn_no_account}
                </BigButton>
              </div>
            </div>
          ) : (
            <div className="w-full bg-white/95 backdrop-blur-md rounded-[40px] p-12 border-3 border-[#1F3A4D]/10 shadow-2xl flex flex-col items-center gap-10 text-center animate-in zoom-in-95 duration-200">
              <div className="w-28 h-28 rounded-full bg-[#E8F8F1] text-[#2FB39A] flex items-center justify-center shadow-inner">
                <UserPlus className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-5xl font-black text-[#1F3A4D] leading-tight">
                  {thMessages.onboarding.confirm_register_question}
                </h2>
                <p className="text-2xl text-[#536E80] mt-3">
                  ระบบจะใช้เวลาประมาณ 1 นาทีเพื่อลงทะเบียนใบหน้าและข้อมูลเบื้องต้น
                </p>
              </div>

              <div className="flex flex-col gap-6 w-full">
                <BigButton
                  variant="primary-green"
                  onClick={handleConfirmRegisterYes}
                >
                  {thMessages.onboarding.btn_yes}
                </BigButton>

                <BigButton
                  variant="ghost"
                  onClick={handleConfirmRegisterNo}
                >
                  {thMessages.onboarding.btn_no}
                </BigButton>
              </div>
            </div>
          )}
        </main>

        {/* Footer Area: Component Testing Sandbox + Guide */}
        <footer className="pt-6 border-t border-[#1F3A4D]/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveModal("demo_keyboard")}
              className="px-5 py-3 rounded-2xl bg-white/80 hover:bg-white border border-[#1F3A4D]/20 text-[#1F3A4D] text-lg font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <KeyboardIcon className="w-6 h-6" />
              <span>ทดสอบแป้นพิมพ์ไทย</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("demo_numpad")}
              className="px-5 py-3 rounded-2xl bg-white/80 hover:bg-white border border-[#1F3A4D]/20 text-[#1F3A4D] text-lg font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <span className="text-2xl font-black leading-none">123</span>
              <span>ทดสอบแป้นตัวเลข</span>
            </button>
          </div>

          <div className="text-base text-[#536E80] font-medium">
            Dr.Tech.Care Kiosk Edition 1080×1920
          </div>
        </footer>
      </div>

      {/* Modal for Testing Virtual Thai Keyboard */}
      {activeModal === "demo_keyboard" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-6">
          <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-2xl font-bold text-[#1F3A4D]">ทดสอบแป้นพิมพ์เสมือนจริงบนตู้</h3>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="p-2 rounded-full hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-8 h-8 text-[#1F3A4D]" />
              </button>
            </div>

            <input
              type="text"
              inputMode="none"
              readOnly
              value={testInputValue}
              placeholder="แตะแป้นพิมพ์ด้านล่างเพื่อพิมพ์..."
              className="p-4 bg-zinc-50 border-2 border-[#1F3A4D]/20 rounded-2xl min-h-[72px] text-3xl font-bold text-[#1F3A4D] w-full outline-none focus:border-[#2FB39A]"
            />

            <ThaiKeyboard
              onChar={(c) => setTestInputValue((prev) => prev + c)}
              onBackspace={() => setTestInputValue((prev) => prev.slice(0, -1))}
              onSpace={() => setTestInputValue((prev) => prev + " ")}
              onClose={() => setActiveModal("none")}
            />
          </div>
        </div>
      )}

      {/* Modal for Testing Virtual NumPad */}
      {activeModal === "demo_numpad" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-2xl font-bold text-[#1F3A4D]">ทดสอบแป้นตัวเลขบนตู้</h3>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="p-2 rounded-full hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-8 h-8 text-[#1F3A4D]" />
              </button>
            </div>

            <input
              type="text"
              inputMode="none"
              readOnly
              value={testInputValue || "0"}
              className="p-4 bg-zinc-50 border-2 border-[#1F3A4D]/20 rounded-2xl min-h-[80px] text-center text-5xl font-black text-[#1F3A4D] w-full outline-none"
            />

            <NumPad
              onDigit={(d) => setTestInputValue((prev) => (prev.length < 10 ? prev + d : prev))}
              onBackspace={() => setTestInputValue((prev) => prev.slice(0, -1))}
              onClear={() => setTestInputValue("")}
              onConfirm={() => setActiveModal("none")}
            />
          </div>
        </div>
      )}
    </KioskShell>
  );
}
