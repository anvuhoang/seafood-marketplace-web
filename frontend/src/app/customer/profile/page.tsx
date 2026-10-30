"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { useAuth } from "@/features/auth/context/AuthContext";
import { User, Mail, Phone, ShieldCheck, MapPin } from "lucide-react";

export default function CustomerProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Hồ Sơ Tài Khoản
              </h1>
              <p className="text-xs text-slate-400">
                Quản lý thông tin cá nhân và cài đặt bảo mật tài khoản
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-[#0F3860] font-black text-2xl">
                {(user?.name || user?.fullName || "U").charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {user?.name || user?.fullName}
                  </h2>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    {user?.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Thành viên chính thức HaiSan Express
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span>Địa chỉ Email</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">{user?.email}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>Số điện thoại</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">
                  {user?.phone || "Chưa cập nhật"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span>Địa chỉ giao hàng mặc định</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">
                  TP. Hồ Chí Minh (Giao hỏa tốc 2 giờ)
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span>Trạng thái tài khoản</span>
                </div>
                <p className="font-bold text-emerald-600 text-sm">
                  Đã xác thực & Bảo vệ 2 lớp
                </p>
              </div>
            </div>
          </div>
        </main>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
