"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthCardWrapper } from "./AuthCardWrapper";
import { AuthPageFallback } from "./AuthPageFallback";
import { getSafeRedirectPath } from "../utils/safe-redirect";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { login } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Navigate to the target route after successful authentication based on redirect query or user role.
   */
  const handlePostLoginRedirect = (userRole?: string) => {
    const safeRedirect = getSafeRedirectPath(redirectParam, window.location.origin);

    if (safeRedirect) {
      router.push(safeRedirect);
    } else if (userRole === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (userRole === "VENDOR") {
      router.push("/vendor/dashboard");
    } else {
      router.push("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrPhone.trim()) {
      setError("Vui lòng nhập số điện thoại hoặc email.");
      return;
    }

    if (emailOrPhone.trim().length < 6) {
      setError("Số điện thoại hoặc email phải có tối thiểu 6 ký tự.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({
        emailOrPhone: emailOrPhone.trim(),
        password,
        rememberMe,
      });

      if (result.success) {
        handlePostLoginRedirect(result.user?.role);
      } else {
        setError(result.error || "Đăng nhập không thành công. Vui lòng thử lại.");
      }
    } catch {
      setError("Đã xảy ra lỗi trong quá trình kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setTimeout(async () => {
      const result = await login({
        emailOrPhone: "khachhang.demo@gmail.com",
        password: "google_oauth_token",
        rememberMe: true,
      });
      handlePostLoginRedirect(result.user?.role);
    }, 600);
  };

  return (
    <AuthCardWrapper
      title="Đăng nhập tài khoản khách hàng"
      subtitle="Khám phá và đặt mua hải sản tươi sống trực tiếp từ các vựa uy tín tại Phú Quốc, Nha Trang, Cà Mau."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Protected route redirect notification */}
        {redirectParam && (
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 animate-slide-up">
            <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
            <p className="font-medium leading-relaxed">
              Vui lòng đăng nhập để tiếp tục truy cập trang bạn yêu cầu.
            </p>
          </div>
        )}
        {/* Error notification banner */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-slide-up">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* 1. Email or Phone Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              Số điện thoại hoặc Email
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              Tối thiểu 6 ký tự
            </span>
          </div>

          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => {
                setEmailOrPhone(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập số điện thoại hoặc email của bạn"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 2. Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">Mật khẩu</label>
          </div>

          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập mật khẩu"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* 3. Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-sky-200 text-[#0F3860] focus:ring-sky-300 accent-[#0F3860]"
            />
            <span className="text-xs font-medium text-slate-600">
              Ghi nhớ đăng nhập
            </span>
          </label>

          <Link
            href="/customer/forgot-password"
            className="text-xs font-semibold text-[#0F3860] hover:text-sky-700 hover:underline transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* 4. Primary Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-950/20 transition-all duration-200 hover:bg-[#0A2744] hover:shadow-lg active:scale-98 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Đang xử lý đăng nhập...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* 5. Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400">
            HOẶC ĐĂNG NHẬP VỚI
          </span>
        </div>

        {/* 6. Social Login Button (Google) */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-sky-100 bg-[#F0F7FF] py-3 text-xs font-bold text-slate-800 transition-all duration-200 hover:bg-sky-100/70 hover:border-sky-200 active:scale-98 disabled:opacity-60"
        >
          {/* Multi-color Google SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>

        {/* 7. Switch to Registration Link */}
        <p className="pt-2 text-center text-xs text-slate-500 font-medium">
          Bạn chưa có tài khoản?{" "}
          <Link
            href={
              redirectParam
                ? `/customer/register?redirect=${encodeURIComponent(redirectParam)}`
                : "/customer/register"
            }
            className="font-bold text-[#E63946] hover:underline hover:text-[#D62839] transition-colors"
          >
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </AuthCardWrapper>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={<AuthPageFallback />}
    >
      <LoginFormContent />
    </Suspense>
  );
}
