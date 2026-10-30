"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { ShieldAlert, ArrowLeft, LogOut, Home, UserCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const requiredRole = searchParams.get("required") || "ADMIN";
  const currentRole = user?.role || searchParams.get("current") || "CUSTOMER";

  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case "ADMIN":
        return "Quản Trị Viên (Admin)";
      case "VENDOR":
        return "Chủ Vựa / Đối Tác Bán Hàng (Vendor)";
      case "CUSTOMER":
      default:
        return "Khách Hàng (Customer)";
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl text-center space-y-6">
        {/* Shield Icon with glow effect */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full bg-rose-100 px-3.5 py-1 text-xs font-black text-rose-700 tracking-wider font-mono">
            403 • KHÔNG CÓ QUYỀN TRUY CẬP
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Truy Cập Bị Giới Hạn
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Trang bạn vừa truy cập chỉ dành cho tài khoản có vai trò{" "}
            <strong className="text-slate-800">
              {getRoleDisplayName(requiredRole)}
            </strong>
            .
          </p>
        </div>

        {/* Current user badge info */}
        {user && (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800">
              <UserCheck className="h-4 w-4 text-[#0F3860]" />
              <span>{user.name || user.fullName}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Vai trò hiện tại:{" "}
              <span className="font-semibold text-[#0F3860]">
                {getRoleDisplayName(currentRole)}
              </span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Home className="h-4 w-4" />
            <span>Về Trang Chủ</span>
          </Link>

          {user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/customer/login");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 px-4 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Đổi Tài Khoản Khác</span>
            </button>
          ) : (
            <Link
              href="/customer/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3 px-4 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Đăng Nhập Ngay</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <CustomerHeader />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F3860] border-t-transparent" />
          </div>
        }
      >
        <UnauthorizedContent />
      </Suspense>
      <CustomerFooter />
    </div>
  );
}
