import Link from "next/link";
import {
  Fish,
  Snowflake,
  Zap,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function CustomerFooter() {
  const guarantees = [
    {
      icon: Fish,
      title: "100% Tươi Sống Mỗi Ngày",
      desc: "Hải sản bơi tại hồ hoặc ướp đá lạnh chuẩn xuất khẩu",
    },
    {
      icon: Snowflake,
      title: "Chuỗi Cung Ứng Lạnh",
      desc: "Đóng thùng xốp oxy/đá gel chuyên dụng chuẩn ISO",
    },
    {
      icon: Zap,
      title: "Giao Nhanh Thần Tốc",
      desc: "Nhận hàng trong 2h tại nội thành TP.HCM & Hà Nội",
    },
    {
      icon: RefreshCw,
      title: "Đổi Trả 1 Đổi 1",
      desc: "Hoàn tiền hoặc đổi mới nếu sản phẩm không đúng mô tả",
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white">
      {/* 1. Policy / Guarantee Bar */}
      <div className="border-b border-slate-100 bg-slate-50/80 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((item, index) => {
              const Icon = item.icon;
              return (
                <ScrollReveal
                  key={index}
                  animation="fade-up-3d"
                  delay={index * 80}
                  className="h-full"
                >
                  <div className="group flex h-full items-start gap-3.5 rounded-xl border border-slate-100 bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg hover:shadow-blue-900/5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#0F3860] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-[#0F3860]">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Main Footer Body */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3860] text-lg text-white">
                🐟
              </div>
              <span className="text-2xl font-black tracking-tight text-[#0F3860]">
                HaiSan<span className="text-[#E63946]">Express</span>
              </span>
            </Link>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-600">
              Sàn giao dịch thương mại điện tử chuyên biệt về hải sản tươi sống và
              đông lạnh tại Việt Nam. Kết nối trực tiếp các vựa, hộ nuôi và cơ
              sở kinh doanh hải sản chất lượng cao tới người tiêu dùng trên toàn
              quốc.
            </p>

            <div className="mt-6 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-[#0F3860] mt-0.5" />
                <span>
                  Tầng 5, Tòa nhà Innovation, Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#0F3860]" />
                <span>
                  Hotline: <strong className="text-slate-900">1900 6868</strong> (7:00 - 21:00)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[#0F3860]" />
                <span>Email: support@haisanexpress.vn</span>
              </div>
            </div>
          </div>

          {/* Links 1: Danh Mục Sản Phẩm */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Danh Mục Sản Phẩm
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="#featured-seafood" className="hover:text-[#0F3860] hover:underline">
                  Cá biển tươi sống
                </Link>
              </li>
              <li>
                <Link href="#featured-seafood" className="hover:text-[#0F3860] hover:underline">
                  Tôm sú, tôm thẻ, tôm hùm
                </Link>
              </li>
              <li>
                <Link href="#featured-seafood" className="hover:text-[#0F3860] hover:underline">
                  Cua Cà Mau, ghẹ Phan Thiết
                </Link>
              </li>
              <li>
                <Link href="#featured-seafood" className="hover:text-[#0F3860] hover:underline">
                  Mực ống, mực một nắng
                </Link>
              </li>
              <li>
                <Link href="#featured-seafood" className="hover:text-[#0F3860] hover:underline">
                  Nghêu, sò, hàu biển
                </Link>
              </li>
              <li>
                <Link href="#featured-seafood" className="font-semibold text-[#E63946] hover:underline">
                  Xem tất cả sản phẩm →
                </Link>
              </li>
            </ul>
          </div>

          {/* Links 2: Hỗ Trợ Khách Hàng */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Hỗ Trợ Khách Hàng
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/help/order-guide" className="hover:text-[#0F3860] hover:underline">
                  Hướng dẫn đặt hàng online
                </Link>
              </li>
              <li>
                <Link href="/help/shipping" className="hover:text-[#0F3860] hover:underline">
                  Chính sách giao hàng & đóng gói
                </Link>
              </li>
              <li>
                <Link href="/help/warranty" className="hover:text-[#0F3860] hover:underline">
                  Quy chuẩn bảo hành & đổi trả
                </Link>
              </li>
              <li>
                <Link href="/help/storage-guide" className="hover:text-[#0F3860] hover:underline">
                  Cẩm nang bảo quản hải sản
                </Link>
              </li>
              <li>
                <Link href="/help/faq" className="hover:text-[#0F3860] hover:underline">
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          {/* Links 3: Dành Cho Đối Tác Vựa */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Dành Cho Đối Tác Vựa
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/vendor/register" className="hover:text-[#0F3860] hover:underline">
                  Đăng ký mở gian hàng vựa
                </Link>
              </li>
              <li>
                <Link href="/terms/platform" className="hover:text-[#0F3860] hover:underline">
                  Quy chế hoạt động sàn TMĐT
                </Link>
              </li>
              <li>
                <Link href="/terms/quality" className="hover:text-[#0F3860] hover:underline">
                  Quy chuẩn nguồn gốc & ATTP
                </Link>
              </li>
              <li>
                <Link href="/contact-b2b" className="hover:text-[#0F3860] hover:underline">
                  Liên hệ hợp tác B2B
                </Link>
              </li>
            </ul>

            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-sky-950">
                  Chứng nhận An Toàn Thực Phẩm
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                Đã thông báo & đăng ký hoạt động với Bộ Công Thương.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar */}
      <div className="border-t border-slate-100 bg-slate-50/50 py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 HaiSan Express Sàn TMĐT. Giấy phép ĐKKD số 0312345678.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms" className="hover:text-slate-800">
              Điều khoản sử dụng
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-800">
              Chính sách bảo mật
            </Link>
            <span>•</span>
            <Link href="/dispute" className="hover:text-slate-800">
              Giải quyết khiếu nại
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
