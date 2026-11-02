"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MapPinPlus,
  NotebookPen,
  Pencil,
  ShieldCheck,
  Snowflake,
  Trash2,
} from "lucide-react";
import { AccountPageHeader, AccountShell } from "@/features/account/components/AccountShell";
import { AddressFormDialog } from "@/features/account/components/AddressFormDialog";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/features/account/api/account.api";
import { ADDRESS_LABEL_TEXT, Address, AddressInput } from "@/features/account/types/account.types";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function CustomerAddressesPage() {
  return (
    <AccountShell>
      <AddressBook />
    </AccountShell>
  );
}

function AddressBook() {
  const { accessToken } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dialog, setDialog] = useState<{ address: Address | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      setAddresses(await listAddresses(accessToken));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [accessToken]);

  useEffect(() => {
    // Defer to avoid a synchronous state update during the effect.
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Thao tác không thành công.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async (data: AddressInput) => {
    if (!accessToken || !dialog) return;
    if (dialog.address) {
      await updateAddress(accessToken, dialog.address.id, data);
    } else {
      await createAddress(accessToken, data);
    }
    setDialog(null);
    await reload();
  };

  const handleDelete = (address: Address) => {
    if (!accessToken) return;
    const confirmed = window.confirm(
      `Xóa địa chỉ của ${address.recipientName}?${address.isDefault ? " Địa chỉ mới nhất còn lại sẽ trở thành mặc định." : ""}`,
    );
    if (confirmed) {
      void runAction(address.id, () => deleteAddress(accessToken, address.id));
    }
  };

  return (
    <>
      <AccountPageHeader
        eyebrow="HẬU CẦN & ĐIỀU PHỐI GIAO HẢI SẢN"
        title="Địa chỉ nhận hàng"
        description="Quản lý địa chỉ giao hàng và chọn địa chỉ mặc định để đặt hàng nhanh chóng."
        aside={
          <button
            type="button"
            onClick={() => setDialog({ address: null })}
            disabled={addresses === null}
            className="flex items-center gap-2 self-start rounded-lg bg-[#E63946] px-5 py-3 text-sm font-bold text-white hover:bg-[#D62839] disabled:opacity-50"
          >
            <MapPinPlus className="h-4 w-4" /> Thêm địa chỉ mới
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-[#0F3860]">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">Tổng điểm nhận</p>
            <p className="text-xl font-bold text-slate-900">
              {addresses === null ? "—" : `${String(addresses.length).padStart(2, "0")} địa chỉ`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-sky-100/70 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#0F3860]">
            <Snowflake className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">Đóng gói giữ lạnh</p>
            <p className="text-sm font-bold text-[#0F3860]">Thùng xốp oxy/đá gel chuyên dụng</p>
          </div>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {actionError}
        </p>
      )}

      {loadError ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Không thể tải sổ địa chỉ lúc này. Vui lòng thử lại sau.
        </p>
      ) : addresses === null ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Đang tải sổ địa chỉ...
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <MapPin className="h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Bạn chưa có địa chỉ nhận hàng</h2>
          <p className="mt-1 text-sm text-slate-500">Thêm địa chỉ để đặt hàng nhanh hơn. Địa chỉ đầu tiên sẽ là địa chỉ mặc định.</p>
          <button
            type="button"
            onClick={() => setDialog({ address: null })}
            className="mt-5 flex items-center gap-2 rounded-lg bg-[#0F3860] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2744]"
          >
            <MapPinPlus className="h-4 w-4" /> Thêm địa chỉ đầu tiên
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:flex-row sm:justify-between ${
                address.isDefault ? "border-l-4 border-slate-200 border-l-[#0F3860]" : "border-slate-200"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {address.recipientName} <span className="text-slate-300">—</span> {address.recipientPhone}
                  </h2>
                  {address.isDefault && (
                    <span className="flex items-center gap-1 rounded bg-[#0F3860] px-2 py-0.5 text-[11px] font-bold text-white">
                      <CheckCircle2 className="h-3 w-3" /> Mặc định
                    </span>
                  )}
                  <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-[#0F3860]">
                    {ADDRESS_LABEL_TEXT[address.label]}
                  </span>
                </div>
                <p className="flex items-start gap-1.5 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {[address.streetAddress, address.ward, address.district, address.province].filter(Boolean).join(", ")}
                </p>
                {address.note && (
                  <p className="flex items-start gap-2 rounded-lg bg-sky-50/70 p-3 text-xs text-slate-600">
                    <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3860]" />
                    <span>
                      <b className="text-[#0F3860]">Ghi chú giao hàng:</b> {address.note}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-start gap-2 sm:w-56 sm:flex-col sm:items-stretch">
                {!address.isDefault && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => accessToken && runAction(address.id, () => setDefaultAddress(accessToken, address.id))}
                    className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-[#0F3860] hover:bg-sky-100 disabled:opacity-50"
                  >
                    {busyId === address.id ? "Đang xử lý..." : "Đặt làm mặc định"}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => setDialog({ address })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handleDelete(address)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-[#E63946] hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
                {address.isDefault && (
                  <p className="text-[11px] italic text-slate-400 sm:text-right">Ưu tiên tự động khi thanh toán</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="flex items-start gap-4 rounded-2xl bg-sky-50/70 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F3860] text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Tiêu chuẩn đóng gói vận chuyển hải sản tươi sống</h2>
          <p className="mt-1 text-xs text-slate-600">
            Vui lòng kiểm tra tình trạng hải sản trước khi ký nhận. Đổi trả 1 đổi 1: hoàn tiền hoặc đổi mới nếu sản
            phẩm không đúng mô tả.
          </p>
        </div>
      </section>

      {dialog && (
        <AddressFormDialog
          address={dialog.address}
          isFirstAddress={(addresses?.length ?? 0) === 0}
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
