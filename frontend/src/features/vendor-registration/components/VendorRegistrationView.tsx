"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Loader2,
  LogIn,
  PauseCircle,
  ShieldAlert,
  Store,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getMyRegistration } from "../api/vendor-registration.api";
import type { VendorApplication, VendorRegistrationState, VendorRegistrationStatus } from "../types/vendor-registration.types";
import { formFromApplication, formatDateTime } from "../utils/registration-form";
import { SectionTitle, VendorRegistrationForm } from "./VendorRegistrationForm";

const REGISTER_PATH = "/vendor/register";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; state: VendorRegistrationState };

async function loadRegistration(token: string): Promise<Load> {
  try {
    return { kind: "ready", state: await getMyRegistration(token) };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof ApiError && error.statusCode !== 401
          ? error.message
          : "Không tải được trạng thái hồ sơ. Vui lòng thử lại.",
    };
  }
}

export function VendorRegistrationView() {
  const router = useRouter();
  const { user, accessToken, isLoading, logout } = useAuth();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [justSubmitted, setJustSubmitted] = useState(false);

  const fetchState = useCallback((token: string) => {
    void loadRegistration(token).then(setLoad);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      // The cookie said "signed in" but the session did not survive validation.
      router.replace(`/customer/login?redirect=${encodeURIComponent(REGISTER_PATH)}`);
      return;
    }
    let cancelled = false;
    void loadRegistration(accessToken).then((next) => {
      if (!cancelled) setLoad(next);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, isLoading, router]);

  /** After approval the session still carries the old role; signing in again issues the new one. */
  const signInAgain = () => {
    logout();
    router.replace(`/customer/login?redirect=${encodeURIComponent("/vendor/dashboard")}`);
  };

  const state = load.kind === "ready" ? load.state : null;
  const isAdmin = state?.accountRole === "ADMIN" || user?.role === "ADMIN";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Hero status={state?.status ?? null} showSteps={!isAdmin} />

      <div className="mt-8">
        {load.kind === "loading" && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-20 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Đang tải trạng thái hồ sơ…
          </div>
        )}

        {load.kind === "error" && (
          <Notice tone="error" icon={<AlertTriangle className="h-5 w-5" />} title="Không tải được hồ sơ">
            <p>{load.message}</p>
            <button
              type="button"
              onClick={() => {
                if (!accessToken) return;
                setLoad({ kind: "loading" });
                fetchState(accessToken);
              }}
              className="mt-4 rounded-xl bg-[#0F3860] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b2c4c]"
            >
              Thử lại
            </button>
          </Notice>
        )}

        {state && accessToken && (
          isAdmin ? (
            <Notice tone="info" icon={<ShieldAlert className="h-5 w-5" />} title="Tài khoản quản trị viên không đăng ký gian hàng được">
              <p>Đăng ký gian hàng chỉ dành cho tài khoản khách hàng. Hãy dùng một tài khoản khách hàng khác nếu bạn muốn mở gian hàng.</p>
            </Notice>
          ) : (
            <StateBody
              state={state}
              token={accessToken}
              sessionRole={user?.role}
              justSubmitted={justSubmitted}
              onSubmitted={(next) => {
                setJustSubmitted(true);
                setLoad({ kind: "ready", state: next });
                window.scrollTo({ top: 0 });
              }}
              onConflict={() => fetchState(accessToken)}
              onSignInAgain={signInAgain}
            />
          )
        )}
      </div>
    </div>
  );
}

function StateBody({
  state,
  token,
  sessionRole,
  justSubmitted,
  onSubmitted,
  onConflict,
  onSignInAgain,
}: {
  state: VendorRegistrationState;
  token: string;
  sessionRole: string | undefined;
  justSubmitted: boolean;
  onSubmitted: (state: VendorRegistrationState) => void;
  onConflict: () => void;
  onSignInAgain: () => void;
}) {
  const { status, application } = state;

  if (status === "NONE" || status === "REJECTED") {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          <VendorRegistrationForm
            // Remount when switching between a fresh and a pre-filled form.
            key={status}
            token={token}
            initial={formFromApplication(status === "REJECTED" ? application : null)}
            isResubmission={status === "REJECTED"}
            onSubmitted={onSubmitted}
            onConflict={onConflict}
          />
        </div>
        <StatusPanel state={state} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0 space-y-6">
        {status === "PENDING" && justSubmitted && (
          <Notice tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Đã gửi hồ sơ">
            <p>Hồ sơ của bạn đã được lưu và đang chờ quản trị viên duyệt.</p>
          </Notice>
        )}

        {status === "ACTIVE" &&
          (sessionRole === "VENDOR" ? (
            <Notice tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Gian hàng đã được duyệt">
              <p>Gian hàng của bạn đang hoạt động. Vào kênh vựa để quản lý sản phẩm và đơn hàng.</p>
              <Link
                href="/vendor/dashboard"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b2c4c]"
              >
                <Store className="h-4 w-4" /> Vào trang quản lý vựa
              </Link>
            </Notice>
          ) : (
            <Notice tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Gian hàng đã được duyệt">
              <p>
                Phiên đăng nhập hiện tại được tạo trước khi gian hàng được duyệt. Vui lòng đăng nhập lại để vào kênh vựa.
              </p>
              <button
                type="button"
                onClick={onSignInAgain}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b2c4c]"
              >
                <LogIn className="h-4 w-4" /> Đăng xuất và đăng nhập lại
              </button>
            </Notice>
          ))}

        {status === "SUSPENDED" && (
          <Notice tone="warning" icon={<PauseCircle className="h-5 w-5" />} title="Gian hàng đang bị tạm ngưng">
            <p>
              Gian hàng của bạn đã bị quản trị viên tạm ngưng nên không bán được hàng và không thể đăng ký gian hàng mới.
              Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.
            </p>
          </Notice>
        )}

        {application && <ApplicationSummary application={application} />}
      </div>
      <StatusPanel state={state} />
    </div>
  );
}

function ApplicationSummary({ application }: { application: VendorApplication }) {
  const address = [application.streetAddress, application.ward, application.district, application.province]
    .filter(Boolean)
    .join(", ");
  const rows: Array<[string, string]> = [
    ["Tên gian hàng", application.name],
    ["Số điện thoại", application.contactPhone ?? "Chưa có"],
    ["Địa chỉ kho hàng", address],
    ["Giới thiệu", application.description ?? "Không có"],
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <SectionTitle icon={<FileText className="h-5 w-5" />} title="Thông tin đã gửi" />
      <dl className="mt-6 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="whitespace-pre-line break-words text-sm font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STATUS_DISPLAY: Record<
  VendorRegistrationStatus,
  { label: string; title: string; badge: string; icon: React.ReactNode; tile: string }
> = {
  NONE: { label: "Chưa gửi", title: "Chưa có hồ sơ", badge: "bg-slate-100 text-slate-600", icon: <FileText className="h-6 w-6" />, tile: "bg-slate-100 text-slate-500" },
  PENDING: { label: "Đang chờ duyệt", title: "Chờ duyệt hồ sơ", badge: "bg-amber-100 text-amber-800", icon: <Hourglass className="h-6 w-6" />, tile: "bg-amber-50 text-amber-700" },
  REJECTED: { label: "Cần bổ sung", title: "Hồ sơ bị từ chối", badge: "bg-rose-100 text-rose-700", icon: <XCircle className="h-6 w-6" />, tile: "bg-rose-50 text-rose-600" },
  ACTIVE: { label: "Đang hoạt động", title: "Đã được duyệt", badge: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-6 w-6" />, tile: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Tạm ngưng", title: "Gian hàng tạm ngưng", badge: "bg-orange-100 text-orange-800", icon: <PauseCircle className="h-6 w-6" />, tile: "bg-orange-50 text-orange-700" },
};

function StatusPanel({ state }: { state: VendorRegistrationState }) {
  const display = STATUS_DISPLAY[state.status];
  const application = state.application;
  const resubmitted = application && application.updatedAt !== application.createdAt;

  return (
    <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
      <h2 className="text-base font-bold text-slate-900">Trạng thái hồ sơ</h2>
      <div className="mt-4 flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${display.tile}`}>{display.icon}</span>
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${display.badge}`}>{display.label}</span>
          <p className="mt-1 text-lg font-bold text-slate-900">{display.title}</p>
        </div>
      </div>

      {state.status === "REJECTED" && (
        <div className="mt-5 rounded-xl bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Lý do từ chối</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-rose-700">
            {state.rejectionReason ?? "Quản trị viên không ghi lý do."}
          </p>
          <p className="mt-3 text-xs text-rose-700">Bạn có thể sửa thông tin trong biểu mẫu và gửi lại hồ sơ.</p>
        </div>
      )}

      {state.status === "NONE" ? (
        <ul className="mt-5 space-y-3 text-sm text-slate-600">
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Mỗi tài khoản đăng ký được một gian hàng.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Sau khi gửi, hồ sơ chờ quản trị viên duyệt.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Gian hàng chỉ hiển thị và nhận đơn khi đã được duyệt.
          </li>
        </ul>
      ) : (
        application && (
          <dl className="mt-5 space-y-3 rounded-xl bg-sky-50/70 p-4 text-sm">
            <div>
              <dt className="text-slate-500">Gian hàng</dt>
              <dd className="break-words font-semibold text-slate-900">{application.name}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5" /> Nộp lần đầu
              </dt>
              <dd className="font-semibold text-slate-900">{formatDateTime(application.createdAt)}</dd>
            </div>
            {state.status === "PENDING" && resubmitted && (
              <div>
                <dt className="text-slate-500">Gửi lại gần nhất</dt>
                <dd className="font-semibold text-slate-900">{formatDateTime(application.updatedAt)}</dd>
              </div>
            )}
          </dl>
        )
      )}
    </aside>
  );
}

const STEPS = ["Gửi hồ sơ", "Chờ duyệt", "Mở bán"] as const;

/** Step index reached and how the current step looks, derived from the real status. */
function stepState(status: VendorRegistrationStatus | null): { current: number; tone: "normal" | "error" | "warning" } {
  switch (status) {
    case "PENDING":
      return { current: 1, tone: "normal" };
    case "REJECTED":
      return { current: 1, tone: "error" };
    case "ACTIVE":
      return { current: 3, tone: "normal" };
    case "SUSPENDED":
      return { current: 2, tone: "warning" };
    default:
      return { current: 0, tone: "normal" };
  }
}

function Hero({ status, showSteps }: { status: VendorRegistrationStatus | null; showSteps: boolean }) {
  const { current, tone } = stepState(status);

  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-100 via-sky-50 to-white p-6 sm:p-10">
      <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#0F3860]">
        <Store className="h-3.5 w-3.5" /> Kênh người bán
      </p>
      <h1 className="mt-4 text-2xl font-bold text-[#0F3860] sm:text-4xl">Đăng ký mở gian hàng</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
        Mở gian hàng trên HaiSan Express để bán hải sản tươi sống tới khách hàng. Điền thông tin vựa, gửi hồ sơ và chờ
        quản trị viên duyệt.
      </p>

      {showSteps && <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((label, index) => {
          const done = index < current;
          const isCurrent = index === current && current < STEPS.length;
          const flagged = isCurrent && tone !== "normal";
          const box = flagged
            ? tone === "error"
              ? "bg-white ring-2 ring-rose-300"
              : "bg-white ring-2 ring-orange-300"
            : isCurrent
              ? "bg-[#0F3860] text-white"
              : "bg-white/80";
          const dot = done
            ? "bg-emerald-600 text-white"
            : flagged
              ? tone === "error"
                ? "bg-rose-100 text-rose-700"
                : "bg-orange-100 text-orange-700"
              : isCurrent
                ? "bg-white text-[#0F3860]"
                : "bg-slate-100 text-slate-500";
          const caption = done
            ? "Đã xong"
            : flagged
              ? tone === "error"
                ? "Cần sửa và gửi lại"
                : "Đang tạm ngưng"
              : isCurrent
                ? "Đang thực hiện"
                : "Chưa tới";

          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${box}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${dot}`}>
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-xs ${isCurrent && !flagged ? "text-sky-100" : "text-slate-500"}`}>
                  Bước {index + 1} · {caption}
                </span>
                <span className={`block text-sm font-bold ${isCurrent && !flagged ? "text-white" : "text-slate-900"}`}>
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>}
    </section>
  );
}

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "success" | "info" | "warning" | "error";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-orange-200 bg-orange-50 text-orange-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];

  return (
    <section role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border p-5 sm:p-6 ${styles}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 text-sm">
          <h2 className="text-base font-bold">{title}</h2>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
