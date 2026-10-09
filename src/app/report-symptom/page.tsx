"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Send,
  Siren,
  HeartPulse,
} from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { BigButton } from "@/components/kiosk/BigButton";

interface RedFlagItem {
  id: string;
  label: string;
  medicalDescription: string;
}

const RED_FLAGS: readonly RedFlagItem[] = [
  {
    id: "chest_pain",
    label: "เจ็บแน่นหน้าอก ร้าวไปกรามหรือแขนซ้าย",
    medicalDescription: "สงสัยภาวะกล้ามเนื้อหัวใจขาดเลือดเฉียบพลัน (Acute Coronary Syndrome)",
  },
  {
    id: "dyspnea",
    label: "หายใจหอบเหนื่อยรุนแรง หายใจไม่ออกเฉียบพลัน",
    medicalDescription: "ภาวะหายใจล้มเหลวเฉียบพลัน (Acute Respiratory Distress)",
  },
  {
    id: "stroke_fast",
    label: "แขนขาอ่อนแรงครึ่งซีก ปากเบี้ยว พูดไม่ชัดทันที",
    medicalDescription: "สัญญาณเตือนโรคหลอดเลือดสมองฉุกเฉิน (FAST Stroke Signs)",
  },
  {
    id: "syncope",
    label: "วูบ หน้ามืดหมดสติ หรือชาครึ่งซีกรุนแรง",
    medicalDescription: "ภาวะหมดสติเฉียบพลันหรือระบบประสาทบกพร่อง (Acute Syncope)",
  },
];

export default function ReportSymptomPage() {
  const router = useRouter();
  const [painLevel, setPainLevel] = useState<number>(3);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("shoulder");
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const toggleRedFlag = (id: string) => {
    setSelectedRedFlags((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      // หากมีการติ๊กสัญญาณอันตราย (Red Flag) แม้แต่ข้อเดียว ให้ดีดเข้าสู่หน้าฉุกเฉิน 1669 ทันที
      if (next.length > 0) {
        setIsEmergencyActive(true);
        // บันทึกและจำลองแจ้งเตือน Realtime ไปยังนักกายภาพและ ผอ.รพ. ภายใน 3 วินาที
        console.warn("EMERGENCY RED FLAG DISPATCHED:", {
          redFlags: next,
          timestamp: new Date().toISOString(),
          targetNotification: "PHYSICAL_THERAPIST_AND_DIRECTOR",
        });
      }
      return next;
    });
  };

  const handleSubmitNormalReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        router.push("/home");
      }, 2000);
    }, 600);
  };

  return (
    <KioskShell idleTimeoutSeconds={90} enableIdleGuard={!isEmergencyActive}>
      {/* ========================================================================= */}
      {/* โหมดฉุกเฉิน (EMERGENCY 1669 OVERLAY) เมื่อติ๊ก RED FLAG                     */}
      {/* ========================================================================= */}
      {isEmergencyActive ? (
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 text-center animate-pulse">
          <div className="w-full flex items-center justify-between pb-2 border-b border-red-200">
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <Siren className="w-4 h-4 animate-bounce text-red-600" />
              ตรวจพบอาการอันตรายวิกฤต (Red Flag)
            </span>
          </div>

          <div className="w-full flex flex-col items-center my-auto py-2">
            <div className="w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center shadow-xl mb-3 animate-bounce">
              <PhoneCall className="w-12 h-12 stroke-[2.5]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-red-700 tracking-tight mb-1">
              หยุดการฝึกทันที!
            </h1>
            <p className="text-base font-bold text-[#0B2B2B] mb-2">
              กรุณานั่งพัก นิ่ง ๆ และแจ้งเจ้าหน้าที่คลินิก
            </p>

            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 w-full text-left mb-4">
              <p className="text-xs font-bold text-red-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                ระบบได้ส่งสัญญาณแจ้งเตือนฉุกเฉินแล้ว:
              </p>
              <ul className="text-xs text-red-900 space-y-1 list-disc list-inside">
                <li>แจ้งนักกายภาพบำบัดประจำตู้เรียบร้อยแล้ว</li>
                <li>ส่งการแจ้งเตือน Realtime ถึงผู้บริหารโรงพยาบาล</li>
                <li>บันทึก Audit Log หมวดความปลอดภัยวิกฤต</li>
              </ul>
            </div>

            {/* ปุ่มโทรด่วนฉุกเฉิน 1669 */}
            <a
              href="tel:1669"
              className="w-full min-h-[72px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <PhoneCall className="w-8 h-8" />
              <span>โทรสายด่วนฉุกเฉิน 1669</span>
            </a>
          </div>

          <div className="w-full pt-2 border-t border-red-200">
            <button
              type="button"
              onClick={() => {
                setIsEmergencyActive(false);
                setSelectedRedFlags([]);
              }}
              className="text-xs text-[#527070] underline cursor-pointer"
            >
              กดผิด / ยกเลิกสถานะฉุกเฉิน
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ฟอร์มบันทึกอาการไม่พึงประสงค์ตามปกติ                                       */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้าหลักคนไข้</span>
            </button>
            <span className="text-xs font-bold text-[#1E8A4C]">แจ้งอาการไม่พึงประสงค์</span>
          </div>

          {submittedSuccess ? (
            <div className="w-full flex flex-col items-center justify-center my-auto py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-[#1E8A4C] mb-3" />
              <h2 className="text-2xl font-bold text-[#0B2B2B] mb-1">บันทึกข้อมูลเรียบร้อยแล้ว</h2>
              <p className="text-sm text-[#3D5A5A]">นักกายภาพบำบัดจะตรวจสอบและปรับโปรแกรมการฝึกของท่าน</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitNormalReport} className="w-full flex flex-col gap-4 my-auto py-2">
              <div>
                <label className="block text-xs font-bold text-[#0B2B2B] mb-1">
                  1. ตำแหน่งที่รู้สึกไม่สบายตัว / มีอาการ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "shoulder", label: "ข้อไหล่ / สะบัก" },
                    { id: "knee", label: "ข้อเข่า / ขา" },
                    { id: "back", label: "หลัง / เอว" },
                    { id: "neck", label: "ต้นคอ / ศีรษะ" },
                  ].map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setSelectedBodyPart(part.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedBodyPart === part.id
                          ? "bg-emerald-100 border-[#1E8A4C] text-[#1E8A4C]"
                          : "bg-white border-slate-200 text-[#3D5A5A]"
                      }`}
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0B2B2B] mb-1">
                  <span>2. ระดับความเจ็บปวด (Pain Score)</span>
                  <span className="text-[#1E8A4C] text-sm">{painLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full accent-[#1E8A4C] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#527070] mt-0.5">
                  <span>ไม่เจ็บเลย (0)</span>
                  <span>เจ็บปานกลาง (5)</span>
                  <span>เจ็บทนไม่ไหว (10)</span>
                </div>
              </div>

              {/* สัญญาณอันตราย Red Flags */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3">
                <span className="block text-xs font-extrabold text-amber-900 mb-2 flex items-center gap-1">
                  <HeartPulse className="w-4 h-4 text-amber-700" />
                  3. ตรวจสอบสัญญาณอันตรายฉุกเฉิน (หากมีให้เลือก)
                </span>
                <div className="flex flex-col gap-2">
                  {RED_FLAGS.map((rf) => {
                    const isChecked = selectedRedFlags.includes(rf.id);
                    return (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => toggleRedFlag(rf.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-start gap-2 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-red-50 border-red-500 text-red-700"
                            : "bg-white border-amber-200/80 text-[#0B2B2B]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                            isChecked ? "bg-red-600 border-red-600 text-white" : "border-slate-300"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                          <div>{rf.label}</div>
                          <div className="text-[10px] font-normal text-[#527070] mt-0.5">
                            {rf.medicalDescription}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <BigButton
                variant="strong-primary"
                type="submit"
                className="!min-h-[56px] !text-base"
                disabled={isSubmitting}
                icon={<Send className="w-5 h-5" />}
              >
                {isSubmitting ? "กำลังส่งข้อมูล..." : "บันทึกและส่งรายงานให้อาจารย์กายภาพ"}
              </BigButton>
            </form>
          )}

          <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
            ข้อมูลอาการของท่านจะถูกส่งต่อให้นักกายภาพบำบัดผู้รับผิดชอบดูแลโดยตรง
          </div>
        </div>
      )}
    </KioskShell>
  );
}
