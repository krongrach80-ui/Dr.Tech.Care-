"use client";

import React, { useState } from "react";
import {
  UserCheck,
  Search,
  FileText,
  Activity,
  Stethoscope,
  X,
  Clock,
  HeartPulse,
} from "lucide-react";
import { useAdminStore, type PatientRecord } from "@/lib/stores/adminStore";
import { physioNoteSchema } from "@/lib/schemas/admin";

export default function AdminPatientsPage() {
  const {
    currentActor,
    patients,
    physios,
    notes,
    updatePatient,
    assignPhysioToPatient,
    addPhysioNote,
    settings,
  } = useAdminStore();

  const isDirector = currentActor.role === "director";
  const physioScope = settings.access_policy.physio_scope;

  // กรองคนไข้ตามสิทธิ์:
  // Director: ดูได้ทั้งหมด
  // Physio: ดูได้ทั้งหมดถ้า physio_scope == 'all' (ค่าเริ่มต้น), หรือเฉพาะคนที่ตนดูแลถ้า scope == 'own'
  const accessiblePatients = patients.filter((p) => {
    if (isDirector) return true;
    if (physioScope === "all") return true;
    return p.responsiblePhysioId === currentActor.userId;
  });

  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  const filteredPatients = accessiblePatients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.hn.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  // Selected Patient for detail drawer
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "results" | "notes">("info");

  // Physio note form state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNotePainScore, setNewNotePainScore] = useState<number>(3);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Edit patient form state
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientRecord>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setNoteError(null);

    const validation = physioNoteSchema.safeParse({
      patientId: selectedPatient.id,
      note: newNoteContent,
      painScore: Number(newNotePainScore),
    });

    if (!validation.success) {
      setNoteError(validation.error.issues[0]?.message ?? "ข้อมูลโน้ตไม่ถูกต้อง");
      return;
    }

    try {
      await addPhysioNote(selectedPatient.id, newNoteContent.trim(), Number(newNotePainScore));
      setNewNoteContent("");
      setNewNotePainScore(3);
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกโน้ต");
    }
  };

  // Handle Edit Patient
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setEditError(null);

    try {
      await updatePatient(selectedPatient.id, editForm);
      setSelectedPatient({ ...selectedPatient, ...editForm } as PatientRecord);
      setIsEditPatientOpen(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const patientNotes = selectedPatient
    ? notes.filter((n) => n.patientId === selectedPatient.id)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#1E8A4C]" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ข้อมูลคนไข้ (Patient Records)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDirector
              ? "เวชระเบียนคนไข้ทั้งหมดในโรงพยาบาล พร้อมการจัดการนักกายภาพผู้รับผิดชอบและบันทึกทางคลินิก"
              : `เวชระเบียนคนไข้ (นโยบายขอบเขต: ${physioScope === "all" ? "ดูคนไข้ทุกคนในคลินิก" : "ดูเฉพาะคนไข้ที่คุณรับผิดชอบ"})`}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, นามสกุล หรือ HN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs focus:outline-[#1E8A4C]"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700">
            พบคนไข้ {filteredPatients.length} รายการ
          </span>
          <span className="text-[11px] text-slate-400">
            คลิกที่แถวคนไข้เพื่อเปิดดูรายละเอียดและบันทึกโน้ต
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3.5 pl-6">HN</th>
                <th className="p-3.5">ชื่อ-นามสกุล</th>
                <th className="p-3.5">เพศ / วันเกิด</th>
                <th className="p-3.5">เบอร์โทรศัพท์</th>
                <th className="p-3.5">อาการบาดเจ็บ</th>
                <th className="p-3.5">นักกายภาพผู้ดูแล</th>
                <th className="p-3.5 pr-6 text-right">วันที่เริ่มเข้าระบบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPatients.map((patient) => {
                const assignedPhysio = physios.find((p) => p.id === patient.responsiblePhysioId);

                return (
                  <tr
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setActiveTab("info");
                    }}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 pl-6 font-mono font-bold text-[#1E8A4C] group-hover:underline">
                      {patient.hn}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {patient.gender === "male" ? "ชาย" : patient.gender === "female" ? "หญิง" : "อื่นๆ"} •{" "}
                      {patient.birthDate}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{patient.phone}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-600">{patient.injuryDetails}</td>
                    <td className="p-3.5">
                      {assignedPhysio ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          กภ. {assignedPhysio.firstName} {assignedPhysio.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">ยังไม่กำหนด</span>
                      )}
                    </td>
                    <td className="p-3.5 pr-6 text-right font-mono text-slate-500 text-[11px]">
                      {patient.startedAt}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: รายละเอียดคนไข้ 3 แท็บ */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#1E8A4C] bg-emerald-100 px-2 py-0.5 rounded">
                    HN: {selectedPatient.hn}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  โทร: {selectedPatient.phone} • เริ่มการรักษาเมื่อ: {selectedPatient.startedAt}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer rounded-xl hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 px-6 bg-white text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === "info"
                    ? "border-[#1E8A4C] text-[#1E8A4C]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                1. ข้อมูลส่วนตัว & ซักประวัติ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "notes"
                    ? "border-[#1E8A4C] text-[#1E8A4C]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>2. โน้ตนักกายภาพ</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                  {patientNotes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("results")}
                className={`py-3.5 px-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === "results"
                    ? "border-[#1E8A4C] text-[#1E8A4C]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                3. ผลการรักษา
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto text-xs">
              {/* TAB 1: INFO */}
              {activeTab === "info" && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">นักกายภาพผู้รับผิดชอบ:</span>
                      <select
                        value={selectedPatient.responsiblePhysioId ?? ""}
                        onChange={(e) =>
                          assignPhysioToPatient(selectedPatient.id, e.target.value || null)
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {physios.map((phy) => (
                          <option key={phy.id} value={phy.id}>
                            กภ. {phy.firstName} {phy.lastName} ({phy.licenseNo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[11px]">เพศ:</span>
                        <p className="font-bold text-slate-800">
                          {selectedPatient.gender === "male"
                            ? "ชาย"
                            : selectedPatient.gender === "female"
                            ? "หญิง"
                            : "อื่นๆ"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">วันเกิด:</span>
                        <p className="font-bold text-slate-800">{selectedPatient.birthDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold text-slate-700">อาการบาดเจ็บ / ประวัติการรักษา:</span>
                    <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                      {selectedPatient.injuryDetails}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold text-slate-700">ประวัติส่วนตัว / โรคประจำตัว:</span>
                    <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                      {selectedPatient.personalHistory || "ไม่มีบันทึกข้อมูลโรคประจำตัว"}
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm(selectedPatient);
                        setIsEditPatientOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all cursor-pointer"
                    >
                      แก้ไขข้อมูลเวชระเบียน
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: RESULTS (EMPTY STATE) */}
              {activeTab === "results" && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">ยังไม่มีข้อมูลผลการรักษา</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                    ระบบจะเริ่มบันทึกสถิติและกราฟพัฒนาการองศาข้อต่อเมื่อเปิดใช้งานระบบ AI
                    วิเคราะห์ท่ากายภาพบำบัดในเฟสถัดไป
                  </p>
                </div>
              )}

              {/* TAB 3: PHYSIO NOTES */}
              {activeTab === "notes" && (
                <div className="flex flex-col gap-6">
                  {/* Note Input Form */}
                  <form
                    onSubmit={handleAddNote}
                    className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1E8A4C] flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        เขียนโน้ตนักกายภาพใหม่:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">ระดับความปวด (0-10):</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={newNotePainScore}
                          onChange={(e) => setNewNotePainScore(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded-lg border border-emerald-300 font-bold text-center bg-white"
                        />
                      </div>
                    </div>

                    {noteError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                        {noteError}
                      </div>
                    )}

                    <textarea
                      rows={3}
                      required
                      placeholder="บันทึกความก้าวหน้า เช่น องศาการเคลื่อนไหว อาการเจ็บ หรือข้อควรระวัง..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full p-3 rounded-xl border border-emerald-300 bg-white focus:outline-[#1E8A4C] text-xs"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/20"
                      >
                        บันทึกโน้ตลงเวชระเบียน
                      </button>
                    </div>
                  </form>

                  {/* Notes Timeline List */}
                  <div className="flex flex-col gap-3">
                    <span className="font-bold text-slate-700">ประวัติโน้ตทั้งหมด ({patientNotes.length}):</span>
                    {patientNotes.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-6">ยังไม่มีโน้ตสำหรับคนไข้รายนี้</p>
                    ) : (
                      patientNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <Stethoscope className="w-3.5 h-3.5 text-[#1E8A4C]" />
                              <span>{note.authorName}</span>
                            </div>
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {note.createdAt}
                            </span>
                          </div>

                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>

                          {note.painScore !== undefined && (
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                              <span className="text-slate-500">ระดับความปวด:</span>
                              <span className="font-bold text-rose-700">{note.painScore} / 10</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditPatientOpen && selectedPatient && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">แก้ไขข้อมูลเวชระเบียนคนไข้</h2>
              <button
                type="button"
                onClick={() => setIsEditPatientOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="flex flex-col gap-4 mt-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {editError}
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
                    className="px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">นามสกุล:</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="px-3.5 py-2 rounded-xl border border-slate-300"
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
                  className="px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">อาการบาดเจ็บ / ปัญหาที่ต้องฟื้นฟู:</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.injuryDetails ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, injuryDetails: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">ประวัติส่วนตัว / โรคประจำตัว:</label>
                <textarea
                  rows={2}
                  value={editForm.personalHistory ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, personalHistory: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPatientOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] text-white font-bold cursor-pointer"
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
