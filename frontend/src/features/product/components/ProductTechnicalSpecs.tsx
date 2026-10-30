import { TechnicalSpecifications } from "../types/product.types";
import { Compass, FileText, Fish } from "lucide-react";

interface ProductTechnicalSpecsProps {
  specs: TechnicalSpecifications;
}

export function ProductTechnicalSpecs({ specs }: ProductTechnicalSpecsProps) {
  // Only facts stored for this product are shown.
  const specItems = [
    { label: "TÊN PHỔ THÔNG", value: specs.commonName, icon: Fish },
    { label: "TÊN KHOA HỌC", value: specs.scientificName, icon: FileText, isItalic: true },
    { label: "NGUỒN GỐC (VỰA)", value: specs.origin, icon: Compass },
  ].filter((item) => item.value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-[#0F3860]">
          <FileText className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Thông Số Chuyên Ngành Thủy Sản
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {specItems.map(({ label, value, icon: Icon, isItalic }) => (
          <div key={label} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
              <div className={`mt-1 text-xs font-bold text-slate-800 ${isItalic ? "italic" : ""}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
