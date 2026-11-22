import Link from "next/link";
import { Anchor } from "lucide-react";
import "./marquee.css";

/** Fishing grounds where partner vendors sell today; keys match the listing's region filter. */
const GROUNDS = [
  { name: "Phú Quốc", region: "phu-quoc" },
  { name: "Côn Đảo", region: "con-dao" },
  { name: "Nha Trang", region: "nha-trang" },
  { name: "Phan Thiết", region: "phan-thiet" },
  { name: "Năm Căn", region: "nam-can" },
  { name: "Vân Đồn", region: "van-don" },
];

function GroundList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center gap-10 pr-10">
      {GROUNDS.map((ground) => (
        <li key={ground.region} className="flex items-center gap-10">
          <Link
            href={`/products?region=${ground.region}`}
            tabIndex={hidden ? -1 : undefined}
            className="text-lg font-semibold whitespace-nowrap text-slate-800 transition-colors hover:text-[#0F3860] sm:text-xl"
          >
            {ground.name}
          </Link>
          <Anchor aria-hidden className="h-4 w-4 text-sky-400" />
        </li>
      ))}
    </ul>
  );
}

/** A slow, endless strip of fishing grounds; it pauses on hover and stays still for reduced motion. */
export function FishingGroundsMarquee() {
  return (
    <section aria-label="Ngư trường có hàng hôm nay" className="border-b border-slate-200 bg-white py-5">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <p className="hidden shrink-0 text-sm text-slate-500 md:block">Hàng về hôm nay từ</p>
        <div className="marquee-mask relative flex-1 overflow-hidden">
          {/* Two copies side by side; the track slides by exactly one copy and loops. */}
          <div className="marquee-track flex w-max">
            <GroundList />
            <GroundList hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
