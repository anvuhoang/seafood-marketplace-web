import Link from "next/link";
import { Fish, Mail, MapPin, Phone, RefreshCw, Snowflake, Truck } from "lucide-react";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";

const GUARANTEES = [
  { icon: Fish, title: "Tươi sống mỗi ngày", desc: "Hàng về trong ngày từ vựa đối tác" },
  { icon: Snowflake, title: "Chuỗi lạnh khép kín", desc: "Đóng thùng oxy hoặc đá gel" },
  { icon: Truck, title: "Giao trong 2 giờ", desc: "Nội thành TP.HCM và Hà Nội" },
  { icon: RefreshCw, title: "Đổi trả 1 đổi 1", desc: "Khi hàng không đúng mô tả" },
];

const LINK_GROUPS = [
  {
    title: "Hải sản",
    links: [
      { label: "Cá tươi & đông lạnh", href: "/categories/ca-bien-tuoi" },
      { label: "Tôm sống", href: "/categories/tom-song" },
      { label: "Cua & ghẹ", href: "/categories/cua-ghe" },
      { label: "Mực & bạch tuộc", href: "/categories/muc-bach-tuoc" },
      { label: "Nghêu, sò, ốc", href: "/categories/ngheu-so-oc" },
      { label: "Tất cả hải sản", href: "/products" },
    ],
  },
  {
    title: "Hỗ trợ khách hàng",
    links: [
      { label: "Hướng dẫn đặt hàng", href: "/help/order-guide" },
      { label: "Giao hàng & đóng gói", href: "/help/shipping" },
      { label: "Bảo hành & đổi trả", href: "/help/warranty" },
      { label: "Cẩm nang bảo quản", href: "/help/storage-guide" },
      { label: "Câu hỏi thường gặp", href: "/help/faq" },
    ],
  },
  {
    title: "Đối tác vựa",
    links: [
      { label: "Đăng ký mở gian hàng", href: "/vendor/register" },
      { label: "Quy chế hoạt động", href: "/terms/platform" },
      { label: "Quy chuẩn nguồn gốc & ATTP", href: "/terms/quality" },
      { label: "Hợp tác B2B", href: "/contact-b2b" },
    ],
  },
];

export function CustomerFooter() {
  return (
    <footer className="mt-auto bg-[#0B2540] text-slate-300">
      <div className="border-b border-white/10">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-7 sm:px-6 lg:grid-cols-4 lg:px-8">
          {GUARANTEES.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0F3860]">
              <Fish className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              HaiSan<span className="text-[#FF6B6B]">Express</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Chợ hải sản trực tuyến kết nối các vựa, hộ nuôi và cơ sở kinh doanh hải sản với người mua trên toàn
            quốc.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <a href={`tel:${SUPPORT_HOTLINE.tel}`} className="hover:text-white">
                {SUPPORT_HOTLINE.display}
              </a>
              <span className="text-slate-500">7:00 – 21:00</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <a href="mailto:support@haisanexpress.vn" className="hover:text-white">
                support@haisanexpress.vn
              </a>
            </li>
          </ul>
        </div>

        {LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3 className="text-sm font-semibold text-white">{group.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 HaiSan Express</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-slate-300">
              Điều khoản sử dụng
            </Link>
            <Link href="/privacy" className="hover:text-slate-300">
              Chính sách bảo mật
            </Link>
            <Link href="/dispute" className="hover:text-slate-300">
              Giải quyết khiếu nại
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
