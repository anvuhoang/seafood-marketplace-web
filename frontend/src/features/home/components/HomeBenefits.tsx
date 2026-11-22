import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const STEPS = [
  {
    title: "Chọn hải sản và vựa",
    description: "So sánh giá, kích cỡ và đánh giá thật của người mua trước giữa các vựa.",
  },
  {
    title: "Chọn cách sơ chế",
    description: "Giữ sống trong túi oxy, ướp đá hoặc hút chân không theo nhu cầu nấu.",
  },
  {
    title: "Nhận hàng trong ngày",
    description: "Vựa đóng thùng ngay khi có đơn, giao trong 2 giờ tại nội thành.",
  },
];

/** How buying works, plus the invitation for vendors to open a shop. */
export function HomeBenefits() {
  return (
    <section className="bg-slate-50 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Mua hàng trong 3 bước</h2>
        </ScrollReveal>

        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <ScrollReveal as="li" key={step.title} delay={index * 120} className="reveal-line relative pt-5">
              <span className="text-sm font-semibold text-sky-700 tabular-nums">0{index + 1}</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </ScrollReveal>
          ))}
        </ol>

        <ScrollReveal animation="zoom" className="mt-14 flex flex-col gap-6 rounded-2xl bg-[#0F3860] px-6 py-8 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h3 className="text-xl font-semibold">Bạn là chủ vựa hải sản?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Mở gian hàng miễn phí, nhận đơn từ người mua khắp thành phố và tự quản lý giá, tồn kho.
            </p>
          </div>
          <Link
            href="/vendor/register"
            className="group inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0F3860] transition-colors hover:bg-sky-100 md:self-center"
          >
            Đăng ký mở gian hàng
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
