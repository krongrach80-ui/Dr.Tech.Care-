"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/overview");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1E8A4C] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">กำลังนำคุณไปยังหน้าภาพรวมระบบ...</p>
      </div>
    </div>
  );
}
