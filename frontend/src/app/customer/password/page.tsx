"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { AccountPageHeader, AccountShell } from "@/features/account/components/AccountShell";
import { changePassword } from "@/features/account/api/account.api";
import { useAuth } from "@/features/auth/context/AuthContext";

const MIN_LENGTH = 6;
const MAX_LENGTH = 72;

export default function CustomerPasswordPage() {
  return (
    <AccountShell>
      <ChangePasswordForm />
    </AccountShell>
  );
}

function validate(form: { current: string; next: string; confirm: string }) {
  const result: Partial<Record<"current" | "next" | "confirm", string>> = {};
  if (!form.current) result.current = "Vui lòng nhập mật khẩu hiện tại.";
  if (form.next.length < MIN_LENGTH) result.next = `Mật khẩu mới phải có tối thiểu ${MIN_LENGTH} ký tự.`;
  else if (form.next.length > MAX_LENGTH) result.next = `Mật khẩu mới tối đa ${MAX_LENGTH} ký tự.`;
  else if (form.next === form.current) result.next = "Mật khẩu mới phải khác mật khẩu hiện tại.";
  if (form.confirm !== form.next) result.confirm = "Mật khẩu xác nhận không khớp.";
  return result;
}

function ChangePasswordForm() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const errors = validate(form);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0 || !accessToken) return;

    setSaving(true);
    setFeedback(null);
    try {
      await changePassword(accessToken, { currentPassword: form.current, newPassword: form.next });
      setForm({ current: "", next: "", confirm: "" });
      setTouched(false);
      setFeedback({ type: "success", text: "Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Không thể đổi mật khẩu." });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: "current" | "next" | "confirm", label: string, autoComplete: string) => (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        type={show ? "text" : "password"}
        value={form[key]}
        autoComplete={autoComplete}
        onChange={(e) => {
          setForm({ ...form, [key]: e.target.value });
          setFeedback(null);
        }}
        aria-invalid={touched && Boolean(errors[key])}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-sky-50/50 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F3860] focus:bg-white"
      />
      {touched && errors[key] && <span className="mt-1 block text-xs font-normal text-rose-600">{errors[key]}</span>}
    </label>
  );

  return (
    <>
      <AccountPageHeader
        eyebrow="BẢO MẬT TÀI KHOẢN"
        title="Đổi mật khẩu"
        description="Dùng mật khẩu riêng cho HaiSan Express và không chia sẻ với người khác."
      />

      <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <KeyRound className="h-5 w-5" /> Cập nhật mật khẩu đăng nhập
        </h2>
        {field("current", "Mật khẩu hiện tại", "current-password")}
        {field("next", "Mật khẩu mới", "new-password")}
        {field("confirm", "Nhập lại mật khẩu mới", "new-password")}

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#0F3860]"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        </button>

        {feedback && (
          <p
            role={feedback.type === "error" ? "alert" : "status"}
            className={`flex items-center gap-2 rounded-lg p-3 text-xs font-semibold ${
              feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#0F3860] px-5 py-3 text-sm font-bold text-white hover:bg-[#0A2744] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Đổi mật khẩu
        </button>
      </form>
    </>
  );
}
