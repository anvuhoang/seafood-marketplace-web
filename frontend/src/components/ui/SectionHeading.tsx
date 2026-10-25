import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  note?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  note,
  align = "left",
}: SectionHeadingProps) {
  if (align === "center") {
    return (
      <div className="mx-auto mb-10 max-w-2xl text-center">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#0F3860]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 text-sm leading-relaxed text-slate-500 sm:text-base">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#0F3860]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        {note && <span className="text-xs italic text-slate-400">{note}</span>}
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#0F3860] transition-colors hover:text-[#E63946]"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  );
}
