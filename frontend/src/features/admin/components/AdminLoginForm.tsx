"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getSafeRedirectPath } from "@/features/auth/utils/safe-redirect";

/** Sign-in for the admin site. It accepts ADMIN accounts only. */
export function AdminLoginForm() {
  const { loginAdmin } = useAuth();
  const router = useRouter();
  const redirectParam = useSearchParams().get("redirect");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await loginAdmin({ emailOrPhone: identifier.trim(), password });
      if (result.success) {
        const target = getSafeRedirectPath(redirectParam, window.location.origin);
        router.replace(target && target.startsWith("/admin") ? target : "/admin/dashboard");
        return;
      }
      setError(result.error || "Đăng nhập không thành công. Vui lòng thử lại.");
    } catch {
      setError("Không kết nối được máy chủ. Vui lòng thử lại sau.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-5 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-sm text-slate-500 transition-colors hover:text-[#0F3860]"
      >
        <ArrowLeft className="h-4 w-4" />
        Về trang chủ
      </Link>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F3860] text-white">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Cổng quản trị</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Dành riêng cho quản trị viên HaiSan Express. Vui lòng đăng nhập để tiếp tục.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-[#C62835]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="admin-identifier" className="text-sm font-semibold text-slate-800">
                Email hoặc số điện thoại
              </label>
              <input
                id="admin-identifier"
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  if (error) setError(null);
                }}
                autoComplete="username"
                autoFocus
                disabled={submitting}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/15 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="text-sm font-semibold text-slate-800">
                Mật khẩu
              </label>
              <div className="relative mt-1.5">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="current-password"
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-slate-300 pr-11 pl-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/15 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F3860] text-sm font-semibold text-white transition-colors hover:bg-[#0A2744] disabled:opacity-70"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Đăng nhập
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
