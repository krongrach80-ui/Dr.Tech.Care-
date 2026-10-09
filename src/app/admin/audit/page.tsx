"use client";

import React, { useState } from "react";
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  Ban,
  UserX,
  AlertTriangle,
  Laptop,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { verifyAuditHashChain } from "@/lib/audit/writer";
import { roleLabelThai } from "@/lib/rbac";
import { banTargetSchema } from "@/lib/schemas/admin";

export default function AdminAuditPage() {
  const {
    currentActor,
    activeSessions,
    kickSession,
    bans,
    addBan,
    unban,
    auditLogs,
    refreshAuditLogs,
  } = useAdminStore();

  const isDirector = currentActor.role === "director";

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Hash Chain Integrity Verification State
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    brokenLogId: number | null;
    message: string;
  }>({
    tested: false,
    isValid: true,
    brokenLogId: null,
    message: "",
  });

  // Ban Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banStep, setBanStep] = useState<1 | 2>(1);
  const [banForm, setBanForm] = useState<{
    kind: "device" | "ip";
    value: string;
    reason: string;
    durationHours: number | null;
  }>({
    kind: "ip",
    value: "",
    reason: "",
    durationHours: 24,
  });
  const [banError, setBanError] = useState<string | null>(null);

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
          หน้าประวัติการใช้งานและการตั้งค่าความปลอดภัยสงวนสิทธิ์เฉพาะผู้อำนวยการโรงพยาบาล (Director) เท่านั้น
          นักกายภาพและคนไข้ไม่ได้รับอนุญาตให้ดูหรือจัดการส่วนนี้
        </p>
      </div>
    );
  }

  // Run Hash Chain Verification
  const handleVerifyChain = () => {
    refreshAuditLogs();
    const result = verifyAuditHashChain(auditLogs);
    setVerificationResult({
      tested: true,
      isValid: result.isValid,
      brokenLogId: result.brokenLogId,
      message: result.message,
    });
  };

  // Filtered Logs
  const filteredLogs = auditLogs.filter((log) => {
    if (categoryFilter !== "all" && log.category !== categoryFilter) return false;
    if (outcomeFilter !== "all" && log.outcome !== outcomeFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Submit Ban with 2-step confirmation
  const handleBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanError(null);

    if (banStep === 1) {
      const parsed = banTargetSchema.safeParse({
        kind: banForm.kind,
        value: banForm.value,
        reason: banForm.reason,
        durationHours: banForm.durationHours,
      });

      if (!parsed.success) {
        setBanError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
        return;
      }

      // Check self-ban safeguards
      if (banForm.kind === "device" && banForm.value === currentActor.deviceId) {
        setBanError("ห้ามแบนเครื่องที่ตนเองกำลังใช้งานอยู่");
        return;
      }
      if (banForm.kind === "ip" && banForm.value === currentActor.ip) {
        setBanError("ห้ามแบน IP ที่ตนเองกำลังใช้งานอยู่");
        return;
      }

      // Proceed to Step 2 confirmation
      setBanStep(2);
      return;
    }

    // Step 2: Final Execute Ban
    try {
      await addBan(banForm.kind, banForm.value, banForm.reason, banForm.durationHours);
      setIsBanModalOpen(false);
      setBanStep(1);
      setBanForm({ kind: "ip", value: "", reason: "", durationHours: 24 });
    } catch (err: unknown) {
      setBanError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแบน");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-700" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ประวัติการใช้งาน & ความปลอดภัย (Audit & Security)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            แผงควบคุมเซสชันที่ออนไลน์, การจัดการแบนเครื่อง/IP และตรวจสอบความสมบูรณ์ของ SHA-256 Hash Chain
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-verify-hash-chain"
            onClick={handleVerifyChain}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ตรวจความสมบูรณ์ Hash Chain</span>
          </button>

          <button
            type="button"
            id="btn-open-ban-modal"
            onClick={() => {
              setBanError(null);
              setBanStep(1);
              setIsBanModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-950/20 transition-all cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            <span>แบนเครื่อง / IP</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult.tested && (
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between gap-4 animate-in fade-in ${
            verificationResult.isValid
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-[#1E8A4C] shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-xs">
                {verificationResult.isValid
                  ? "ผลการตรวจสอบ: สายโซ่ Audit Hash Chain ถูกต้องและสมบูรณ์ 100%"
                  : `แจ้งเตือนความปลอดภัย: พบความเสียหายหรือการแก้ไขข้อมูลที่ Log ID #${verificationResult.brokenLogId}`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">{verificationResult.message}</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-white/80 border">
            {auditLogs.length} Records Verified
          </span>
        </div>
      )}

      {/* Grid: Active Sessions & Active Bans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: กำลังใช้งานอยู่ (Active Sessions) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                <Laptop className="w-4 h-4 text-[#1E8A4C]" />
                <span>กำลังใช้งานอยู่ (Active Sessions)</span>
              </div>
              <span className="text-xs font-bold text-[#1E8A4C]">{activeSessions.length} เครื่อง</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{session.displayName}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        {roleLabelThai(session.role)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-700 font-semibold">{session.ip}</span>
                      <span>•</span>
                      <span>{session.device}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-400">{session.browser}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="เตะออกจากระบบ"
                    onClick={() => kickSession(session.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>เตะออก</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: รายการแบน (Bans Management) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>การบล็อก/แบนที่กำลังมีผล (Active Bans)</span>
              </div>
              <span className="text-xs font-bold text-rose-600">{bans.length} รายการ</span>
            </div>

            {/* Disclaimer Notification */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] mb-3 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>ข้อควรทราบ:</strong> การแบนเครื่องอาศัยคุกกี้ซึ่งอาจเลี่ยงได้ แนะนำให้แบนคู่กับ IP
                เพื่อความปลอดภัยสูงสุด
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {bans.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6 text-xs">ไม่มีรายการแบนในขณะนี้</p>
              ) : (
                bans.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold text-rose-900">
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          {b.kind}
                        </span>
                        <span>{b.value}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">เหตุผล: {b.reason}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        หมดอายุ: {b.expiresAt ?? "ถาวร"} • แบนโดย: {b.bannedBy}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => unban(b.id)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                    >
                      ปลดแบน
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3: ไทม์ไลน์ Audit Log Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-700" />
            <h2 className="font-bold text-sm text-slate-900">
              ไทม์ไลน์ประวัติการใช้งาน (Audit Logs Timeline)
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">หมวดหมู่:</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="auth">การเข้าสู่ระบบ (auth)</option>
                <option value="data">การจัดการข้อมูล (data)</option>
                <option value="security">ความปลอดภัย (security)</option>
                <option value="system">ระบบ (system)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">ผลลัพธ์:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="success">สำเร็จ (success)</option>
                <option value="failure">ล้มเหลว (failure)</option>
                <option value="denied">ถูกปฏิเสธ (denied)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Timeline Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3 pl-4">ID</th>
                <th className="p-3">เวลาที่เกิด</th>
                <th className="p-3">ผู้กระทำ (Actor)</th>
                <th className="p-3">การกระทำ (Action)</th>
                <th className="p-3">ตารางเป้าหมาย</th>
                <th className="p-3">รายละเอียด (Before / After)</th>
                <th className="p-3">IP / เครื่อง</th>
                <th className="p-3 pr-4">Row SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 pl-4 font-mono font-bold text-purple-700">#{log.id}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.occurredAt).toLocaleTimeString("th-TH")}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block truncate max-w-[130px]">
                      {log.actorLabel ?? log.actorId ?? "System"}
                    </span>
                    {log.actorRole && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {roleLabelThai(log.actorRole)}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{log.targetTable ?? "-"}</td>
                  <td className="p-3 max-w-xs font-mono text-[11px] text-slate-600 truncate">
                    {log.changes ? JSON.stringify(log.changes) : "-"}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-600">
                    {log.ip ?? "127.0.0.1"}
                  </td>
                  <td className="p-3 pr-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={log.rowHash}>
                    {log.rowHash.substring(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            แสดงหน้า {currentPage} จากทั้งหมด {totalPages} หน้า (ทั้งหมด {filteredLogs.length} รายการ)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ย้อนกลับ
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Modal: แบนเครื่อง / IP (2-step confirm) */}
      {isBanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h2 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                <span>แบนเครื่อง / IP (ขั้นตอนที่ {banStep} จาก 2)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsBanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBanSubmit} className="flex flex-col gap-4 mt-4 text-xs">
              {banError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {banError}
                </div>
              )}

              {banStep === 1 ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700">ประเภทเป้าหมาย:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBanForm({ ...banForm, kind: "ip" })}
                        className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                          banForm.kind === "ip"
                            ? "bg-rose-50 border-rose-500 text-rose-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        แบนหมายเลข IP
                      </button>
                      <button
                        type="button"
                        onClick={() => setBanForm({ ...banForm, kind: "device" })}
                        className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                          banForm.kind === "device"
                            ? "bg-rose-50 border-rose-500 text-rose-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        แบนรหัสเครื่อง (Device ID)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700">
                      ค่าเป้าหมาย ({banForm.kind === "ip" ? "IP Address" : "Device ID"}):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={banForm.kind === "ip" ? "เช่น 203.0.113.50" : "เช่น KIOSK-DEV-99"}
                      value={banForm.value}
                      onChange={(e) => setBanForm({ ...banForm, value: e.target.value })}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 font-mono focus:outline-rose-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700">ระยะเวลาการแบน:</label>
                    <select
                      value={banForm.durationHours ?? "permanent"}
                      onChange={(e) =>
                        setBanForm({
                          ...banForm,
                          durationHours: e.target.value === "permanent" ? null : Number(e.target.value),
                        })
                      }
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="1">1 ชั่วโมง</option>
                      <option value="24">24 ชั่วโมง (1 วัน)</option>
                      <option value="168">7 วัน (1 สัปดาห์)</option>
                      <option value="720">30 วัน (1 เดือน)</option>
                      <option value="permanent">ถาวร (Permanent Ban)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700">เหตุผลประกอบการแบน:</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="เช่น พยายามเจาะระบบ, สงสัยการปลอมแปลงใบหน้า..."
                      value={banForm.reason}
                      onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-rose-600"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsBanModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      id="btn-next-ban-confirm"
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold cursor-pointer hover:bg-rose-700"
                    >
                      ต่อไป: ยืนยันการแบน
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2 Confirmation */
                <>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex flex-col gap-2">
                    <span className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertTriangle className="w-4 h-4" />
                      กรุณาตรวจสอบข้อมูลก่อนบังคับใช้:
                    </span>
                    <div className="text-[11px] flex flex-col gap-1 mt-1">
                      <p>
                        <strong>เป้าหมาย:</strong> {banForm.kind.toUpperCase()}:{" "}
                        <span className="font-mono text-rose-700 font-bold">{banForm.value}</span>
                      </p>
                      <p>
                        <strong>ระยะเวลา:</strong>{" "}
                        {banForm.durationHours ? `${banForm.durationHours} ชั่วโมง` : "ถาวร"}
                      </p>
                      <p>
                        <strong>เหตุผล:</strong> {banForm.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBanStep(1)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      id="btn-final-ban-confirm"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md shadow-rose-950/20"
                    >
                      ยืนยันแบนทันที
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
