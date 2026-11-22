"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { ApiError, resetPasswordApi, verifyResetTokenApi } from "../api/auth.api";
import { AuthCardWrapper } from "./AuthCardWrapper";
import { AuthPageFallback } from "./AuthPageFallback";

type LinkState = "checking" | "valid" | "invalid";

const MIN_LENGTH = 6;

function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? "";
  const [link, setLink] = useState<LinkState>(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Say whether the link still works before the person types a new password.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyResetTokenApi(token)
      .then((valid) => {
        if (!cancelled) setLink(valid ? "valid" : "invalid");
      })
      .catch(() => {
        // Could not check: let them try, the server decides when they submit.
        if (!cancelled) setLink("valid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Mật khẩu phải có tối thiểu ${MIN_LENGTH} ký tự.`);
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordApi(token, password);
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.statusCode === 400 && caught.messages.length === 1 && /đường dẫn/i.test(caught.message)) {
        setLink("invalid");
      } else {
        setError(caught instanceof ApiError ? caught.message : "Không đặt lại được mật khẩu. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (link === "checking") return <AuthPageFallback />;

  if (done) {
    return (
      <AuthCardWrapper title="Đã đặt lại mật khẩu" subtitle="Các phiên đăng nhập cũ đã được đăng xuất.">
        <div role="status" className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>Bạn có thể đăng nhập bằng mật khẩu mới.</p>
          </div>
          <Link href="/customer/login" className="flex w-full items-center justify-center rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white hover:bg-[#0A2744]">
            Đăng nhập
          </Link>
        </div>
      </AuthCardWrapper>
    );
  }

  if (link === "invalid") {
    return (
      <AuthCardWrapper title="Đường dẫn không còn hiệu lực" subtitle="Đường dẫn đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được dùng.">
        <Link href="/customer/forgot-password" className="flex w-full items-center justify-center rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white hover:bg-[#0A2744]">
          Yêu cầu đường dẫn mới
        </Link>
      </AuthCardWrapper>
    );
  }

  return (
    <AuthCardWrapper title="Đặt mật khẩu mới" subtitle="Chọn một mật khẩu mới cho tài khoản của bạn.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {[
          { id: "reset-password", label: "Mật khẩu mới", value: password, set: setPassword, autoComplete: "new-password" },
          { id: "reset-confirm", label: "Nhập lại mật khẩu", value: confirm, set: setConfirm, autoComplete: "new-password" },
        ].map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="mb-1.5 block text-xs font-bold text-slate-800">
              {field.label}
            </label>
            <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
              <div className="pl-3.5 pr-2 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id={field.id}
                type={showPassword ? "text" : "password"}
                autoComplete={field.autoComplete}
                value={field.value}
                onChange={(event) => {
                  field.set(event.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                className="w-full bg-transparent py-3 pr-10 text-xs font-medium text-slate-800 outline-none"
              />
              {field.id === "reset-password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 p-0.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-950/20 hover:bg-[#0A2744] disabled:pointer-events-none disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <span>Đặt lại mật khẩu</span>
          )}
        </button>
      </form>
    </AuthCardWrapper>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
