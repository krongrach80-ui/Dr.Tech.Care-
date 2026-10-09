"use client";

import React, { useState } from "react";
import {
  User,
  HeartPulse,
  Calendar,
  ArrowRight,
  History,
  LogOut,
  X,
  Award,
  Clock,
} from "lucide-react";
import { BigButton } from "./BigButton";
import { maskName } from "@/lib/thai";

export interface ExercisePlanItem {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "pending" | "completed";
}

export interface TrainingHistoryItem {
  id: string;
  dateThai: string;
  exerciseTitle: string;
  repsAchieved: number;
  targetReps: number;
  accuracyScore: number;
  physioNote: string;
}

export interface PatientDashboardProps {
  patientFirstName: string;
  patientLastName: string;
  patientGender?: "male" | "female" | "other";
  patientAge?: number;
  patientHn?: string;
  physioName: string;
  clinicBranch?: string;
  countdownSeconds: number;
  plans?: ExercisePlanItem[];
  historyList?: TrainingHistoryItem[];
  onStartExercise: () => void;
  onLogout: () => void;
  onExtendTimer: () => void;
}

const DEFAULT_PLANS: ExercisePlanItem[] = [
  {
    id: "plan-1",
    order: 1,
    title: "กายภาพบำบัด: ยกแขนบริหารไหล่",
    description: "เป้าหมาย: 5 ครั้ง (รักษามุม 90° นาน 2 วินาที)",
    status: "pending",
  },
  {
    id: "plan-2",
    order: 2,
    title: "ฝึกสมอง: ทายภาพผลไม้เพื่อสุขภาพ",
    description: "เป้าหมาย: 1 ข้อ เพื่อกระตุ้นความจำและสมาธิ",
    status: "pending",
  },
];

const DEFAULT_HISTORY: TrainingHistoryItem[] = [
  {
    id: "hist-1",
    dateThai: "09 ต.ค. 2569",
    exerciseTitle: "ท่ายกแขนบริหารข้อไหล่ 90°",
    repsAchieved: 5,
    targetReps: 5,
    accuracyScore: 96,
    physioNote: "ท่าทางมั่นคงขึ้นมาก ข้อไหล่เคลื่อนไหวได้ลื่นไหล",
  },
  {
    id: "hist-2",
    dateThai: "07 ต.ค. 2569",
    exerciseTitle: "ท่ายกแขนบริหารข้อไหล่ 90°",
    repsAchieved: 5,
    targetReps: 5,
    accuracyScore: 92,
    physioNote: "ระวังอย่าเกร็งกล้ามเนื้อคอขณะยกแขน",
  },
  {
    id: "hist-3",
    dateThai: "05 ต.ค. 2569",
    exerciseTitle: "ท่าเหยียดแขนระดับอก",
    repsAchieved: 5,
    targetReps: 5,
    accuracyScore: 88,
    physioNote: "เริ่มต้นการฝึกวันแรก ทำได้ดีตามเกณฑ์",
  },
];

export function PatientDashboard({
  patientFirstName,
  patientLastName,
  patientGender = "male",
  patientAge = 72,
  patientHn = "69-00124",
  physioName = "กภ. ปิยะ สมบูรณ์",
  clinicBranch = "คลินิกกายภาพบำบัดฟื้นฟูข้อต่อและกล้ามเนื้อ",
  countdownSeconds,
  plans = DEFAULT_PLANS,
  historyList = DEFAULT_HISTORY,
  onStartExercise,
  onLogout,
  onExtendTimer,
}: PatientDashboardProps) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const maskedFull = maskName(patientFirstName, patientLastName);
  const genderText = patientGender === "male" ? "ชาย" : patientGender === "female" ? "หญิง" : "ทั่วไป";

  return (
    <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 select-none">
      
      {/* 1. แถบส่วนหัว: ข้อมูลคนไข้ + ปุ่มออกจากระบบ พร้อมเวลานับถอยหลัง */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-[#0B2B2B]/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#0B2B2B] leading-tight">
              สวัสดีครับ คุณ{maskedFull}
            </span>
            <span className="text-[11px] text-[#3D5A5A]">
              HN: {patientHn} • เพศ {genderText} • อายุ {patientAge} ปี
            </span>
          </div>
        </div>

        {/* ปุ่มออกจากระบบ + แสดงเวลาที่เหลือก่อน Auto Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          title="ออกจากระบบทันที"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออก ({countdownSeconds}s)</span>
        </button>
      </div>

      {/* 2. ส่วนเนื้อหาหลัก: ข้อมูลนักกายภาพ และ สถานะแผนการฝึกวันนี้ */}
      <div className="w-full flex flex-col my-auto py-2">
        
        {/* การ์ดนักกายภาพบำบัดผู้ดูแล */}
        <div className="w-full bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3 mb-3 text-left">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-bold flex-shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#1E8A4C]">นักกายภาพบำบัดผู้ดูแล</span>
            <span className="text-sm sm:text-base font-extrabold text-[#0B2B2B]">{physioName}</span>
            <span className="text-[10px] text-[#527070]">{clinicBranch}</span>
          </div>
        </div>

        {/* สถานะแผนการฝึกประจำวันนี้ */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2B2B]">
            <Calendar className="w-4 h-4 text-[#1E8A4C]" />
            <span>แผนการฝึกวันนี้ ({plans.length} รายการ)</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            พร้อมเริ่มฝึกทันที
          </span>
        </div>

        {/* รายการภารกิจการฝึก 2 รายการ */}
        <div className="w-full flex flex-col gap-2.5">
          {plans.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-white rounded-2xl border-2 border-[#1E8A4C]/30 shadow-sm flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#1E8A4C] flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  {item.order}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-bold text-[#0B2B2B]">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#3D5A5A]">
                    {item.description}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#1E8A4C] bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">
                รอทำ
              </span>
            </div>
          ))}
        </div>

        {/* 3. ส่วนปุ่มการทำงานหลัก: ปุ่มใหญ่ "เริ่มทำกายภาพ" + ปุ่มรอง "ดูประวัติการฝึก" */}
        <div className="w-full flex flex-col gap-3 mt-4">
          
          {/* ปุ่มหลัก: เริ่มทำกายภาพ (สูง >= 68-74px ตาม Strong Care) */}
          <BigButton
            variant="strong-primary"
            className="!min-h-[68px] sm:!min-h-[72px] !text-xl"
            onClick={onStartExercise}
            icon={<ArrowRight className="w-6 h-6" />}
          >
            เริ่มทำกายภาพ
          </BigButton>

          {/* ปุ่มรอง: ดูประวัติการฝึก (สูง >= 64px) */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="
              w-full min-h-[58px] sm:min-h-[64px] px-5 py-3
              rounded-2xl
              bg-[#6FD67F] hover:bg-[#5EC76E] active:bg-[#4DB25D]
              text-[#0B2B2B] font-bold text-base sm:text-lg
              shadow-md shadow-[#6FD67F]/20
              border border-[#4EA85D]/40
              flex items-center justify-center gap-2.5
              transition-all duration-150 active:scale-[0.98]
              cursor-pointer
            "
          >
            <History className="w-5 h-5 text-[#0B2B2B]" />
            <span>ดูประวัติการฝึก</span>
          </button>
        </div>

      </div>

      {/* 4. ส่วนด้านล่างสุด: แจ้ง Auto-Logout และปุ่มต่อเวลา */}
      <div className="w-full flex items-center justify-between pt-2.5 border-t border-[#0B2B2B]/10 text-[11px] text-[#527070] flex-shrink-0">
        <span>หากไม่มีการแตะจอ จะออกจากระบบใน {countdownSeconds} วินาที</span>
        <button
          type="button"
          onClick={onExtendTimer}
          className="text-xs font-bold text-[#1E8A4C] hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
        >
          + เพิ่มเวลา 45s
        </button>
      </div>

      {/* 5. Modal ดูประวัติการฝึก (Training History Modal) */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-[#1E8A4C]/30 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto text-left animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#1E8A4C]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B2B2B]">
                    ประวัติการฝึกกายภาพ
                  </h3>
                  <span className="text-[11px] text-[#527070]">
                    คุณ{maskedFull} (HN: {patientHn})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#3D5A5A]">
              บันทึกผลการฝึก 3 ครั้งล่าสุด โดยนักกายภาพบำบัด {physioName}
            </p>

            <div className="flex flex-col gap-2.5">
              {historyList.map((hist) => (
                <div
                  key={hist.id}
                  className="p-3 rounded-2xl bg-[#F4FBF7] border border-emerald-200/80 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B2B2B]">
                      {hist.exerciseTitle}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      คะแนน {hist.accuracyScore}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#527070]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>วันที่ {hist.dateThai}</span>
                    <span>•</span>
                    <span>ทำสำเร็จ {hist.repsAchieved}/{hist.targetReps} ครั้ง</span>
                  </div>

                  <div className="bg-white rounded-xl p-2 border border-slate-200 text-[11px] text-[#3D5A5A] mt-1">
                    <span className="font-bold text-[#1E8A4C]">คำแนะนำ: </span>
                    <span>{hist.physioNote}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-3 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-sm font-bold shadow transition-all cursor-pointer mt-1"
            >
              ปิดหน้าต่างประวัติ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
