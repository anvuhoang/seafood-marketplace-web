import { Store, ShieldCheck, Headset, Sparkles } from "lucide-react";
import { homeBenefits } from "../data/home.mock";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function HomeBenefits() {
  const getIcon = (name: string) => {
    switch (name) {
      case "Store":
        return <Store className="h-6 w-6 text-[#0F3860]" />;
      case "ShieldCheck":
        return <ShieldCheck className="h-6 w-6 text-emerald-600" />;
      case "Headset":
        return <Headset className="h-6 w-6 text-sky-600" />;
      case "Sparkles":
      default:
        return <Sparkles className="h-6 w-6 text-amber-500" />;
    }
  };

  const getBg = (name: string) => {
    switch (name) {
      case "Store":
        return "bg-slate-100 group-hover:bg-slate-200";
      case "ShieldCheck":
        return "bg-emerald-50 group-hover:bg-emerald-100";
      case "Headset":
        return "bg-sky-50 group-hover:bg-sky-100";
      case "Sparkles":
      default:
        return "bg-amber-50 group-hover:bg-amber-100";
    }
  };

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="DỊCH VỤ TẬN TÂM"
          title="Vì sao chọn mua tại HaiSan Express"
          description="Giải pháp mua hải sản an toàn, tươi ngon tiện lợi nhất cho gia đình & nhà hàng của bạn"
          align="center"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {homeBenefits.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg"
            >
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${getBg(
                  item.iconName
                )}`}
              >
                {getIcon(item.iconName)}
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
