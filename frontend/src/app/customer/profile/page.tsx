"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { AccountPageHeader, AccountShell } from "@/features/account/components/AccountShell";
import { getProfile, updateProfile } from "@/features/account/api/account.api";
import { Gender, Profile, VIETNAM_PHONE_PATTERN } from "@/features/account/types/account.types";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getCategories } from "@/features/category/api/category.api";
import { CategorySummary } from "@/features/category/types/category.types";

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (year: number, month: number) => new Date(year || 2000, month || 1, 0).getDate();

interface FormState {
  fullName: string;
  phone: string;
  gender: Gender | null;
  day: string;
  month: string;
  year: string;
  interests: string[];
}

function toForm(profile: Profile): FormState {
  const [year = "", month = "", day = ""] = profile.birthDate?.split("-") ?? [];
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? "",
    gender: profile.gender,
    day: day ? String(Number(day)) : "",
    month: month ? String(Number(month)) : "",
    year,
    interests: profile.interests,
  };
}

function formatDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString("vi-VN") : null;
}

export default function CustomerProfilePage() {
  return (
    <AccountShell>
      <ProfileContent />
    </AccountShell>
  );
}

function ProfileContent() {
  const { accessToken, updateUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;

    getProfile(accessToken)
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        setForm(toForm(data));
      })
      .catch(() => mounted && setLoadError(true));

    // Interest choices; the form still works without them.
    getCategories()
      .then((data) => mounted && setCategories(data))
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const errors = useMemo(() => {
    if (!form) return {};
    const result: Partial<Record<"fullName" | "phone" | "birthDate", string>> = {};
    if (form.fullName.trim().length < 2) result.fullName = "Họ và tên phải có tối thiểu 2 ký tự.";
    if (!VIETNAM_PHONE_PATTERN.test(form.phone.trim())) result.phone = "Số điện thoại không hợp lệ (ví dụ: 0912345678).";
    const parts = [form.day, form.month, form.year].filter(Boolean).length;
    if (parts > 0 && parts < 3) result.birthDate = "Vui lòng chọn đủ ngày, tháng và năm sinh.";
    return result;
  }, [form]);

  if (loadError) {
    return (
      <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Không thể tải hồ sơ lúc này. Vui lòng thử lại sau.
      </p>
    );
  }

  if (!profile || !form) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải hồ sơ...
      </div>
    );
  }

  const update = (changes: Partial<FormState>) => {
    setForm({ ...form, ...changes });
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0 || !accessToken) return;

    setSaving(true);
    try {
      const saved = await updateProfile(accessToken, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        birthDate: form.year ? `${form.year}-${pad(Number(form.month))}-${pad(Number(form.day))}` : null,
        interests: form.interests,
      });
      setProfile(saved);
      setForm(toForm(saved));
      updateUser({ fullName: saved.fullName, phone: saved.phone });
      setFeedback({ type: "success", text: "Đã lưu thay đổi hồ sơ." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    } finally {
      setSaving(false);
    }
  };

  const maxDay = daysIn(Number(form.year), Number(form.month));
  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-sky-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0F3860] focus:bg-white";

  return (
    <>
      <AccountPageHeader
        eyebrow="QUẢN TRỊ HỒ SƠ"
        title="Hồ Sơ Của Tôi"
        description="Quản lý thông tin hồ sơ để bảo mật tài khoản và nhận gợi ý hải sản phù hợp từ các vựa đối tác."
        aside={
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
            <div className="text-right">
              <p className="text-[11px] font-bold tracking-wide text-slate-500">MÃ KHÁCH HÀNG</p>
              <p className="text-lg font-black text-[#0F3860]">{profile.customerCode}</p>
            </div>
            <IdCard className="h-6 w-6 text-[#0F3860]" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#0F3860]">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#0F3860]">Chi tiết thông tin</h2>
                <p className="text-xs text-slate-500">Cập nhật hồ sơ định kỳ giúp bảo vệ quyền lợi giao dịch</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">* Trường bắt buộc điền</p>
          </div>

          <Field label="Tên đăng nhập" hint="Đăng nhập bằng email hoặc số điện thoại">
            <div className={`${inputClass} flex items-center gap-2 text-slate-500`}>
              <Mail className="h-4 w-4" />
              <span className="truncate">{profile.email}</span>
            </div>
          </Field>

          <Field label="Họ và tên" required htmlFor="fullName" error={errors.fullName}>
            <input
              id="fullName"
              value={form.fullName}
              maxLength={150}
              onChange={(e) => update({ fullName: e.target.value })}
              aria-invalid={Boolean(errors.fullName)}
              className={inputClass}
            />
          </Field>

          <Field label="Số điện thoại nhận hàng" required htmlFor="phone" error={errors.phone}>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                aria-invalid={Boolean(errors.phone)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Giới tính">
            <div role="radiogroup" aria-label="Giới tính" className="flex flex-wrap gap-5 py-2 text-sm">
              {GENDER_OPTIONS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    checked={form.gender === option.value}
                    onChange={() => update({ gender: option.value })}
                    className="h-4 w-4 accent-[#0F3860]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Ngày sinh" error={errors.birthDate}>
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Ngày" value={form.day} onChange={(e) => update({ day: e.target.value })} className={inputClass}>
                <option value="">Ngày</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Ngày {pad(d)}</option>
                ))}
              </select>
              <select
                aria-label="Tháng"
                value={form.month}
                onChange={(e) => {
                  const month = e.target.value;
                  const limit = daysIn(Number(form.year), Number(month));
                  update({ month, day: Number(form.day) > limit ? String(limit) : form.day });
                }}
                className={inputClass}
              >
                <option value="">Tháng</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>Tháng {pad(m)}</option>
                ))}
              </select>
              <select
                aria-label="Năm"
                value={form.year}
                onChange={(e) => {
                  const year = e.target.value;
                  const limit = daysIn(Number(year), Number(form.month));
                  update({ year, day: Number(form.day) > limit ? String(limit) : form.day });
                }}
                className={inputClass}
              >
                <option value="">Năm</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>
          </Field>

          {categories.length > 0 && (
            <Field label="Sở thích & Nhu cầu" hint="Nhận gợi ý hải sản phù hợp">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const selected = form.interests.includes(category.slug);
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update({
                          interests: selected
                            ? form.interests.filter((s) => s !== category.slug)
                            : [...form.interests, category.slug],
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition ${
                        selected ? "bg-[#0F3860] text-white" : "bg-sky-50 text-[#0F3860] hover:bg-sky-100"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

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

          <div className="flex flex-wrap gap-3 sm:pl-[200px]">
            <button
              type="submit"
              disabled={saving || Object.keys(errors).length > 0}
              className="flex items-center gap-2 rounded-lg bg-[#0F3860] px-5 py-3 text-sm font-bold text-white hover:bg-[#0A2744] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu thay đổi
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(toForm(profile));
                setFeedback(null);
              }}
              className="rounded-lg bg-sky-50 px-5 py-3 text-sm font-bold text-[#0F3860] hover:bg-sky-100"
            >
              Hủy bỏ
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0F3860] text-3xl font-black text-white">
              {profile.fullName.trim().charAt(0).toUpperCase() || <UserRound className="h-10 w-10" />}
            </span>
            <p className="mt-3 text-base font-black text-slate-900">{profile.fullName}</p>
            <p className="text-xs text-slate-500">Thành viên từ {formatDate(profile.createdAt)}</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-[#0F3860]">
              <ShieldCheck className="h-5 w-5" /> Bảo mật tài khoản
            </h2>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 p-3">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-[#0F3860]" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Mật khẩu đăng nhập</p>
                  <p className="text-[11px] text-slate-500">
                    {profile.passwordChangedAt
                      ? `Đổi lần cuối: ${formatDate(profile.passwordChangedAt)}`
                      : "Chưa đổi kể từ khi tạo tài khoản"}
                  </p>
                </div>
              </div>
              <Link href="/customer/password" className="text-xs font-bold text-[#0F3860] hover:underline">
                Đổi
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  required,
  htmlFor,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr] sm:gap-5">
      <div className="sm:pt-2.5">
        <label htmlFor={htmlFor} className="text-sm font-bold text-slate-700">
          {label} {required && <span className="text-[#E63946]">*</span>}
        </label>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      <div>
        {children}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
