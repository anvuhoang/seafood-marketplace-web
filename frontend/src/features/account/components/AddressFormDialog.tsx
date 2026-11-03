"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import {
  ADDRESS_LABEL_TEXT,
  Address,
  AddressInput,
  AddressLabel,
  VIETNAM_PHONE_PATTERN,
} from "../types/account.types";

interface AddressFormDialogProps {
  /** Address being edited, or null when adding a new one. */
  address: Address | null;
  /** The first address is always the default, so the checkbox is hidden. */
  isFirstAddress: boolean;
  onClose: () => void;
  onSubmit: (data: AddressInput) => Promise<void>;
}

type Field = "recipientName" | "recipientPhone" | "province" | "district" | "streetAddress";

const EMPTY: AddressInput = {
  recipientName: "",
  recipientPhone: "",
  province: "",
  district: "",
  ward: "",
  streetAddress: "",
  label: "HOME",
  note: "",
  isDefault: false,
};

export function AddressFormDialog({ address, isFirstAddress, onClose, onSubmit }: AddressFormDialogProps) {
  const [form, setForm] = useState<AddressInput>(
    address
      ? {
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          province: address.province,
          district: address.district,
          ward: address.ward ?? "",
          streetAddress: address.streetAddress,
          label: address.label,
          note: address.note ?? "",
          isDefault: address.isDefault,
        }
      : EMPTY,
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInput.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const errors = useMemo(() => {
    const result: Partial<Record<Field, string>> = {};
    if (form.recipientName.trim().length < 2) result.recipientName = "Tên người nhận phải có tối thiểu 2 ký tự.";
    if (!VIETNAM_PHONE_PATTERN.test(form.recipientPhone.trim())) result.recipientPhone = "Số điện thoại không hợp lệ.";
    if (form.province.trim().length < 2) result.province = "Vui lòng nhập tỉnh/thành phố.";
    if (form.district.trim().length < 2) result.district = "Vui lòng nhập quận/huyện.";
    if (form.streetAddress.trim().length < 3) result.streetAddress = "Vui lòng nhập số nhà, tên đường.";
    return result;
  }, [form]);

  const update = (changes: Partial<AddressInput>) => setForm({ ...form, ...changes });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        province: form.province.trim(),
        district: form.district.trim(),
        ward: form.ward?.trim() || undefined,
        streetAddress: form.streetAddress.trim(),
        note: form.note?.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu địa chỉ.");
      setSaving(false);
    }
  };

  const input = (field: Field, label: string, props: { placeholder?: string; type?: string; inputMode?: "tel" } = {}) => (
    <label className="block text-xs font-bold text-slate-700">
      {label} <span className="text-[#E63946]">*</span>
      <input
        ref={field === "recipientName" ? firstInput : undefined}
        value={form[field] ?? ""}
        onChange={(e) => update({ [field]: e.target.value })}
        aria-invalid={touched && Boolean(errors[field])}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F3860]"
        {...props}
      />
      {touched && errors[field] && <span className="mt-1 block font-normal text-rose-600">{errors[field]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-dialog-title"
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="address-dialog-title" className="text-lg font-bold text-slate-900">
            {address ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {input("recipientName", "Tên người nhận")}
          {input("recipientPhone", "Số điện thoại", { type: "tel", inputMode: "tel", placeholder: "0912345678" })}
          {input("province", "Tỉnh/Thành phố", { placeholder: "TP. Hồ Chí Minh" })}
          {input("district", "Quận/Huyện", { placeholder: "Quận 1" })}
        </div>
        <label className="block text-xs font-bold text-slate-700">
          Phường/Xã
          <input
            value={form.ward ?? ""}
            onChange={(e) => update({ ward: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F3860]"
          />
        </label>
        {input("streetAddress", "Số nhà, tên đường", { placeholder: "Số 42 Đường Nguyễn Trãi" })}

        <fieldset>
          <legend className="text-xs font-bold text-slate-700">Loại địa chỉ</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(Object.keys(ADDRESS_LABEL_TEXT) as AddressLabel[]).map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed={form.label === label}
                onClick={() => update({ label })}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  form.label === label ? "bg-[#0F3860] text-white" : "bg-sky-50 text-[#0F3860] hover:bg-sky-100"
                }`}
              >
                {ADDRESS_LABEL_TEXT[label]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-xs font-bold text-slate-700">
          Ghi chú giao hàng
          <textarea
            value={form.note ?? ""}
            maxLength={500}
            rows={3}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="Ví dụ: Gọi trước 15 phút, nhận tại quầy lễ tân tầng 1."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F3860]"
          />
        </label>

        {!isFirstAddress && !address?.isDefault && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => update({ isDefault: e.target.checked })}
              className="h-4 w-4 accent-[#0F3860]"
            />
            Đặt làm địa chỉ mặc định
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#0F3860] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2744] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {address ? "Lưu địa chỉ" : "Thêm địa chỉ"}
          </button>
        </div>
      </form>
    </div>
  );
}
