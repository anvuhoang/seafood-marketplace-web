import type { LucideIcon } from "lucide-react";

/** Placeholder for console pages whose features are not built yet. Shows no sample data. */
export function VendorComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
      <h2 className="mt-3 text-base font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </section>
  );
}
