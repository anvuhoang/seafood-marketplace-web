"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthCardWrapper } from "./AuthCardWrapper";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { register } = useAuth();

  const handlePostRegisterRedirect = () => {
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      router.push(redirectParam);
    } else {
      router.push("/");
    }
  };

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFullName) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    if (trimmedFullName.length < 2) {
      setError("Họ và tên phải có tối thiểu 2 ký tự.");
      return;
    }

    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Địa chỉ email không đúng định dạng.");
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

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!agreeTerms) {
      setError("Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password,
        confirmPassword,
        agreeTerms,
      });

      if (result.success) {
        handlePostRegisterRedirect();
      } else {
        setError(result.error || "Đăng ký không thành công. Vui lòng thử lại.");
      }
    } catch {
      setError("Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsSubmitting(true);
    setTimeout(async () => {
      const result = await register({
        fullName: "Khách hàng Google",
        email: `khachhang.${Date.now()}@gmail.com`,
        password: "GoogleAuthToken123!",
        confirmPassword: "GoogleAuthToken123!",
        agreeTerms: true,
      });
      if (result.success) {
        handlePostRegisterRedirect();
      } else {
        setError(result.error || "Đăng ký Google không thành công.");
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <AuthCardWrapper
      title="Đăng ký tài khoản khách hàng"
      subtitle="Tham gia sàn thương mại hải sản HaiSan Express để đặt mua hải sản tươi sống chất lượng cao."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Error notification banner */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-slide-up">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* 1. Full Name Field */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">
            Họ và tên
          </label>
          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập họ và tên của bạn"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 2. Email Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Địa chỉ Email
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              Dùng để đăng nhập & nhận hóa đơn
            </span>
          </div>
          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="vidu@gmail.com"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 3. Phone Field (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Số điện thoại <span className="font-normal text-slate-400">(Tùy chọn)</span>
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              Giao hàng hỏa tốc
            </span>
          </div>
          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Phone className="h-4 w-4" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              placeholder="0912 345 678"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 4. Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">Mật khẩu</label>
            <span className="text-[11px] font-medium text-slate-400">
              Tối thiểu 6 ký tự
            </span>
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
              placeholder="Tạo mật khẩu an toàn"
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 5. Confirm Password Field */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">
            Xác nhận mật khẩu
          </label>
          <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 transition-all duration-200 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập lại mật khẩu"
              disabled={isSubmitting}
              className="w-full bg-transparent py-3 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 6. Terms Agreement Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-4 w-4 rounded border-sky-200 text-[#0F3860] focus:ring-sky-300 accent-[#0F3860] mt-0.5"
            />
            <span className="text-xs font-medium text-slate-600 leading-snug">
              Tôi đồng ý với{" "}
              <Link href="/help/terms" className="text-[#0F3860] font-semibold hover:underline">
                Điều khoản dịch vụ
              </Link>{" "}
              &{" "}
              <Link href="/help/privacy" className="text-[#0F3860] font-semibold hover:underline">
                Chính sách bảo mật
              </Link>
            </span>
          </label>
        </div>

        {/* 7. Primary Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-950/20 transition-all duration-200 hover:bg-[#0A2744] hover:shadow-lg active:scale-98 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Đang tạo tài khoản...</span>
            </>
          ) : (
            <>
              <span>Đăng ký tài khoản</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* 8. Divider */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            HOẶC ĐĂNG KÝ VỚI
          </span>
        </div>

        {/* 9. Social Signup Button (Google) */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-sky-100 bg-[#F0F7FF] py-3 text-xs font-bold text-slate-800 transition-all duration-200 hover:bg-sky-100/70 hover:border-sky-200 active:scale-98 disabled:opacity-60"
        >
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

        {/* 10. Switch to Login Link */}
        <p className="pt-1.5 text-center text-xs text-slate-500 font-medium">
          Đã có tài khoản?{" "}
          <Link
            href={
              redirectParam
                ? `/customer/login?redirect=${encodeURIComponent(redirectParam)}`
                : "/customer/login"
            }
            className="font-bold text-[#E63946] hover:underline hover:text-[#D62839] transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </AuthCardWrapper>
  );
}

export function RegisterForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[500px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F3860]" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
