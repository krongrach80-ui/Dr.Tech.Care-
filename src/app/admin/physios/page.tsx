"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Phone,
  Award,
  Users,
  Edit2,
  X,
  UserCheck,
  Lock,
} from "lucide-react";
import { useAdminStore, type PhysioProfile } from "@/lib/stores/adminStore";

export default function AdminPhysiosPage() {
  const { currentActor, physios, patients, updatePhysioProfile } = useAdminStore();
  const isDirector = currentActor.role === "director";

  const [selectedPhysio, setSelectedPhysio] = useState<PhysioProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<PhysioProfile>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSavePhysio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhysio) return;
    setFormError(null);

    try {
      await updatePhysioProfile(selectedPhysio.id, editForm);
      setSelectedPhysio(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#1E8A4C]" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ข้อมูลนักกายภาพ (Physiotherapists)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDirector
              ? "ทำเนียบนักกายภาพบำบัดทั้งหมดในระบบ (แอดมินใหญ่สามารถดูและแก้ไขข้อมูลได้ทุกคน)"
              : "ทำเนียบนักกายภาพบำบัด (นักกายภาพดูได้ทุกคนเป็นแบบอ่านอย่างเดียว และแก้ไขได้เฉพาะโปรไฟล์ของตนเอง)"}
          </p>
        </div>
      </div>

      {/* Physios Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {physios.map((phy) => {
          const isSelf = phy.id === currentActor.userId;
          const canEdit = isDirector || isSelf;

          // คนไข้ที่นักกายภาพรายนี้ดูแล
          const assignedPatients = patients.filter((p) => p.responsiblePhysioId === phy.id);

          return (
            <div
              key={phy.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all relative overflow-hidden"
            >
              {isSelf && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-wider">
                  โปรไฟล์ของคุณ
                </div>
              )}

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1E8A4C] flex items-center justify-center font-bold text-lg shrink-0">
                      {phy.firstName[0]}
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-slate-900">
                        กภ. {phy.firstName} {phy.lastName}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Award className="w-3.5 h-3.5" />
                          {phy.licenseNo || "ไม่มีเลขใบอนุญาต"}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {phy.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ปุ่มแก้ไขตามสิทธิ์ */}
                  {canEdit ? (
                    <button
                      type="button"
                      id={`btn-edit-physio-${phy.id}`}
                      onClick={() => {
                        setSelectedPhysio(phy);
                        setEditForm(phy);
                        setFormError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1E8A4C] hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                  ) : (
                    <span
                      title="อ่านได้อย่างเดียว — แก้ไขได้เฉพาะโปรไฟล์ของตนเอง"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200"
                    >
                      <Lock className="w-3 h-3" />
                      <span>อ่านอย่างเดียว</span>
                    </span>
                  )}
                </div>

                {/* Bio */}
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 block mb-1">ความเชี่ยวชาญ & ประวัติ:</span>
                  {phy.bio || "ไม่มีข้อมูลประวัติเพิ่มเติม"}
                </div>

                {/* รายชื่อคนไข้ที่ดูแล (ลิงก์ไปหน้าคนไข้) */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-teal-700" />
                      คนไข้ในความรับผิดชอบ ({assignedPatients.length} คน):
                    </span>
                  </div>

                  {assignedPatients.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">ยังไม่มีคนไข้ในความดูแลขณะนี้</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedPatients.map((pt) => (
                        <Link
                          key={pt.id}
                          href="/admin/patients"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium border border-teal-200 transition-colors"
                        >
                          <UserCheck className="w-3 h-3 text-teal-600" />
                          <span>
                            {pt.firstName} {pt.lastName}
                          </span>
                          <span className="font-mono text-[10px] text-teal-600">({pt.hn})</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Physio Modal */}
      {selectedPhysio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#1E8A4C]" />
                <span>แก้ไขข้อมูลนักกายภาพบำบัด</span>
              </h2>
              <button
                type="button"
                onClick={() => setSelectedPhysio(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhysio} className="flex flex-col gap-4 mt-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">ชื่อ:</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">นามสกุล:</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">เบอร์โทรศัพท์:</label>
                <input
                  type="text"
                  required
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">เลขใบอนุญาตประกอบวิชาชีพ (ถ้ามี):</label>
                <input
                  type="text"
                  placeholder="เช่น กภ. 12345"
                  value={editForm.licenseNo ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, licenseNo: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">ประวัติความเชี่ยวชาญ:</label>
                <textarea
                  rows={3}
                  value={editForm.bio ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPhysio(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-physio"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
