"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { forgotPasswordApi, ApiError } from "../api/auth.api";
import { AuthCardWrapper } from "./AuthCardWrapper";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Vui lòng nhập một địa chỉ email hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordApi(value);
      setSentTo(value);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.statusCode === 429
          ? "Bạn thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại."
          : "Không gửi được yêu cầu. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardWrapper
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi đường dẫn để bạn đặt mật khẩu mới."
    >
      {sentTo ? (
        <div className="space-y-4" role="status">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="leading-relaxed">
              Nếu <strong>{sentTo}</strong> có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm
              tra hộp thư (cả mục thư rác). Đường dẫn có hiệu lực trong 30 phút.
            </p>
          </div>
          <Link
            href="/customer/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white hover:bg-[#0A2744]"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-bold text-slate-800">
              Email
            </label>
            <div className="relative flex items-center rounded-xl border border-sky-100 bg-[#F0F7FF]/70 focus-within:border-[#0F3860] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
              <div className="pl-3.5 pr-2 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="ten@example.com"
                disabled={isSubmitting}
                className="w-full bg-transparent py-3 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-950/20 hover:bg-[#0A2744] disabled:pointer-events-none disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <span>Gửi đường dẫn đặt lại</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="pt-2 text-center text-xs font-medium text-slate-500">
            Nhớ ra mật khẩu rồi?{" "}
            <Link href="/customer/login" className="font-bold text-[#E63946] hover:underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      )}
    </AuthCardWrapper>
  );
}
