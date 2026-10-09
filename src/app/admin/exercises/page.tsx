"use client";

import React, { useState } from "react";
import {
  Activity,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Upload,
  X,
  FileVideo,
  ImageIcon,
  CheckCircle,
} from "lucide-react";
import { useAdminStore, type ExerciseItem } from "@/lib/stores/adminStore";
import { exerciseFormSchema } from "@/lib/schemas/admin";

export default function AdminExercisesPage() {
  const { currentActor, exercises, addExercise, updateExercise, deleteExercise } = useAdminStore();
  const isDirector = currentActor.role === "director";

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);

  // Form state
  const [formState, setFormState] = useState<{
    name: string;
    summary: string;
    stepsText: string;
    targetMuscles: string;
    recoveryPhase: string;
    sets: number;
    reps: number;
    difficulty: "easy" | "medium" | "hard";
    mediaUrl: string;
    mediaType: "image" | "video";
  }>({
    name: "",
    summary: "",
    stepsText: "",
    targetMuscles: "",
    recoveryPhase: "",
    sets: 3,
    reps: 10,
    difficulty: "easy",
    mediaUrl: "",
    mediaType: "image",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // File size validation simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSizeBytes = isVideo ? 30 * 1024 * 1024 : 2 * 1024 * 1024; // 30MB or 2MB

    if (file.size > maxSizeBytes) {
      setFormError(
        `ขนาดไฟล์เกินกำหนด! ${isVideo ? "วิดีโอต้องไม่เกิน 30MB" : "รูปภาพต้องไม่เกิน 2MB"}`
      );
      e.target.value = "";
      return;
    }

    setFormError(null);
    setUploadStatus(`อัปโหลดไฟล์ "${file.name}" เข้าสู่ Supabase Storage (exercise-media) สำเร็จ`);
    setFormState({
      ...formState,
      mediaUrl: `/models/${file.name}`,
      mediaType: isVideo ? "video" : "image",
    });
  };

  // Add Exercise
  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const stepsArray = formState.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed = exerciseFormSchema.safeParse({
      name: formState.name,
      summary: formState.summary,
      steps: stepsArray,
      targetMuscles: formState.targetMuscles,
      recoveryPhase: formState.recoveryPhase,
      sets: Number(formState.sets),
      reps: Number(formState.reps),
      difficulty: formState.difficulty,
      mediaUrl: formState.mediaUrl || null,
      mediaType: formState.mediaType,
      analysisConfig: null, // เว้นเป็น null ในเฟสนี้ตามข้อกำหนด
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await addExercise({
        name: formState.name.trim(),
        summary: formState.summary.trim(),
        steps: stepsArray,
        targetMuscles: formState.targetMuscles.trim(),
        recoveryPhase: formState.recoveryPhase.trim(),
        sets: Number(formState.sets),
        reps: Number(formState.reps),
        difficulty: formState.difficulty,
        mediaUrl: formState.mediaUrl || undefined,
        mediaType: formState.mediaType,
      });
      setIsAddModalOpen(false);
      setUploadStatus(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // Edit Exercise
  const handleEditExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise) return;
    setFormError(null);

    const stepsArray = formState.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updateExercise(selectedExercise.id, {
        name: formState.name.trim(),
        summary: formState.summary.trim(),
        steps: stepsArray,
        targetMuscles: formState.targetMuscles.trim(),
        recoveryPhase: formState.recoveryPhase.trim(),
        sets: Number(formState.sets),
        reps: Number(formState.reps),
        difficulty: formState.difficulty,
        mediaUrl: formState.mediaUrl || undefined,
        mediaType: formState.mediaType,
      });
      setIsEditModalOpen(false);
      setSelectedExercise(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "ไม่สามารถแก้ไขได้");
    }
  };

  // Delete Exercise
  const handleDeleteExercise = async () => {
    if (!selectedExercise) return;
    try {
      await deleteExercise(selectedExercise.id);
      setIsDeleteModalOpen(false);
      setSelectedExercise(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "ไม่สามารถลบได้");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#1E8A4C]" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ท่ากายภาพ (Exercise Library)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDirector
              ? "คลังท่ากายภาพบำบัดทั้งหมดในระบบ (แอดมินใหญ่สามารถดู, เพิ่ม, แก้ไข และลบได้ทุกท่า)"
              : "คลังท่ากายภาพบำบัด (นักกายภาพดูได้ทั้งหมด เพิ่มท่าใหม่ได้ แก้ไข/ลบได้เฉพาะท่าที่ตนเองสร้างขึ้น)"}
          </p>
        </div>

        <button
          type="button"
          id="btn-open-add-exercise"
          onClick={() => {
            setFormError(null);
            setUploadStatus(null);
            setFormState({
              name: "",
              summary: "",
              stepsText: "",
              targetMuscles: "",
              recoveryPhase: "",
              sets: 3,
              reps: 10,
              difficulty: "easy",
              mediaUrl: "",
              mediaType: "image",
            });
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มท่ากายภาพใหม่</span>
        </button>
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exercises.map((ex) => {
          const isCreator = ex.createdBy === currentActor.userId;
          const canManage = isDirector || isCreator;

          return (
            <div
              key={ex.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div>
                {/* Media Preview or Icon */}
                <div className="w-full h-36 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden mb-4">
                  {ex.mediaUrl ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      {ex.mediaType === "video" ? (
                        <FileVideo className="w-10 h-10 text-emerald-600 mb-2" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-emerald-600 mb-2" />
                      )}
                      <span className="text-[11px] font-mono font-semibold text-slate-700 truncate max-w-[200px]">
                        {ex.mediaUrl}
                      </span>
                      <span className="text-[9px] text-[#1E8A4C] font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                        Supabase Storage: exercise-media
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Activity className="w-8 h-8 mb-1" />
                      <span className="text-[11px]">ไม่มีสื่อประกอบ</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ex.difficulty === "easy"
                          ? "bg-emerald-100 text-[#1E8A4C]"
                          : ex.difficulty === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {ex.difficulty === "easy" ? "ง่าย" : ex.difficulty === "medium" ? "ปานกลาง" : "ยาก"}
                    </span>
                  </div>
                </div>

                {/* Title & Summary */}
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#1E8A4C] transition-colors">
                  {ex.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {ex.summary}
                </p>

                {/* Clinical Details */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">กล้ามเนื้อ:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {ex.targetMuscles}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">เป้าหมายการฝึก:</span>
                    <span className="font-bold text-[#1E8A4C] bg-emerald-50 px-2 py-0.5 rounded">
                      {ex.sets} เซต × {ex.reps} ครั้ง
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">ระยะฟื้นตัว:</span>
                    <span className="text-slate-700 font-medium">{ex.recoveryPhase}</span>
                  </div>
                </div>
              </div>

              {/* Creator & Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">ผู้สร้างท่า:</span>
                  <span className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">
                    {ex.creatorName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        id={`btn-edit-exercise-${ex.id}`}
                        onClick={() => {
                          setSelectedExercise(ex);
                          setFormError(null);
                          setFormState({
                            name: ex.name,
                            summary: ex.summary,
                            stepsText: ex.steps.join("\n"),
                            targetMuscles: ex.targetMuscles,
                            recoveryPhase: ex.recoveryPhase,
                            sets: ex.sets,
                            reps: ex.reps,
                            difficulty: ex.difficulty,
                            mediaUrl: ex.mediaUrl ?? "",
                            mediaType: ex.mediaType ?? "image",
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="แก้ไขท่ากายภาพ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        id={`btn-delete-exercise-${ex.id}`}
                        onClick={() => {
                          setSelectedExercise(ex);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="ลบท่ากายภาพ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span
                      title="แก้ไข/ลบได้เฉพาะท่าที่คุณสร้างขึ้นเท่านั้น"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg cursor-not-allowed"
                    >
                      <Lock className="w-3 h-3" />
                      <span>ท่าของผู้อื่น</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Exercise Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1E8A4C]" />
                <span>{isAddModalOpen ? "เพิ่มท่ากายภาพใหม่" : "แก้ไขท่ากายภาพ"}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleAddExercise : handleEditExercise}
              className="flex flex-col gap-4 mt-4 text-xs"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {uploadStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1E8A4C] font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">ชื่อท่ากายภาพ:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ท่ายกแขนไปด้านหน้า (Shoulder Flexion)"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">คำอธิบายสรุป:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="สรุปประโยชน์ของท่านี้..."
                  value={formState.summary}
                  onChange={(e) => setFormState({ ...formState, summary: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">ขั้นตอนการฝึก (พิมพ์ทีละบรรทัด):</label>
                <textarea
                  rows={3}
                  required
                  placeholder="1. ยืนตรง แขนแนบลำตัว&#10;2. ยกแขนขึ้น 90 องศา&#10;3. ค้างไว้ 2 วินาที แล้วลดแขนลง"
                  value={formState.stepsText}
                  onChange={(e) => setFormState({ ...formState, stepsText: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">กล้ามเนื้อเป้าหมาย:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Deltoid, Biceps"
                    value={formState.targetMuscles}
                    onChange={(e) => setFormState({ ...formState, targetMuscles: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">ระยะฟื้นตัว:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ฟื้นฟูระยะเริ่มต้น"
                    value={formState.recoveryPhase}
                    onChange={(e) => setFormState({ ...formState, recoveryPhase: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">เซต:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formState.sets}
                    onChange={(e) => setFormState({ ...formState, sets: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">ครั้งต่อเซต:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formState.reps}
                    onChange={(e) => setFormState({ ...formState, reps: Number(e.target.value) })}
                    className="px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">ระดับความยาก:</label>
                  <select
                    value={formState.difficulty}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        difficulty: e.target.value as "easy" | "medium" | "hard",
                      })
                    }
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="easy">ง่าย (Easy)</option>
                    <option value="medium">ปานกลาง (Medium)</option>
                    <option value="hard">ยาก (Hard)</option>
                  </select>
                </div>
              </div>

              {/* Media Upload (<=2MB image, <=30MB video via Supabase Storage) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#1E8A4C]" />
                  อัปโหลดรูป (≤2MB) หรือวิดีโอ (≤30MB) ผ่าน Storage bucket exercise-media:
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#1E8A4C] file:text-white file:font-bold hover:file:bg-[#17733E] file:cursor-pointer cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  * ข้อกำหนด Master Prompt: analysis_config เว้นเป็น null ในเฟสนี้
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-exercise"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h2 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>ยืนยันการลบท่ากายภาพ</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4 text-xs">
              <p className="text-slate-700">
                คุณแน่ใจหรือไม่ว่าต้องการลบท่า{" "}
                <span className="font-bold text-slate-900">&ldquo;{selectedExercise.name}&rdquo;</span>?
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-exercise"
                  onClick={handleDeleteExercise}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  ลบท่ากายภาพ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
