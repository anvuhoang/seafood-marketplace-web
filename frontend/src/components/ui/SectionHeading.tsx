import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

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
  const eyebrowText = eyebrow && <p className="mb-2 text-sm font-medium text-sky-700">{eyebrow}</p>;
  const titleText = (
    <h2 className="text-2xl font-bold tracking-tight text-balance text-slate-900 sm:text-[28px]">{title}</h2>
  );

  if (align === "center") {
    return (
      <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center">
        {eyebrowText}
        {titleText}
        {description && <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>}
      </ScrollReveal>
    );
  }

  return (
    <ScrollReveal className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        {eyebrowText}
        {titleText}
        {description && <p className="mt-2 text-base leading-relaxed text-slate-500">{description}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        {note && <span className="text-xs text-slate-400">{note}</span>}
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F3860] hover:underline underline-offset-4"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </ScrollReveal>
  );
}
