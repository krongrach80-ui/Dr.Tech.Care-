"use client";

import React, { useState } from "react";
import {
  Settings,
  ScanFace,
  Activity,
  Laptop,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Key,
} from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { systemSettingsFormSchema } from "@/lib/schemas/admin";

export default function AdminSettingsPage() {
  const { currentActor, settings, updateSettings, resetSettings } = useAdminStore();
  const isDirector = currentActor.role === "director";

  // Active tab state
  const [activeTab, setActiveTab] = useState<"face" | "pose" | "kiosk" | "security" | "policy">("kiosk");

  // Local form state
  const [kioskTimeout, setKioskTimeout] = useState<number>(settings.kiosk.idle_timeout_s);
  const [kioskWarning, setKioskWarning] = useState<number>(settings.kiosk.idle_warning_s);
  const [physioScope, setPhysioScope] = useState<"all" | "own">(settings.access_policy.physio_scope);
  const [faceThreshold, setFaceThreshold] = useState<number>(settings.face.distance_threshold);
  const [poseMinVisibility, setPoseMinVisibility] = useState<number>(settings.pose.min_visibility);

  // Kiosk pairing state
  const [pairingCode, setPairingCode] = useState<string | null>("KSK-8821");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Guarding Rule: Physio gets 403 Forbidden!
  if (!isDirector) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-white rounded-3xl border border-rose-200 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full mb-2">
          HTTP 403 FORBIDDEN
        </span>
        <h1 className="text-xl font-black text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed">
          หน้าการตั้งค่าระบบสงวนสิทธิ์เฉพาะผู้อำนวยการโรงพยาบาล (Director) เท่านั้น
          นักกายภาพและคนไข้ไม่ได้รับอนุญาตให้ดูหรือปรับเปลี่ยนการกำหนดค่าระบบ
        </p>
      </div>
    );
  }

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    // Validate with Zod
    const validation = systemSettingsFormSchema.safeParse({
      kioskIdleTimeoutSeconds: Number(kioskTimeout),
      kioskWarningSeconds: Number(kioskWarning),
      physioScope,
    });

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await updateSettings("kiosk", {
        ...settings.kiosk,
        idle_timeout_s: Number(kioskTimeout),
        idle_warning_s: Number(kioskWarning),
      });

      await updateSettings("access_policy", {
        physio_scope: physioScope,
      });

      await updateSettings("face", {
        ...settings.face,
        distance_threshold: Number(faceThreshold),
      });

      await updateSettings("pose", {
        ...settings.pose,
        min_visibility: Number(poseMinVisibility),
      });

      setStatusMessage("บันทึกการตั้งค่าระบบและลงบันทึก Audit Log สำเร็จเรียบร้อย");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // Handle Reset to Defaults
  const handleReset = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น?")) {
      return;
    }
    await resetSettings();
    setKioskTimeout(45);
    setKioskWarning(10);
    setPhysioScope("all");
    setFaceThreshold(0.5);
    setPoseMinVisibility(0.6);
    setStatusMessage("รีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้นสำเร็จ");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ตั้งค่าระบบ (System Settings)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดค่านโยบายความปลอดภัย, ตู้ Kiosk, สิทธิ์นักกายภาพ และเกณฑ์ขั้นต่ำของ AI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-reset-settings"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
          </button>
        </div>
      </div>

      {/* Global Phase Notification Banner */}
      <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <p className="leading-relaxed">
            <strong>หมายเหตุของเฟส 1:</strong> บันทึกค่าระบบและ Audit Log สำเร็จในฐานข้อมูล —{" "}
            <span className="font-bold underline">
              ค่านี้จะมีผลเมื่อเปิดใช้ระบบสแกนใบหน้า/วิเคราะห์ท่าในเฟสถัดไป
            </span>
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#1E8A4C] font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Settings Card with Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("kiosk")}
            className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "kiosk"
                ? "border-[#1E8A4C] text-[#1E8A4C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>1. ตู้ Kiosk & จับคู่</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("policy")}
            className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "policy"
                ? "border-[#1E8A4C] text-[#1E8A4C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. นโยบายสิทธิ์ (physio_scope)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "security"
                ? "border-[#1E8A4C] text-[#1E8A4C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. ความปลอดภัย</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("face")}
            className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "face"
                ? "border-[#1E8A4C] text-[#1E8A4C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ScanFace className="w-4 h-4" />
            <span>4. AI สแกนใบหน้า</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pose")}
            className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "pose"
                ? "border-[#1E8A4C] text-[#1E8A4C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>5. AI วิเคราะห์ท่า</span>
          </button>
        </div>

        {/* Tab Contents */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 text-xs">
          {/* TAB 1: KIOSK */}
          {activeTab === "kiosk" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-slate-800">
                    เวลาหยุดใช้งานก่อนตัดเซสชัน (Idle Timeout) — เกณฑ์ 30–60 วินาที:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      id="input-idle-timeout"
                      min="30"
                      max="60"
                      required
                      value={kioskTimeout}
                      onChange={(e) => setKioskTimeout(Number(e.target.value))}
                      className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-center text-sm"
                    />
                    <span className="font-bold text-slate-600">วินาที (Sec)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    ตามสเปก Master Prompt: ตู้ต้องคืนหน้าแรกหลังคนไข้ไม่เคลื่อนไหว 30 ถึง 60 วินาที
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-bold text-slate-800">
                    เวลาแสดงป๊อปอัปแจ้งเตือนก่อนตัดเซสชัน (Idle Warning):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="5"
                      max="20"
                      required
                      value={kioskWarning}
                      onChange={(e) => setKioskWarning(Number(e.target.value))}
                      className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-center text-sm"
                    />
                    <span className="font-bold text-slate-600">วินาที</span>
                  </div>
                </div>
              </div>

              {/* Kiosk Pairing & Revocation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#1E8A4C]" />
                  การจับคู่ตู้ Kiosk กับคลินิก (Kiosk Device Pairing):
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[11px]">รหัสสำหรับจับคู่ตู้ใหม่ (Pairing Code):</span>
                    <p className="font-mono text-base font-black text-slate-900">
                      {pairingCode ?? "ไม่มีรหัสที่เปิดใช้งาน"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPairingCode(`KSK-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="px-3 py-1.5 rounded-xl bg-[#1E8A4C] text-white font-bold cursor-pointer"
                    >
                      สร้างรหัสใหม่
                    </button>
                    {pairingCode && (
                      <button
                        type="button"
                        onClick={() => setPairingCode(null)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold cursor-pointer"
                      >
                        เพิกถอนรหัส (Revoke)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSION POLICY */}
          {activeTab === "policy" && (
            <div className="flex flex-col gap-4">
              <label className="font-bold text-slate-800">
                นโยบายขอบเขตการเข้าถึงข้อมูลคนไข้ของนักกายภาพ (physio_scope):
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-2xl border flex flex-col gap-2 cursor-pointer transition-all ${
                    physioScope === "all"
                      ? "bg-emerald-50/60 border-[#1E8A4C] shadow-xs"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">all — คนไข้ทั้งหมด (ค่าเริ่มต้น)</span>
                    <input
                      type="radio"
                      name="physioScope"
                      checked={physioScope === "all"}
                      onChange={() => setPhysioScope("all")}
                      className="accent-[#1E8A4C] w-4 h-4"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    นักกายภาพสามารถค้นหา ดูข้อมูลเวชระเบียน และเขียนโน้ตให้คนไข้ทุกคนในโรงพยาบาลได้
                    (เหมาะสำหรับสหวิชาชีพหรือคลินิกรวม)
                  </p>
                </label>

                <label
                  className={`p-4 rounded-2xl border flex flex-col gap-2 cursor-pointer transition-all ${
                    physioScope === "own"
                      ? "bg-emerald-50/60 border-[#1E8A4C] shadow-xs"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">own — เฉพาะคนไข้ที่ตนดูแล</span>
                    <input
                      type="radio"
                      name="physioScope"
                      checked={physioScope === "own"}
                      onChange={() => setPhysioScope("own")}
                      className="accent-[#1E8A4C] w-4 h-4"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    นักกายภาพจะเห็นและจัดการได้เฉพาะคนไข้ที่ตนถูกกำหนดเป็น responsible_physio_id
                    เท่านั้น (จำกัดความเป็นส่วนตัวสูงสุด)
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800">จำกัดการล็อกอินผิด (Lockout):</span>
                <p className="text-2xl font-black text-slate-900">5 ครั้ง</p>
                <span className="text-[10px] text-slate-400">ล็อก 15 นาที เมื่อผิดเกิน 5 ครั้งใน 10 นาที</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800">อายุเซสชันเจ้าหน้าที่สูงสุด:</span>
                <p className="text-2xl font-black text-slate-900">8 ชั่วโมง</p>
                <span className="text-[10px] text-slate-400">ตัดเซสชันอัตโนมัติเพื่อความปลอดภัย</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800">ระยะเวลาเก็บรักษา Audit Log:</span>
                <p className="text-2xl font-black text-slate-900">365 วัน</p>
                <span className="text-[10px] text-slate-400">เก็บในฐานข้อมูล Append-only ถาวร</span>
              </div>
            </div>
          )}

          {/* TAB 4: FACE SCAN */}
          {activeTab === "face" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-800">
                  Cosine Distance Threshold สำหรับยืนยันตัวตนใบหน้า (เกณฑ์ 0.50):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0.30"
                    max="0.80"
                    value={faceThreshold}
                    onChange={(e) => setFaceThreshold(Number(e.target.value))}
                    className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-center"
                  />
                  <span className="text-slate-500 font-mono text-[11px]">
                    (ค่ายิ่งต่ำ ยิ่งเข้มงวด ป้องกันการสวมรอย)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POSE ANALYSIS */}
          {activeTab === "pose" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-800">
                  เกณฑ์ความชัดเจนของข้อต่อขั้นต่ำ (Min Keypoint Visibility):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.05"
                    min="0.30"
                    max="0.90"
                    value={poseMinVisibility}
                    onChange={(e) => setPoseMinVisibility(Number(e.target.value))}
                    className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-center"
                  />
                  <span className="text-slate-500 font-mono text-[11px]">(เกณฑ์แนะนำ 0.60)</span>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              id="btn-save-settings"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
