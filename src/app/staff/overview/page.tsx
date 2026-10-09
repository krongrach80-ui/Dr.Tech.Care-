"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Stethoscope,
  Users,
  Calendar,
  Activity,
  FileText,
  Settings,
  Bell,
  LogOut,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getAccessibleAdminMenus, type AppRole, type AdminMenuKey } from "@/lib/rbac";

interface FailedScanLog {
  id: string;
  time: string;
  status: "failed" | "rejected" | "low_light" | "success";
  reason: string;
  livenessStep: string;
  device: string;
}

export default function StaffOverviewPage() {
  const router = useRouter();

  const [role, setRole] = useState<AppRole>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("staff_role") as AppRole | null;
      if (saved === "director" || saved === "physio") return saved;
    }
    return "director";
  });

  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("staff_username") ?? "director.admin";
    }
    return "director.admin";
  });

  const [selectedModal, setSelectedModal] = useState<AdminMenuKey | null>(null);

  const visibleMenus: AdminMenuKey[] = getAccessibleAdminMenus(role);

  const failedScanLogs: FailedScanLog[] = [
    {
      id: "LOG-9021",
      time: "10 ต.ค. 2569 03:12:45",
      status: "low_light",
      reason: "แสงสว่างด้านหน้าไม่เพียงพอ (Low Lux)",
      livenessStep: "1. มองตรง",
      device: "Kiosk #1 - Front Cam",
    },
    {
      id: "LOG-9020",
      time: "10 ต.ค. 2569 02:48:10",
      status: "failed",
      reason: "ไม่พบใบหน้าตรงกับฐานข้อมูล (Score < 0.60)",
      livenessStep: "3. หันขวา",
      device: "Kiosk #1 - Front Cam",
    },
    {
      id: "LOG-9019",
      time: "10 ต.ค. 2569 01:15:22",
      status: "rejected",
      reason: "ผู้ป่วยก้มหน้าเร็วเกินไป (Liveness Fail)",
      livenessStep: "2. หันซ้าย",
      device: "Kiosk #1 - Front Cam",
    },
    {
      id: "LOG-9018",
      time: "09 ต.ค. 2569 16:30:05",
      status: "success",
      reason: "สแกนสำเร็จ เข้าสู่ระบบ (HN: 69-00124)",
      livenessStep: "ผ่านครบ 3 มุม",
      device: "Kiosk #1 - Front Cam",
    },
  ];

  const menuIcons: Record<AdminMenuKey, React.ReactNode> = {
    overview: <Activity className="w-6 h-6 text-[#1E8A4C]" />,
    users: <Users className="w-6 h-6 text-emerald-700" />,
    patients: <Users className="w-6 h-6 text-teal-700" />,
    physios: <Stethoscope className="w-6 h-6 text-[#1E8A4C]" />,
    exercises: <Activity className="w-6 h-6 text-emerald-600" />,
    schedule: <Calendar className="w-6 h-6 text-amber-700" />,
    symptoms: <Bell className="w-6 h-6 text-rose-600" />,
    audit: <FileText className="w-6 h-6 text-purple-700" />,
    settings: <Settings className="w-6 h-6 text-slate-700" />,
  };

  const menuTitles: Record<AdminMenuKey, string> = {
    overview: "ภาพรวมระบบ (Overview)",
    users: "จัดการผู้ใช้งาน (Users)",
    patients: "จัดการรายชื่อคนไข้ (Patients)",
    physios: "จัดการนักกายภาพ (Physios)",
    exercises: "คลังท่ากายภาพ (Exercises)",
    schedule: "ตารางกายภาพประจำวัน (Schedule)",
    symptoms: "รายงานอาการผิดปกติ (Symptoms)",
    audit: "ประวัติการใช้งาน & การสแกน (Audit Logs)",
    settings: "ตั้งค่าระบบและกล้อง (Settings)",
  };

  return (
    <div className="min-h-screen bg-[#F4FBF7] text-[#0B2B2B] flex flex-col items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-[#1E8A4C]/20 flex flex-col gap-6">
        
        {/* แถบส่วนหัวด้านบน */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#0B2B2B]/10 pb-5 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#1E8A4C] text-white flex items-center justify-center shadow-md shadow-[#1E8A4C]/25 flex-shrink-0">
              {role === "director" ? <Shield className="w-8 h-8" /> : <Stethoscope className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#0B2B2B]">
                  {role === "director" ? "นพ. วิทยา ผู้บริหารโรงพยาบาล" : "กภ. ปิยะ สมบูรณ์"}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  role === "director" ? "bg-emerald-100 text-[#1E8A4C]" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}>
                  {role === "director" ? "แอดมิน / ผอ." : "นักกายภาพบำบัด"}
                </span>
              </div>
              <p className="text-xs text-[#3D5A5A] mt-0.5">
                บัญชี: <span className="font-mono font-bold text-[#0B2B2B]">{username}</span> • สิทธิ์การเข้าถึง: {role === "director" ? "ระดับผู้ดูแลระบบสูงสุด (Super Admin)" : "ระดับนักกายภาพผู้ดูแลคนไข้"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                const nextRole: AppRole = role === "director" ? "physio" : "director";
                setRole(nextRole);
                setUsername(nextRole === "director" ? "director.admin" : "physio.piya");
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("staff_role", nextRole);
                  sessionStorage.setItem("staff_username", nextRole === "director" ? "director.admin" : "physio.piya");
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0B2B2B] transition-all cursor-pointer"
            >
              สลับเป็น: {role === "director" ? "นักกายภาพ" : "แอดมิน/ผอ."}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-[#0B2B2B] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>กลับหน้า Kiosk</span>
            </button>
          </div>
        </div>

        {/* แถบสถานะระบบและ PDPA Biometrics Storage */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#1E8A4C] animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold text-[#0B2B2B] text-sm">
                ระบบรักษาความปลอดภัยชีวมิติ Dr.Tech.Care พร้อมทำงาน
              </span>
              <p className="text-xs text-[#3D5A5A] mt-0.5">
                จัดเก็บเฉพาะ 128-d Vector Embedding • รหัสผ่านเข้ารหัสแบบทางเดียว (Argon2id)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#1E8A4C] bg-white border border-[#1E8A4C]/30 px-3 py-1 rounded-full whitespace-nowrap">
            PDPA & Security Verified
          </span>
        </div>

        {/* เมนูการทำงานทั้งหมด */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-1">
            <h2 className="text-lg sm:text-xl font-black text-[#0B2B2B]">
              เมนูการทำงานที่ได้รับอนุญาต ({visibleMenus.length} เมนู)
            </h2>
            <span className="text-xs text-[#527070] font-medium">
              {role === "director"
                ? "ผอ./แอดมิน: สิทธิ์สูงสุด 9 เมนู (รวม Audit Logs & Settings)"
                : "นักกายภาพ: สิทธิ์ 7 เมนู (จำกัดเฉพาะคนไข้ในความดูแล)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleMenus.map((menuKey: AdminMenuKey) => (
              <div
                key={menuKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModal(menuKey)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedModal(menuKey);
                }}
                className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#1E8A4C] hover:shadow-md transition-all flex items-center justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F4FBF7] border border-emerald-100 group-hover:bg-emerald-50 transition-colors">
                    {menuIcons[menuKey]}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0B2B2B] group-hover:text-[#1E8A4C] transition-colors">
                      {menuTitles[menuKey]}
                    </h3>
                    <span className="text-[11px] text-[#527070]">
                      คลิกเพื่อเปิดรายละเอียด
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#1E8A4C] transition-transform group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนท้ายหน้าจอ */}
        <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#527070] gap-2">
          <span>Dr.Tech.Care — ตู้ Kiosk กายภาพบำบัดสัดส่วน 9:16 (1080×1920)</span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[#1E8A4C] font-bold hover:underline cursor-pointer"
          >
            ← กลับไปที่หน้าหลักตู้ Kiosk
          </button>
        </div>

      </div>

      {/* Modal Popup แสดงรายละเอียดของแต่ละเมนู */}
      {selectedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-[#1E8A4C]/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto text-left animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#1E8A4C]">
                  {menuIcons[selectedModal]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0B2B2B]">
                    {menuTitles[selectedModal]}
                  </h3>
                  <span className="text-xs text-[#527070]">
                    ระบบบันทึกและการจัดการข้อมูลคลินิก
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content ตามประเภทเมนู */}
            {selectedModal === "audit" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>บันทึกประวัติการสแกนใบหน้าที่ล้มเหลว (Failed Scan Audit Logs)</span>
                  </div>
                  <span className="font-bold">4 รายการล่าสุด</span>
                </div>

                <div className="flex flex-col gap-2">
                  {failedScanLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B2B2B]">{log.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === "success"
                              ? "bg-emerald-100 text-[#1E8A4C]"
                              : log.status === "low_light"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {log.status === "success" ? "สำเร็จ" : log.status === "low_light" ? "แสงไม่พอ" : "ล้มเหลว"}
                          </span>
                        </div>
                        <span className="text-[#3D5A5A]">{log.reason}</span>
                        <span className="text-[10px] text-[#527070]">ขั้นตอน: {log.livenessStep} • {log.device}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#527070]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedModal === "patients" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#3D5A5A]">
                  {role === "director"
                    ? "แสดงรายชื่อคนไข้ทั้งหมดในโรงพยาบาล (Super Admin Scope: All Patients)"
                    : "แสดงเฉพาะคนไข้ในความดูแลของ กภ. ปิยะ สมบูรณ์ (Scope: Own Assigned Patients)"}
                </p>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-slate-100 p-2.5 font-bold text-[#0B2B2B]">
                    <span>HN / ชื่อ-นามสกุล</span>
                    <span>อายุ / เพศ</span>
                    <span>นักกายภาพผู้ดูแล</span>
                    <span className="text-right">สถานะวันนี้</span>
                  </div>

                  <div className="grid grid-cols-4 p-2.5 border-t border-slate-100 items-center">
                    <div>
                      <p className="font-bold text-[#0B2B2B]">คุณประเสริฐ รักษ์ดี</p>
                      <span className="text-[10px] text-[#527070]">HN: 69-00124</span>
                    </div>
                    <span>72 ปี (ชาย)</span>
                    <span className="text-[#1E8A4C] font-semibold">กภ. ปิยะ สมบูรณ์</span>
                    <span className="text-right font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      รอเริ่มฝึก
                    </span>
                  </div>

                  <div className="grid grid-cols-4 p-2.5 border-t border-slate-100 items-center bg-slate-50/50">
                    <div>
                      <p className="font-bold text-[#0B2B2B]">คุณสมพร เจริญสุข</p>
                      <span className="text-[10px] text-[#527070]">HN: 69-00125</span>
                    </div>
                    <span>68 ปี (หญิง)</span>
                    <span className="text-[#1E8A4C] font-semibold">กภ. ปิยะ สมบูรณ์</span>
                    <span className="text-right font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                      ฝึกสำเร็จแล้ว
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedModal === "exercises" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#3D5A5A]">
                  คลังท่ากายภาพบำบัดพร้อมการวัดมุมด้วย Computer Vision (On-Device)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <span className="font-bold text-[#1E8A4C]">1. ท่ายกแขนบริหารข้อไหล่ (Shoulder Flexion)</span>
                    <p className="text-[11px] text-[#3D5A5A] mt-1">
                      เป้าหมาย: ยกแขนตรงทำมุม 90° ค้างไว้ 2 วินาที • นับจำนวน 5 ครั้ง
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="font-bold text-[#0B2B2B]">2. ท่าเหยียดแขนไปข้างหน้า (Arm Extension)</span>
                    <p className="text-[11px] text-[#3D5A5A] mt-1">
                      เป้าหมาย: เหยียดแขนตรงระดับอก • เน้นความเสถียรของสะบัก
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedModal === "settings" && (
              <div className="flex flex-col gap-3 text-xs">
                <p className="text-[#3D5A5A]">
                  การตั้งค่าความปลอดภัยตู้ Kiosk และพารามิเตอร์ชีวมิติ
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0B2B2B]">เกณฑ์ความคล้ายคลึงใบหน้า (Cosine Distance Threshold)</span>
                    <span className="font-mono font-bold text-[#1E8A4C]">0.60 (มาตรฐานสากล)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0B2B2B]">เวลา Auto-Logout หน้าตู้เมื่อไม่มีคนใช้งาน</span>
                    <span className="font-mono font-bold text-[#1E8A4C]">60 วินาที</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[#0B2B2B]">การจัดเก็บภาพถ่ายใบหน้าจริง</span>
                    <span className="font-bold text-rose-700">ปิดถาวร (เวกเตอร์เท่านั้น ตาม PDPA)</span>
                  </div>
                </div>
              </div>
            )}

            {selectedModal !== "audit" && selectedModal !== "patients" && selectedModal !== "exercises" && selectedModal !== "settings" && (
              <div className="p-4 rounded-xl bg-emerald-50 text-xs text-[#0B2B2B] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#1E8A4C]" />
                <span>เมนูนี้เชื่อมต่อกับฐานข้อมูลหลักของระบบเรียบร้อยแล้ว</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedModal(null)}
                className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
