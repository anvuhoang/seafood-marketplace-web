"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { Address } from "@/features/account/types/account.types";
import { getDistricts, getProvinces, getWards } from "@/features/vendor-registration/api/vendor-registration.api";
import type { AdministrativeUnit } from "@/features/vendor-registration/types/vendor-registration.types";
import { NOTE_MAX, type ShippingErrors, type ShippingFormValues } from "../utils/shipping-form";

export const NEW_ADDRESS = "new";

interface ShippingSectionProps {
  addresses: Address[];
  /** A saved address id, or NEW_ADDRESS to type one. */
  selected: string;
  onSelect: (id: string) => void;
  form: ShippingFormValues;
  onFormChange: (patch: Partial<ShippingFormValues>) => void;
  note: string;
  onNoteChange: (note: string) => void;
  errors: ShippingErrors;
  disabled: boolean;
}

const fieldClass = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3860]/25 disabled:cursor-not-allowed disabled:bg-slate-50 ${
    invalid ? "border-rose-400" : "border-slate-300 focus:border-[#0F3860]"
  }`;

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-700">
      {label} {required && <span className="text-[#E63946]">*</span>}
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-[11px] font-medium text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}

function UnitSelect({
  value,
  units,
  placeholder,
  disabled,
  invalid,
  onPick,
}: {
  value: string;
  units: AdministrativeUnit[];
  placeholder: string;
  disabled: boolean;
  invalid: boolean;
  onPick: (unit: AdministrativeUnit | null) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(event) => onPick(units.find((unit) => unit.code === event.target.value) ?? null)}
      className={fieldClass(invalid)}
    >
      <option value="">{placeholder}</option>
      {units.map((unit) => (
        <option key={unit.code} value={unit.code}>
          {unit.name}
        </option>
      ))}
    </select>
  );
}

/** Where the order goes: a saved address of the customer, or a new one chosen province by province. */
export function ShippingSection({ addresses, selected, onSelect, form, onFormChange, note, onNoteChange, errors, disabled }: ShippingSectionProps) {
  const [provinces, setProvinces] = useState<AdministrativeUnit[]>([]);
  const [districts, setDistricts] = useState<AdministrativeUnit[]>([]);
  const [wards, setWards] = useState<AdministrativeUnit[]>([]);
  const [regionError, setRegionError] = useState(false);

  useEffect(() => {
    let current = true;
    getProvinces()
      .then((list) => current && setProvinces(list))
      .catch(() => current && setRegionError(true));
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!form.provinceCode) return;
    let current = true;
    getDistricts(form.provinceCode)
      .then((list) => current && setDistricts(list))
      .catch(() => current && setRegionError(true));
    return () => {
      current = false;
    };
  }, [form.provinceCode]);

  useEffect(() => {
    if (!form.districtCode) return;
    let current = true;
    getWards(form.districtCode)
      .then((list) => current && setWards(list))
      .catch(() => current && setRegionError(true));
    return () => {
      current = false;
    };
  }, [form.districtCode]);

  const typing = selected === NEW_ADDRESS;

  return (
    <section aria-labelledby="shipping-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div>
        <h2 id="shipping-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F3860] text-[11px] text-white">1</span>
          Thông tin liên hệ & địa chỉ nhận hàng
        </h2>
        <p className="mt-1 text-xs text-slate-500">Quý khách vui lòng cung cấp thông tin chính xác để vựa giao hàng đúng nơi.</p>
      </div>

      {addresses.length > 0 && (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="sr-only">Chọn địa chỉ đã lưu</legend>
          {addresses.map((address) => (
            <label
              key={address.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs ${
                selected === address.id ? "border-[#0F3860] bg-sky-50/50 ring-1 ring-[#0F3860]/20" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="address" checked={selected === address.id} onChange={() => onSelect(address.id)} className="mt-0.5 accent-[#0F3860]" />
              <span className="min-w-0">
                <span className="font-bold text-slate-900">
                  {address.recipientName} · {address.recipientPhone}
                  {address.isDefault && <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Mặc định</span>}
                </span>
                <span className="mt-0.5 block text-slate-600">
                  {[address.streetAddress, address.ward, address.district, address.province].filter(Boolean).join(", ")}
                </span>
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-semibold ${
              typing ? "border-[#0F3860] bg-sky-50/50 ring-1 ring-[#0F3860]/20" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input type="radio" name="address" checked={typing} onChange={() => onSelect(NEW_ADDRESS)} className="accent-[#0F3860]" />
            <MapPin className="h-4 w-4 text-slate-500" aria-hidden />
            Giao đến địa chỉ khác
          </label>
        </fieldset>
      )}

      {typing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Họ và tên người nhận" required error={errors.recipientName}>
            <input
              value={form.recipientName}
              disabled={disabled}
              autoComplete="name"
              onChange={(event) => onFormChange({ recipientName: event.target.value })}
              placeholder="Nguyễn Văn An"
              className={fieldClass(Boolean(errors.recipientName))}
            />
          </Field>
          <Field label="Số điện thoại" required error={errors.recipientPhone}>
            <input
              value={form.recipientPhone}
              disabled={disabled}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              onChange={(event) => onFormChange({ recipientPhone: event.target.value })}
              placeholder="0912345678"
              className={fieldClass(Boolean(errors.recipientPhone))}
            />
          </Field>
          <Field label="Tỉnh/Thành phố" required error={errors.province}>
            <UnitSelect
              value={form.provinceCode}
              units={provinces}
              placeholder="Chọn tỉnh/thành phố"
              disabled={disabled || provinces.length === 0}
              invalid={Boolean(errors.province)}
              onPick={(unit) => {
                setDistricts([]);
                setWards([]);
                onFormChange({ provinceCode: unit?.code ?? "", province: unit?.name ?? "", districtCode: "", district: "", wardCode: "", ward: "" });
              }}
            />
          </Field>
          <Field label="Quận/Huyện" required error={errors.district}>
            <UnitSelect
              value={form.districtCode}
              units={form.provinceCode ? districts : []}
              placeholder="Chọn quận/huyện"
              disabled={disabled || !form.provinceCode}
              invalid={Boolean(errors.district)}
              onPick={(unit) => {
                setWards([]);
                onFormChange({ districtCode: unit?.code ?? "", district: unit?.name ?? "", wardCode: "", ward: "" });
              }}
            />
          </Field>
          <Field label="Phường/Xã">
            <UnitSelect
              value={form.wardCode}
              units={form.districtCode ? wards : []}
              placeholder="Chọn phường/xã (không bắt buộc)"
              disabled={disabled || !form.districtCode}
              invalid={false}
              onPick={(unit) => onFormChange({ wardCode: unit?.code ?? "", ward: unit?.name ?? "" })}
            />
          </Field>
          <Field label="Địa chỉ chi tiết (số nhà, tên đường)" required error={errors.streetAddress}>
            <input
              value={form.streetAddress}
              disabled={disabled}
              autoComplete="street-address"
              onChange={(event) => onFormChange({ streetAddress: event.target.value })}
              placeholder="Số 12, Đường Nguyễn Hữu Thọ"
              className={fieldClass(Boolean(errors.streetAddress))}
            />
          </Field>
          {regionError && (
            <p role="alert" className="text-xs text-rose-600 sm:col-span-2">
              Không tải được danh sách tỉnh, quận, phường. Vui lòng tải lại trang.
            </p>
          )}
        </div>
      )}

      <Field label="Ghi chú cho vựa (tùy chọn)" error={errors.customerNote}>
        <textarea
          value={note}
          disabled={disabled}
          rows={2}
          maxLength={NOTE_MAX + 50}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Ví dụ: Giao giờ hành chính, gọi trước 15 phút"
          className={fieldClass(Boolean(errors.customerNote))}
        />
      </Field>
    </section>
  );
}
