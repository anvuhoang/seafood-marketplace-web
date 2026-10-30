"use client";

import { useRouter } from "next/navigation";

interface CatalogSortSelectProps {
  value: string;
  options: Array<{ key: string; label: string; href: string }>;
}

/**
 * Sort dropdown. Each option carries its prebuilt listing URL, so the
 * component does not need to read search params itself.
 */
export function CatalogSortSelect({ value, options }: CatalogSortSelectProps) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="hidden sm:inline">Sắp xếp:</span>
      <select
        value={value}
        onChange={(event) => {
          const option = options.find((o) => o.key === event.target.value);
          if (option) router.push(option.href, { scroll: false });
        }}
        className="rounded-lg border border-slate-200 bg-sky-50/60 px-3 py-2 text-xs font-bold text-[#0F3860] outline-none focus:border-[#0F3860]"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
