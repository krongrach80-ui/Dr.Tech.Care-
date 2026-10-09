"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useAdminStore, type UserAccount } from "@/lib/stores/adminStore";
import { roleLabelThai, type AppRole } from "@/lib/rbac";
import { createUserSchema, editUserNameSchema, deleteUserConfirmSchema } from "@/lib/schemas/admin";

export default function AdminUsersPage() {
  const {
    currentActor,
    users,
    addUser,
    updateUserDisplayName,
    resetUserPassword,
    toggleUserStatus,
    deleteUser,
  } = useAdminStore();

  const isDirector = currentActor.role === "director";

  // กรองบัญชีตามสิทธิ์ (Physio เห็นเฉพาะตนเอง + คนไข้ในความดูแล)
  const visibleUsers = users.filter((u) => {
    if (u.deletedAt) return false;
    if (isDirector) return true;
    // Physio: เห็นตัวเอง หรือคนไข้ที่ตนรับผิดชอบ
    if (u.id === currentActor.userId) return true;
    if (u.role === "patient" && u.responsiblePhysioId === currentActor.userId) return true;
    return false;
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User for action
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    username: "",
    displayName: "",
    role: (isDirector ? "patient" : "patient") as AppRole,
    initialPassword: "Password1234!",
  });
  const [editDisplayName, setEditDisplayName] = useState("");
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmDeleteUsername, setConfirmDeleteUsername] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = createUserSchema.safeParse({
      username: addForm.username,
      displayName: addForm.displayName,
      role: addForm.role,
      initialPassword: addForm.initialPassword,
      forcePasswordChange: true,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await addUser({
        username: addForm.username.toLowerCase().trim(),
        displayName: addForm.displayName.trim(),
        role: addForm.role,
        initialPassword: addForm.initialPassword,
      });
      setIsAddModalOpen(false);
      setAddForm({
        username: "",
        displayName: "",
        role: "patient",
        initialPassword: "Password1234!",
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเพิ่มบัญชี");
    }
  };

  // Edit Display Name
  const handleEditDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    const result = editUserNameSchema.safeParse({ displayName: editDisplayName });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      await updateUserDisplayName(selectedUser.id, editDisplayName.trim());
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแก้ไข");
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const tempCode = await resetUserPassword(selectedUser.id);
      setTempPasswordResult(tempCode);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการรีเซ็ต");
    }
  };

  // Soft Delete User
  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    const result = deleteUserConfirmSchema.safeParse({
      targetUsername: selectedUser.username,
      confirmedUsername: confirmDeleteUsername,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "กรุณาพิมพ์ชื่อบัญชีให้ตรงกันทุกตัวอักษร");
      return;
    }

    try {
      await deleteUser(selectedUser.id, confirmDeleteUsername);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setConfirmDeleteUsername("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "ไม่สามารถลบบัญชีผู้ใช้งานได้");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1E8A4C]" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              จัดการผู้ใช้งาน (User Management)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDirector
              ? "จัดการบัญชีผู้ใช้งานทุกบทบาทในระบบ พร้อมการรีเซ็ตรหัสผ่านชั่วคราวและการลบแบบ Soft Delete"
              : "จัดการบัญชีของคุณและคนไข้ที่คุณรับผิดชอบดูแล (เพิ่มคนไข้ / แก้ไขชื่อ / รีเซ็ตรหัสผ่าน)"}
          </p>
        </div>

        <button
          type="button"
          id="btn-open-add-user"
          onClick={() => {
            setFormError(null);
            setAddForm({
              username: "",
              displayName: "",
              role: "patient",
              initialPassword: "Password1234!",
            });
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isDirector ? "เพิ่มบัญชีผู้ใช้งานใหม่" : "เพิ่มบัญชีคนไข้ใหม่"}</span>
        </button>
      </div>

      {/* User Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">รายชื่อบัญชีทั้งหมดในขอบเขต:</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold">
              {visibleUsers.length} บัญชี
            </span>
          </div>
          {!isDirector && (
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
              นักกายภาพเห็นเฉพาะบัญชีตนเองและคนไข้ที่ดูแล
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3.5 pl-6">ชื่อบัญชี (Username)</th>
                <th className="p-3.5">ชื่อที่แสดง (Display Name)</th>
                <th className="p-3.5">บทบาท (Role)</th>
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">รหัสผ่าน</th>
                <th className="p-3.5">เข้าสู่ระบบล่าสุด</th>
                <th className="p-3.5 pr-6 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {visibleUsers.map((user) => {
                const isSelf = user.id === currentActor.userId;
                const canEditThis = isDirector || isSelf || (currentActor.role === "physio" && user.role === "patient");
                const canDeleteThis = isDirector ? !isSelf : (user.role === "patient" && user.responsiblePhysioId === currentActor.userId);

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 pl-6 font-mono font-bold text-slate-900">
                      {user.username}
                      {isSelf && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-[#1E8A4C] text-[10px] font-bold">
                          บัญชีคุณ
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-medium">{user.displayName}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                          user.role === "director"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "physio"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {roleLabelThai(user.role)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === "active"
                            ? "bg-emerald-50 text-[#1E8A4C] border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {user.status === "active" ? "ใช้งานปกติ" : "ถูกระงับ"}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 select-none">
                      ••••••••
                      {user.mustChangePassword && (
                        <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-sans">
                          ต้องเปลี่ยนเมื่อเข้า
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{user.lastLoginAt}</td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* แก้ชื่อ */}
                        {canEditThis && (
                          <button
                            type="button"
                            title="แก้ไขชื่อที่แสดง"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDisplayName(user.displayName);
                              setFormError(null);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* รีเซ็ตรหัสผ่าน */}
                        {canEditThis && (
                          <button
                            type="button"
                            title="รีเซ็ตรหัสผ่านชั่วคราว"
                            onClick={() => {
                              setSelectedUser(user);
                              setTempPasswordResult(null);
                              setCopiedCode(false);
                              setFormError(null);
                              setIsResetModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        {/* สลับสถานะ ระงับ/เปิดใช้งาน (เฉพาะ Director) */}
                        {isDirector && !isSelf && (
                          <button
                            type="button"
                            title={user.status === "active" ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"}
                            onClick={() => toggleUserStatus(user.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-[10px] font-bold"
                          >
                            {user.status === "active" ? "ระงับ" : "เปิด"}
                          </button>
                        )}

                        {/* ลบบัญชี (Soft delete) */}
                        {canDeleteThis ? (
                          <button
                            type="button"
                            title="ลบบัญชีผู้ใช้งาน"
                            onClick={() => {
                              setSelectedUser(user);
                              setConfirmDeleteUsername("");
                              setFormError(null);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            title={isSelf ? "ห้ามลบบัญชีของตนเอง" : "ไม่มีสิทธิ์ลบบัญชีนี้"}
                            className="p-1.5 text-slate-300 cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: เพิ่มบัญชีใหม่ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1E8A4C]" />
                <span>{isDirector ? "เพิ่มบัญชีผู้ใช้งานใหม่" : "เพิ่มบัญชีคนไข้ใหม่"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="flex flex-col gap-4 mt-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">ชื่อผู้ใช้งาน (Username):</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น physio.somchai หรือ patient.somporn"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
                <span className="text-[10px] text-slate-400">
                  ตัวพิมพ์เล็ก ตัวเลข จุด หรือขีดกลาง 4–32 ตัวอักษร
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">ชื่อที่แสดง (Display Name):</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นพ. ชัยรัตน์ หรือ นายประเสริฐ"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">บทบาท (Role):</label>
                {isDirector ? (
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value as AppRole })}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                  >
                    <option value="patient">คนไข้ (Patient)</option>
                    <option value="physio">นักกายภาพ (Physiotherapist)</option>
                    <option value="director">แอดมินใหญ่ (Hospital Director)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value="คนไข้ (Patient) — นักกายภาพเพิ่มได้เฉพาะคนไข้"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-semibold"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">รหัสผ่านเริ่มต้น (Initial Password):</label>
                <input
                  type="text"
                  required
                  value={addForm.initialPassword}
                  onChange={(e) => setAddForm({ ...addForm, initialPassword: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 font-mono focus:outline-[#1E8A4C]"
                />
                <span className="text-[10px] text-amber-600">
                  * ผู้ใช้จะถูกบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-add-user"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: แก้ไขชื่อที่แสดง */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#1E8A4C]" />
                <span>แก้ไขชื่อที่แสดง</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDisplayName} className="flex flex-col gap-4 mt-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <span className="text-slate-400 text-[11px]">ชื่อบัญชี:</span>
                <p className="font-mono font-bold text-slate-800">{selectedUser.username}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">ชื่อที่แสดงใหม่:</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-[#1E8A4C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: รีเซ็ตรหัสผ่าน (รหัสสุ่มชั่วคราว แสดงครั้งเดียว) */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>รีเซ็ตรหัสผ่านชั่วคราว</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4 text-xs">
              <p className="text-slate-600">
                ต้องการสุ่มรหัสผ่านชั่วคราวสำหรับบัญชี{" "}
                <span className="font-mono font-bold text-slate-900">{selectedUser.username}</span> หรือไม่?
              </p>

              {tempPasswordResult ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    รหัสผ่านชั่วคราว (แสดงเพียงครั้งเดียว):
                  </span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200">
                    <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                      {tempPasswordResult}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPasswordResult);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-[#1E8A4C]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-800">
                    * กรุณาคัดลอกและแจ้งผู้ใช้งานทันที ระบบจะบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  เมื่อกดยืนยัน ระบบจะสร้างรหัสสุ่ม 10 หลัก บันทึกลง Audit Log และตั้งสถานะบังคับเปลี่ยนรหัสผ่าน
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                {tempPasswordResult ? (
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white font-bold cursor-pointer"
                  >
                    เสร็จสิ้น
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-reset-password"
                      onClick={handleResetPassword}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                    >
                      สร้างรหัสชั่วคราว
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: ลบบัญชีผู้ใช้งาน (Soft Delete + ยืนยันด้วยการพิมพ์ชื่อบัญชี) */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h2 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>ยืนยันการลบบัญชีผู้ใช้งาน</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteUser} className="flex flex-col gap-4 mt-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  การลบเป็นแบบ Soft Delete (ระงับถาวรและบันทึก Audit):
                </p>
                <p className="mt-1 text-[11px]">
                  คุณกำลังจะลบบัญชี <strong>{selectedUser.displayName}</strong> (@{selectedUser.username}) บทบาท:{" "}
                  <strong>{roleLabelThai(selectedUser.role)}</strong>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">
                  เพื่อความปลอดภัย กรุณาพิมพ์ชื่อบัญชี{" "}
                  <span className="font-mono text-rose-700 underline">{selectedUser.username}</span> เพื่อยืนยัน:
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedUser.username}
                  value={confirmDeleteUsername}
                  onChange={(e) => setConfirmDeleteUsername(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 font-mono focus:outline-rose-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-confirm-delete-user"
                  disabled={confirmDeleteUsername !== selectedUser.username}
                  className={`px-4 py-2 rounded-xl font-bold text-white transition-all ${
                    confirmDeleteUsername === selectedUser.username
                      ? "bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-900/20"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  ยืนยันลบบัญชี
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
