import { Clock, PackageCheck, Thermometer } from "lucide-react";

const DETAILS = [
  { icon: Thermometer, label: "Nhiệt độ nước bảo quản", value: "20–22°C" },
  { icon: Clock, label: "Thời gian giữ sống", value: "4–6 giờ" },
  { icon: PackageCheck, label: "Kiểm hàng", value: "Mở thùng trước khi nhận" },
];

export function ColdChainStandardCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Đóng gói & giữ lạnh</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Hải sản sống được đóng thùng xốp có sục oxy và đá gel giữ nhiệt, giúp tôm, cua, ghẹ khỏe suốt quãng đường
        giao.
      </p>
      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        {DETAILS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2 text-slate-500">
              <Icon className="h-4 w-4 text-slate-400" />
              {label}
            </dt>
            <dd className="font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
