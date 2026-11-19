"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, IdCard, Info, Loader2, Save, Store } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import { updateMyStore, uploadStoreImage } from "../api/vendor-store.api";
import { STORE_STATUS_BADGES, VENDOR_REGISTER_PATH } from "../constants/store-status";
import { useMyStore } from "../hooks/useMyStore";
import type { VendorStore, VendorStoreEditableField } from "../types/vendor-store.types";
import type { VendorStorefrontStatus } from "../types/vendor.types";
import {
  STORE_LIMITS,
  buildStoreUpdate,
  mapApiMessages,
  toFormValues,
  validateStoreForm,
} from "../utils/vendor-store-form";
import type { VendorStoreFormErrors, VendorStoreFormValues } from "../utils/vendor-store-form";
import { StoreImageField } from "./StoreImageField";
import { VendorPageHeader } from "./VendorPageHeader";

const STATUS_NOTES: Partial<Record<VendorStorefrontStatus, { title: string; body: string; tone: "amber" | "rose" | "slate" }>> = {
  PENDING: {
    title: "Gian hàng đang chờ duyệt",
    body: "Bạn vẫn có thể hoàn thiện hồ sơ trong lúc chờ. Khách hàng chỉ thấy sản phẩm sau khi gian hàng được duyệt.",
    tone: "amber",
  },
  REJECTED: {
    title: "Hồ sơ gian hàng chưa được chấp nhận",
    body: "Bạn có thể cập nhật lại thông tin bên dưới. Liên hệ quản trị viên nếu cần xem xét lại.",
    tone: "rose",
  },
  SUSPENDED: {
    title: "Gian hàng đang tạm ngưng",
    body: "Hồ sơ chỉ có thể xem, không thể chỉnh sửa trong thời gian tạm ngưng. Vui lòng liên hệ quản trị viên.",
    tone: "slate",
  },
};

const NOTE_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  slate: "border-slate-300 bg-slate-100 text-slate-800",
};

export function VendorStoreSettingsView() {
  const { accessToken } = useAuth();
  const { state, setStore } = useMyStore();

  return (
    <>
      <VendorPageHeader title="Cài đặt cửa hàng" description="Quản lý thông tin nhận diện gian hàng mà khách mua nhìn thấy." />

      {state.kind === "loading" || state.kind === "idle" || !accessToken ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          <p>Đang tải hồ sơ gian hàng...</p>
        </div>
      ) : state.kind === "no-store" ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Tài khoản của bạn chưa có gian hàng</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Đăng ký mở gian hàng để bắt đầu bán hải sản trên HaiSan Express.
          </p>
          <Link
            href={VENDOR_REGISTER_PATH}
            className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Đăng ký mở gian hàng
          </Link>
        </section>
      ) : state.kind === "forbidden" || state.kind === "error" ? (
        <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <h2 className="font-bold">
            {state.kind === "forbidden" ? "Bạn không có quyền xem trang này" : "Không thể tải hồ sơ gian hàng"}
          </h2>
          <p className="mt-1">{state.message}</p>
        </section>
      ) : (
        <StoreSettingsForm key={state.store.id} token={accessToken} store={state.store} onSaved={setStore} />
      )}
    </>
  );
}

interface StoreSettingsFormProps {
  token: string;
  store: VendorStore;
  onSaved: (store: VendorStore) => void;
}

function StoreSettingsForm({ token, store, onSaved }: StoreSettingsFormProps) {
  const router = useRouter();
  const [initial, setInitial] = useState<VendorStoreFormValues>(() => toFormValues(store));
  const [values, setValues] = useState<VendorStoreFormValues>(initial);
  const [errors, setErrors] = useState<VendorStoreFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const readOnly = store.status === "SUSPENDED";
  const update = useMemo(() => buildStoreUpdate(initial, values), [initial, values]);
  const dirty = Object.keys(update).length > 0;
  const canSave = !readOnly && dirty && !submitting && uploadCount === 0;
  const badge = STORE_STATUS_BADGES[store.status];
  const note = STATUS_NOTES[store.status];

  function setField(field: VendorStoreEditableField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const clientErrors = validateStoreForm(values);
    setErrors(clientErrors);
    setFormError(null);
    setSuccess(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const saved = await updateMyStore(token, update);
      const next = toFormValues(saved);
      setInitial(next);
      setValues(next);
      setSuccess("Đã lưu hồ sơ gian hàng.");
      // Shared store state: the console top bar and header links pick up the new profile.
      onSaved(saved);
      // Drop cached pages so the public storefront shows the new profile.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const { fields, other } = mapApiMessages(error.messages);
        setErrors(fields);
        setFormError(other.length > 0 ? other.join(" ") : Object.keys(fields).length > 0 ? null : error.message);
      } else {
        setFormError("Không thể lưu hồ sơ. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const upload = (file: File) => uploadStoreImage(token, file);
  const trackUpload = (uploading: boolean) => setUploadCount((count) => count + (uploading ? 1 : -1));
  const uploadEnabled = store.imageUploadEnabled && !readOnly;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {note && (
        <div className={cn("flex gap-3 rounded-2xl border p-4 text-sm", NOTE_TONES[note.tone])} role={readOnly ? "alert" : undefined}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{note.title}</p>
            <p className="mt-0.5">{note.body}</p>
          </div>
        </div>
      )}

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="store-profile-title">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 id="store-profile-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <IdCard className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              Hồ sơ nhận diện và thiết lập cửa hàng
            </h2>
            <p className="mt-1 text-sm text-slate-500">Thông tin này hiển thị trên trang gian hàng cho khách mua.</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", badge.className)}>{badge.label}</span>
            <span className="min-w-0 text-sm text-slate-500">
              Đường dẫn: <span className="font-mono break-all text-slate-900">/vendor/{store.slug}</span>
            </span>
            <Link
              href={`/vendor/${store.slug}`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              Xem gian hàng
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <fieldset disabled={readOnly || submitting} className="mt-6 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <legend className="sr-only">Hồ sơ gian hàng</legend>

          <div className="min-w-0 space-y-6">
            <StoreImageField
              label="Ảnh bìa gian hàng"
              hint="Ảnh ngang (khoảng 3:1), JPG, PNG hoặc WebP, tối đa 5MB."
              shape="wide"
              value={values.coverUrl}
              uploadEnabled={uploadEnabled}
              disabled={submitting}
              upload={upload}
              onChange={(url) => setField("coverUrl", url)}
              onUploadingChange={trackUpload}
            />
            <StoreImageField
              label="Logo gian hàng"
              hint="Ảnh vuông, JPG, PNG hoặc WebP, tối đa 5MB."
              shape="square"
              value={values.logoUrl}
              uploadEnabled={uploadEnabled}
              disabled={submitting}
              upload={upload}
              onChange={(url) => setField("logoUrl", url)}
              onUploadingChange={trackUpload}
            />
            {!store.imageUploadEnabled ? (
              <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                Chức năng tải ảnh chưa được cấu hình trên hệ thống, nên tạm thời chưa thể đổi logo và ảnh bìa.
              </p>
            ) : (
              uploadEnabled && <p className="text-xs text-slate-500">Ảnh mới chỉ được áp dụng sau khi bạn lưu thay đổi.</p>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <TextField
              field="name"
              label="Tên gian hàng đại diện"
              required
              value={values.name}
              error={errors.name}
              maxLength={STORE_LIMITS.nameMax}
              onChange={setField}
            />

            <div>
              <label htmlFor="store-description" className="text-sm font-semibold text-slate-800">
                Khẩu hiệu hoặc mô tả
              </label>
              <textarea
                id="store-description"
                rows={4}
                value={values.description}
                onChange={(event) => setField("description", event.target.value)}
                aria-invalid={Boolean(errors.description)}
                aria-describedby="store-description-hint store-description-count store-description-error"
                className={inputClass(Boolean(errors.description), "mt-1.5 resize-y")}
              />
              <div className="mt-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p id="store-description-hint" className="text-xs text-slate-500">
                    Hiển thị ở phần giới thiệu trên trang gian hàng.
                  </p>
                  <FieldError id="store-description-error" message={errors.description} />
                </div>
                <p
                  id="store-description-count"
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    values.description.trim().length > STORE_LIMITS.descriptionMax ? "text-rose-700" : "text-slate-500",
                  )}
                >
                  {values.description.trim().length}/{STORE_LIMITS.descriptionMax}
                </p>
              </div>
            </div>

            <FieldGroup title="Liên hệ">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  field="phone"
                  label="Số điện thoại"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0912345678"
                  value={values.phone}
                  error={errors.phone}
                  onChange={setField}
                />
                <TextField
                  field="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  hint="Chỉ dùng để HaiSan Express liên hệ, không hiển thị công khai."
                  value={values.email}
                  error={errors.email}
                  maxLength={STORE_LIMITS.emailMax}
                  onChange={setField}
                />
              </div>
            </FieldGroup>

            <FieldGroup title="Khu vực và địa chỉ" description="Dùng để lọc sản phẩm theo vùng và hiển thị nguồn gốc hàng.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  field="province"
                  label="Tỉnh/thành phố"
                  required
                  value={values.province}
                  error={errors.province}
                  maxLength={STORE_LIMITS.regionMax}
                  onChange={setField}
                />
                <TextField
                  field="district"
                  label="Quận/huyện"
                  required
                  value={values.district}
                  error={errors.district}
                  maxLength={STORE_LIMITS.regionMax}
                  onChange={setField}
                />
                <TextField
                  field="ward"
                  label="Phường/xã"
                  value={values.ward}
                  error={errors.ward}
                  maxLength={STORE_LIMITS.regionMax}
                  onChange={setField}
                />
              </div>
              <TextField
                field="streetAddress"
                label="Địa chỉ"
                required
                placeholder="Số nhà, tên đường, bến cảng"
                value={values.streetAddress}
                error={errors.streetAddress}
                maxLength={STORE_LIMITS.streetAddressMax}
                onChange={setField}
              />
            </FieldGroup>
          </div>
        </fieldset>

        <div className="mt-8 space-y-3 border-t border-slate-100 pt-5">
          {formError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {formError}
            </p>
          )}
          {success && (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {success}
            </p>
          )}
          {!readOnly && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={!dirty || submitting}
                onClick={() => {
                  setValues(initial);
                  setErrors({});
                  setFormError(null);
                }}
                className="rounded-lg bg-brand-soft/50 px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hoàn tác
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {submitting ? "Đang lưu..." : "Lưu cấu hình gian hàng"}
              </button>
            </div>
          )}
        </div>
      </section>
    </form>
  );
}

function FieldGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-4 rounded-xl bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

interface TextFieldProps {
  field: VendorStoreEditableField;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  hint?: string;
  type?: "text" | "tel" | "email";
  inputMode?: "tel" | "email" | "text";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (field: VendorStoreEditableField, value: string) => void;
}

function TextField({ field, label, value, error, required, hint, type = "text", onChange, ...rest }: TextFieldProps) {
  const id = `store-${field}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(field, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
        className={inputClass(Boolean(error), "mt-1.5")}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-rose-700">
      {message}
    </p>
  );
}

function inputClass(invalid: boolean, extra = "") {
  return cn(
    "block w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600",
    invalid ? "border-rose-400" : "border-slate-300 focus:border-brand",
    extra,
  );
}
