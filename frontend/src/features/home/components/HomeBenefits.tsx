import { Store, ShieldCheck, Headset, Sparkles } from "lucide-react";
import { homeBenefits } from "../data/home.mock";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TiltCard } from "@/components/ui/TiltCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function HomeBenefits() {
  const getIcon = (name: string) => {
    switch (name) {
      case "Store":
        return <Store className="h-6 w-6 text-[#0F3860] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />;
      case "ShieldCheck":
        return <ShieldCheck className="h-6 w-6 text-emerald-600 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />;
      case "Headset":
        return <Headset className="h-6 w-6 text-sky-600 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />;
      case "Sparkles":
      default:
        return <Sparkles className="h-6 w-6 text-amber-500 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />;
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
        <ScrollReveal animation="fade-up-3d">
          <SectionHeading
            eyebrow="DỊCH VỤ TẬN TÂM"
            title="Vì sao chọn mua tại HaiSan Express"
            description="Giải pháp mua hải sản an toàn, tươi ngon tiện lợi nhất cho gia đình & nhà hàng của bạn"
            align="center"
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {homeBenefits.map((item, idx) => (
            <ScrollReveal
              key={item.id}
              animation="fade-up-3d"
              delay={idx * 90}
              className="h-full"
            >
              <TiltCard
                maxTilt={8}
                scale={1.02}
                className="h-full rounded-2xl"
              >
              <div className="group h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-xs transition-all duration-300 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-300/40 preserve-3d">
                <div
                  style={{ transform: "translateZ(26px)" }}
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs transition-colors duration-300 ${getBg(
                    item.iconName
                  )}`}
                >
                  {getIcon(item.iconName)}
                </div>

                <h3
                  style={{ transform: "translateZ(16px)" }}
                  className="text-base font-bold text-slate-900 transition-colors group-hover:text-[#0F3860]"
                >
                  {item.title}
                </h3>
                <p
                  style={{ transform: "translateZ(10px)" }}
                  className="mt-2 text-xs leading-relaxed text-slate-500"
                >
                  {item.description}
                </p>
              </div>
            </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

