"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, ChevronLeft, Lock, FileText } from "lucide-react";
import { BigButton } from "./BigButton";

export const CONSENT_VERSION = "1.0";

export const CONSENT_STATEMENT_TH = `ข้อตกลงและหนังสือให้ความยินยอมการประมวลผลข้อมูลชีวมิติ (Biometric Consent)
เวอร์ชัน: 1.0 — ศูนย์กายภาพบำบัด Dr.Tech.Care

1. วัตถุประสงค์: ข้อมูลใบหน้าของท่านจะถูกสกัดเป็นเวกเตอร์ตัวเลข 128 มิติ (128-d Vector Embedding) เพื่อยืนยันตัวตนและดึงประวัติการฝึกกายภาพบำบัด
2. การคุ้มครองภาพถ่าย (Zero Image Retention): ระบบประมวลผลและทำลายภาพถ่ายทิ้งทันทีบนเครื่อง ไม่มีการบันทึกภาพถ่ายหรือวิดีโอลงในระบบ
3. สิทธิตามกฎหมาย PDPA: ท่านมีสิทธิขอเพิกถอนความยินยอมและขอลบข้อมูลชีวมิติ (Right to Erasure) ได้ตลอดเวลาโดยติดต่อเจ้าหน้าที่คลินิก
4. การรักษาความปลอดภัย: เวกเตอร์ใบหน้าถูกควบคุมการเข้าถึงด้วย Row-Level Security (RLS) และตรวจสอบความถูกต้องด้วย Audit Chain`;

// SHA-256 ของ CONSENT_STATEMENT_TH
// e.g. คำนวณคงที่หรือ dynamic
export const CONSENT_TEXT_SHA256 =
  "404e76a6cf45bf4817dca574bb4ba1a646ff47ee4ec4ffab607cfabdd3c6dae3";

export interface ConsentSheetProps {
  purpose: "login" | "register";
  onAccept: (consent: { version: string; sha256: string; accepted: true }) => void;
  onCancel: () => void;
  className?: string;
}

export function ConsentSheet({
  purpose,
  onAccept,
  onCancel,
  className = "",
}: ConsentSheetProps) {
  // กฎเหล็ก PDPA: ห้ามติ๊กล่วงหน้า (Un-prechecked default: false)
  const [isChecked, setIsChecked] = useState(false);

  const handleSubmit = () => {
    if (!isChecked) return;
    onAccept({
      version: CONSENT_VERSION,
      sha256: CONSENT_TEXT_SHA256,
      accepted: true,
    });
  };

  return (
    <div
      className={`flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 select-none ${className}`}
    >
      {/* ส่วนหัวบาร์ */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>กลับหน้าแรก</span>
        </button>
        <span className="text-xs font-bold text-[#1E8A4C]">
          {purpose === "login" ? "ความยินยอมเข้าสู่ระบบ" : "ความยินยอมสมัครบัญชีใหม่"}
        </span>
      </div>

      {/* เนื้อหากลาง */}
      <div className="w-full flex flex-col items-center my-auto py-2">
        <div className="w-14 h-14 rounded-2xl bg-[#1E8A4C]/15 text-[#1E8A4C] flex items-center justify-center mb-2">
          <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h2 className="text-xl font-extrabold text-[#0B2B2B] text-center mb-0.5">
          {purpose === "login"
            ? "ยินยอมสแกนใบหน้าเพื่อเข้าสู่ระบบ"
            : "ความยินยอมข้อมูลชีวมิติ (PDPA)"}
        </h2>
        <p className="text-xs text-[#3D5A5A] text-center mb-3">
          ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
        </p>

        {/* กล่องข้อตกลง PDPA */}
        <div className="w-full bg-white rounded-2xl p-4 border border-slate-200 text-xs text-[#0B2B2B] leading-relaxed space-y-2 max-h-44 overflow-y-auto shadow-inner text-left">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#1E8A4C] pb-1 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              ข้อตกลงชีวมิติเวอร์ชัน {CONSENT_VERSION}
            </span>
            <span className="font-mono text-slate-400 text-[10px]">
              SHA-256: {CONSENT_TEXT_SHA256.substring(0, 8)}...
            </span>
          </div>

          <p className="font-bold text-slate-800 pt-1">วัตถุประสงค์และมาตรการคุ้มครอง:</p>
          <p>1. ข้อมูลใบหน้าจะถูกแปลงเป็นค่าเวกเตอร์ตัวเลข 128 มิติ (Embedding) ทันทีบนอุปกรณ์</p>
          <p>2. ระบบไม่มีการบันทึกภาพถ่ายจริงหรือวิดีโอ (Zero Image Retention)</p>
          <p>3. ข้อมูลใช้เพื่อการระบุตัวตนและดึงแผนการฝึกกายภาพบำบัดของท่านเท่านั้น</p>
          <p>4. ท่านสามารถแจ้งเจ้าหน้าที่เพื่อขอลบข้อมูลเวกเตอร์ใบหน้าได้ตลอดเวลา</p>
        </div>

        {/* Checkbox (กฎเหล็ก: ห้ามติ๊กเครื่องหมายล่วงหน้า) */}
        <label
          htmlFor="consent-checkbox"
          className="w-full flex items-start gap-3 mt-3.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 cursor-pointer hover:bg-emerald-100/50 transition-colors"
        >
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded-md accent-[#1E8A4C] cursor-pointer flex-shrink-0"
          />
          <span className="text-xs font-semibold text-[#0B2B2B] leading-snug">
            ข้าพเจ้าได้อ่าน เข้าใจ และให้ความยินยอมในการประมวลผลข้อมูลชีวมิติใบหน้าตามข้อตกลงข้างต้น
          </span>
        </label>

        {/* ปุ่มยินยอม & ไม่ยินยอม */}
        <div className="w-full flex flex-col gap-2 mt-4">
          <BigButton
            variant="strong-primary"
            className={`!min-h-[58px] !text-base transition-opacity ${
              !isChecked ? "opacity-40 cursor-not-allowed" : "opacity-100"
            }`}
            onClick={handleSubmit}
            disabled={!isChecked}
            icon={<CheckCircle2 className="w-5 h-5" />}
          >
            {isChecked ? "ยินยอมและเริ่มสแกนใบหน้า" : "กรุณาติ๊กให้ความยินยอมก่อน"}
          </BigButton>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-xs font-bold text-[#3D5A5A] hover:text-[#0B2B2B] transition-colors cursor-pointer"
          >
            ไม่ยินยอม (กลับหน้าแรก)
          </button>
        </div>
      </div>

      {/* ท้ายบาร์ */}
      <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3 text-[#1E8A4C]" />
        <span>เข้ารหัสและจัดเก็บตามมาตรฐาน PDPA ไม่มีการส่งภาพถ่ายออกจากเครื่อง</span>
      </div>
    </div>
  );
}
