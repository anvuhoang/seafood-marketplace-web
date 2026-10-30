"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ShieldAlert, ArrowLeft, Loader2, LogIn } from "lucide-react";
import Link from "next/link";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"CUSTOMER" | "VENDOR" | "ADMIN">;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

function AuthLoadingState() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50/50">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3860] text-white shadow-md">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">
          Đang xác thực thông tin đăng nhập...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Vui lòng đợi giây lát trong khi hệ thống kiểm tra quyền hạn tài khoản.
        </p>
      </div>
    </div>
  );
}

/**
 * Client-side route protection guard enforcing authentication and role authorization.
 *
 * The guard reads search params to build the login redirect, so it renders
 * inside Suspense; otherwise prerendering protected pages fails at build time.
 */
export function ProtectedRoute(props: ProtectedRouteProps) {
  return (
    <Suspense fallback={<AuthLoadingState />}>
      <ProtectedRouteContent {...props} />
    </Suspense>
  );
}

function ProtectedRouteContent({
  children,
  allowedRoles,
  fallbackTitle = "Yêu Cầu Quyền Truy Cập",
  fallbackMessage,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPathWithSearch = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `/customer/login?redirect=${encodeURIComponent(
        currentPathWithSearch
      )}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, currentPathWithSearch, router]);

  // 1. Loading state while authentication is being resolved
  if (isLoading) {
    return <AuthLoadingState />;
  }

  // 2. Unauthenticated state (while redirect is in progress)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50/50">
        <div className="flex flex-col items-center gap-3 text-center max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <LogIn className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Yêu cầu đăng nhập
          </h3>
          <p className="text-xs text-slate-500">
            Bạn cần đăng nhập tài khoản để truy cập trang này. Đang chuyển hướng đến trang đăng nhập...
          </p>
          <Link
            href={`/customer/login?redirect=${encodeURIComponent(
              currentPathWithSearch
            )}`}
            className="mt-2 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A2744]"
          >
            Đến trang đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  // 3. Role authorization check
  const validRoles = ["CUSTOMER", "VENDOR", "ADMIN"] as const;

  const userRole = user.role;

  const isValidRole = validRoles.some((role) => role === userRole);

  const isAuthorized =
    isValidRole &&
    (!allowedRoles ||
      allowedRoles.length === 0 ||
      allowedRoles.includes(
        userRole as "CUSTOMER" | "VENDOR" | "ADMIN"
      ));

  if (!isAuthorized) {
    const requiredRoleLabel =
      allowedRoles?.[0] === "ADMIN"
        ? "Quản trị viên (Admin)"
        : allowedRoles?.[0] === "VENDOR"
          ? "Chủ Vựa / Người Bán (Vendor)"
          : "Khách hàng";

    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 bg-slate-50/40">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 font-mono">
              403 FORBIDDEN
            </span>
            <h2 className="text-lg font-black text-slate-900 pt-2">
              {fallbackTitle}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {fallbackMessage ||
                `Khu vực này chỉ dành riêng cho tài khoản ${requiredRoleLabel}. Vai trò hiện tại của bạn là "${userRole}".`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Về Trang Chủ</span>
            </Link>

            <Link
              href={
                userRole === "VENDOR"
                  ? "/vendor/dashboard"
                  : userRole === "ADMIN"
                    ? "/admin/dashboard"
                    : "/customer/orders"
              }
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0F3860] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744]"
            >
              <span>Về Trang Của Bạn</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Fully authenticated and authorized
  return <>{children}</>;
}
