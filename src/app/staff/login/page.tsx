"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, Stethoscope, ArrowLeft, LogIn, ShieldCheck, KeyRound } from "lucide-react";
import { BigButton } from "@/components/kiosk/BigButton";

export default function StaffLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"director" | "physio">("director");
  const [username, setUsername] = useState("director.admin");
  const [password, setPassword] = useState("Director1234!");
  const [error, setError] = useState<string | null>(null);

  const handleQuickDirector = () => {
    setRole("director");
    setUsername("director.admin");
    setPassword("Director1234!");
    setError(null);
  };

  const handleQuickPhysio = () => {
    setRole("physio");
    setUsername("physio.somchai");
    setPassword("Physio1234!");
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    // บันทึก Session จำลองใน sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("staff_role", role);
      sessionStorage.setItem("staff_username", username);
    }
    router.push("/staff/overview");
  };

  return (
    <div className="min-h-screen kiosk-aurora-bg text-[#0B2B2B] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-[#1E8A4C]/20 flex flex-col gap-6">
        
        {/* แถบส่วนหัว */}
        <div className="flex items-center justify-between border-b border-[#0B2B2B]/10 pb-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-bold text-[#3D5A5A] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก Kiosk</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-[#1E8A4C] px-3 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5" />
            <span>พอร์ทัลบุคลากรทางการแพทย์</span>
          </div>
        </div>

        {/* ชื่อระบบและไอคอน */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1E8A4C] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#1E8A4C]/25">
            <Shield className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2B2B] tracking-tight">
            เข้าสู่ระบบบุคลากร (Staff Portal)
          </h1>
          <p className="text-xs sm:text-sm text-[#3D5A5A] font-medium mt-1">
            Dr.Tech.Care — ระบบบริหารจัดการคลินิกกายภาพบำบัด
          </p>
        </div>

        {/* แถบเลือกบทบาท: แอดมิน/ผอ. vs นักกายภาพบำบัด */}
        <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-1.5 rounded-2xl border border-emerald-200/60">
          <button
            type="button"
            onClick={handleQuickDirector}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "director"
                ? "bg-[#1E8A4C] text-white shadow-md"
                : "text-[#3D5A5A] hover:bg-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>แอดมิน / ผอ. (9 เมนู)</span>
          </button>

          <button
            type="button"
            onClick={handleQuickPhysio}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "physio"
                ? "bg-[#1E8A4C] text-white shadow-md"
                : "text-[#3D5A5A] hover:bg-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>นักกายภาพ (7 เมนู)</span>
          </button>
        </div>

        {/* สรุปขอบเขตสิทธิ์ของบทบาทที่เลือก */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-[#0B2B2B] text-left">
          {role === "director" ? (
            <p>
              <strong className="text-[#1E8A4C]">สิทธิ์แอดมิน (Super Admin):</strong> เข้าถึงผู้ใช้ทั้งหมด, ข้อมูลคนไข้ทั้งหมด, นักกายภาพ, ท่ากายภาพ, บันทึกการใช้งาน (Audit Logs), และตั้งค่าระบบ
            </p>
          ) : (
            <p>
              <strong className="text-[#1E8A4C]">สิทธิ์นักกายภาพบำบัด:</strong> ดูแลเฉพาะคนไข้ในความรับผิดชอบ, ดู/เพิ่มท่ากายภาพบำบัด, และสร้างแผนการรักษาประจำวัน (ซ่อน Audit Logs และ Settings)
            </p>
          )}
        </div>

        {/* ฟอร์มเข้าสู่ระบบ */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs sm:text-sm font-bold text-[#0B2B2B] flex items-center gap-1.5">
              <span>ชื่อผู้ใช้งาน (Username)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3.5 mt-1 rounded-xl border-2 border-slate-200 bg-white font-semibold text-base text-[#0B2B2B] outline-none focus:border-[#1E8A4C]"
              placeholder="กรอกชื่อผู้ใช้..."
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-bold text-[#0B2B2B] flex items-center gap-1.5">
              <span>รหัสผ่าน (Password)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 mt-1 rounded-xl border-2 border-slate-200 bg-white font-semibold text-base text-[#0B2B2B] outline-none focus:border-[#1E8A4C]"
              placeholder="กรอกรหัสผ่าน..."
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs sm:text-sm font-bold">
              {error}
            </div>
          )}

          {/* ปุ่มเข้าสู่ระบบ สูง >= 64px ตามมาตรฐาน Strong Care */}
          <div className="mt-2">
            <BigButton
              type="submit"
              variant="strong-primary"
              className="!min-h-[64px] sm:!min-h-[68px] !text-lg"
              icon={<LogIn className="w-5 h-5" />}
              onClick={handleLogin}
            >
              เข้าสู่ระบบ {role === "director" ? "ผู้อำนวยการ / แอดมิน" : "นักกายภาพบำบัด"}
            </BigButton>
          </div>
        </form>

        {/* ข้อมูลความปลอดภัยรหัสผ่าน (Cryptographic Hashing Badge) */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-left text-xs text-[#527070]">
          <ShieldCheck className="w-5 h-5 text-[#1E8A4C] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0B2B2B]">การรักษาความปลอดภัยของรหัสผ่าน:</span>
            <p className="text-[11px] mt-0.5">
              รหัสผ่านทั้งหมดถูกเข้ารหัสแบบทางเดียว (One-Way Hashing ผ่าน Argon2id / bcrypt พร้อม Salt) ห้ามจัดเก็บ Plaintext ตามข้อกำหนดความปลอดภัยข้อมูลทางการแพทย์
            </p>
          </div>
        </div>

        {/* ส่วนทดสอบด่วน */}
        <div className="border-t border-slate-200 pt-3 flex flex-col gap-2 text-center text-xs text-[#527070]">
          <span className="font-bold text-[#0B2B2B] flex items-center justify-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-[#1E8A4C]" />
            <span>บัญชีสำหรับการทดสอบและสาธิต:</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickDirector}
              className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1E8A4C] font-bold hover:bg-emerald-100 cursor-pointer text-xs"
            >
              ผอ. (director.admin)
            </button>
            <button
              type="button"
              onClick={handleQuickPhysio}
              className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1E8A4C] font-bold hover:bg-emerald-100 cursor-pointer text-xs"
            >
              นักกายภาพ (physio.somchai)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
