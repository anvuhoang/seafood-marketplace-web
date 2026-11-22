import { useId } from "react";
import Form from "next/form";
import { Search } from "lucide-react";

interface KeywordSearchFormProps {
  defaultValue?: string | null;
  label?: string;
  placeholder?: string;
}

/** Fallback when the photo cannot help: type the name and search the catalogue. */
export function KeywordSearchForm({
  defaultValue,
  label = "Nhập tên bằng tay",
  placeholder = "Ví dụ: tôm sú, cua gạch, mực ống",
}: KeywordSearchFormProps) {
  const inputId = useId();
  return (
    <Form action="/products" className="w-full">
      <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          name="q"
          type="search"
          required
          maxLength={100}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0F3860]"
        />
        <button
          type="submit"
          aria-label="Tìm bằng từ khóa"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0F3860] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0A2744]"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Tìm</span>
        </button>
      </div>
    </Form>
  );
}
