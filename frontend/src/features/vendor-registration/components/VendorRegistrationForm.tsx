"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, Send, Store } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { getDistricts, getProvinces, getWards, submitRegistration } from "../api/vendor-registration.api";
import type { AdministrativeUnit, VendorRegistrationState } from "../types/vendor-registration.types";
import {
  REGISTRATION_LIMITS,
  RegistrationErrors,
  RegistrationField,
  RegistrationForm,
  toInput,
  validateRegistration,
} from "../utils/registration-form";
import { SearchableSelect } from "./SearchableSelect";

interface VendorRegistrationFormProps {
  token: string;
  initial: RegistrationForm;
  isResubmission: boolean;
  onSubmitted: (state: VendorRegistrationState) => void;
  /** 409: the application changed elsewhere; the page reloads the real state. */
  onConflict: () => void;
}

const LOADERS: Record<"provinces" | "districts" | "wards", (parentCode: string) => Promise<AdministrativeUnit[]>> = {
  provinces: () => getProvinces(),
  districts: (provinceCode: string) => getDistricts(provinceCode),
  wards: (districtCode: string) => getWards(districtCode),
};

/**
 * Loads one level of the catalogue. `parent` is the code it depends on: null
 * means "not chosen yet" (nothing to load), "" is used for the top level.
 */
function useUnits(level: keyof typeof LOADERS, parent: string | null) {
  const key = parent === null ? null : `${level}:${parent}`;
  const [state, setState] = useState<{ key: string; units: AdministrativeUnit[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (key === null || parent === null) return;
    let cancelled = false;
    LOADERS[level](parent)
      .then((units) => !cancelled && setState({ key, units, failed: false }))
      .catch(() => !cancelled && setState({ key, units: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [key, level, parent]);

  const current = key !== null && state?.key === key ? state : null;
  return { units: current?.units ?? [], loading: key !== null && !current, failed: current?.failed ?? false };
}

export function VendorRegistrationForm({
  token,
  initial,
  isResubmission,
  onSubmitted,
  onConflict,
}: VendorRegistrationFormProps) {
  const [form, setForm] = useState<RegistrationForm>(initial);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const inFlight = useRef(false);

  const provinces = useUnits("provinces", "");
  const districts = useUnits("districts", form.provinceCode || null);
  const wards = useUnits("wards", form.districtCode || null);
  const catalogueFailed = provinces.failed || districts.failed || wards.failed;

  const errors: RegistrationErrors = touched ? validateRegistration(form) : {};

  const update = (changes: Partial<RegistrationForm>) => {
    setForm((current) => ({ ...current, ...changes }));
    setServerErrors([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    setTouched(true);
    if (Object.keys(validateRegistration(form)).length > 0) return;

    inFlight.current = true;
    setSubmitting(true);
    setServerErrors([]);
    try {
      onSubmitted(await submitRegistration(token, toInput(form)));
    } catch (error) {
      if (error instanceof ApiError) {
        setServerErrors(error.messages);
        if (error.statusCode === 409) onConflict();
      } else {
        setServerErrors(["Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại."]);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const text = (
    field: Extract<RegistrationField, "name" | "contactPhone" | "streetAddress">,
    label: string,
    props: { placeholder: string; maxLength?: number; type?: string; inputMode?: "tel"; autoComplete?: string },
  ) => (
    <div>
      <label htmlFor={`vr-${field}`} className="block text-sm font-semibold text-slate-800">
        {label} <span className="text-[#E63946]">*</span>
      </label>
      <input
        id={`vr-${field}`}
        value={form[field]}
        onChange={(event) => update({ [field]: event.target.value })}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={errors[field] ? `vr-${field}-error` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-sky-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F3860] focus:bg-white ${
          errors[field] ? "border-rose-400" : "border-transparent"
        }`}
        {...props}
      />
      {errors[field] && (
        <p id={`vr-${field}-error`} className="mt-1 text-xs text-rose-600">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon={<Store className="h-5 w-5" />} title="Thông tin gian hàng" hint="Tên và số điện thoại hiển thị cho khách khi gian hàng được duyệt." />
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {text("name", "Tên gian hàng", { placeholder: "Ví dụ: Vựa Hải Sản Bến Cảng An Thới", maxLength: REGISTRATION_LIMITS.nameMax })}
          {text("contactPhone", "Số điện thoại liên hệ", { placeholder: "0912345678", type: "tel", inputMode: "tel", autoComplete: "tel" })}
        </div>
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="vr-description" className="block text-sm font-semibold text-slate-800">
              Giới thiệu gian hàng <span className="font-normal text-slate-500">(tuỳ chọn)</span>
            </label>
            <span className="shrink-0 text-xs text-slate-400">
              {form.description.length}/{REGISTRATION_LIMITS.descriptionMax}
            </span>
          </div>
          <textarea
            id="vr-description"
            rows={4}
            maxLength={REGISTRATION_LIMITS.descriptionMax}
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="Mặt hàng chủ lực, nguồn hàng, cách bảo quản…"
            className="mt-1.5 w-full resize-y rounded-xl border border-transparent bg-sky-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F3860] focus:bg-white"
          />
          {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon={<MapPin className="h-5 w-5" />} title="Địa chỉ kho hàng" hint="Nơi vựa tập kết và giao hàng. Chọn theo danh mục hành chính, có thể gõ không dấu để tìm." />
        {catalogueFailed && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Không tải được danh sách tỉnh, huyện, xã. Vui lòng tải lại trang.
          </p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SearchableSelect
            label="Tỉnh/thành phố"
            required
            placeholder="Chọn tỉnh/thành phố"
            options={provinces.units}
            loading={provinces.loading}
            value={form.provinceCode}
            // A new province invalidates the district and ward.
            onChange={(provinceCode) => update({ provinceCode, districtCode: "", wardCode: "" })}
            error={errors.provinceCode}
          />
          <SearchableSelect
            label="Quận/huyện"
            required
            placeholder="Chọn quận/huyện"
            options={districts.units}
            loading={districts.loading}
            disabled={!form.provinceCode}
            disabledHint="Chọn tỉnh trước"
            value={form.districtCode}
            onChange={(districtCode) => update({ districtCode, wardCode: "" })}
            error={errors.districtCode}
          />
          <SearchableSelect
            label="Xã/phường"
            placeholder="Chọn xã/phường (tuỳ chọn)"
            options={wards.units}
            loading={wards.loading}
            disabled={!form.districtCode}
            disabledHint="Chọn huyện trước"
            value={form.wardCode}
            onChange={(wardCode) => update({ wardCode })}
            clearable
          />
        </div>
        <div className="mt-5">
          {text("streetAddress", "Số nhà, tên đường hoặc bến cảng", {
            placeholder: "Ví dụ: Khu neo đậu số 4, cầu cảng An Thới",
            maxLength: REGISTRATION_LIMITS.streetAddressMax,
            autoComplete: "street-address",
          })}
        </div>
      </section>

      {serverErrors.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="space-y-1">
            {serverErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-sm text-slate-500">
          Hồ sơ được quản trị viên xét duyệt. Gian hàng chỉ mở bán sau khi được duyệt.
        </p>
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E63946] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c92f3b] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Đang gửi…" : isResubmission ? "Gửi lại hồ sơ" : "Gửi hồ sơ xét duyệt"}
        </button>
      </div>
    </form>
  );
}

export function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#0F3860]">{icon}</span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
