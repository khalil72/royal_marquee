import { Crown } from "lucide-react";
import type { Settings } from "@/lib/types";

/** Letterhead shared by invoices and receipts. Uses fixed colours so it prints identically in dark mode. */
export function DocumentHeader({ settings, title, meta }: { settings: Settings; title: string; meta: [string, string][] }) {
  return (
    <div className="flex flex-col justify-between gap-6 border-b-2 border-[#5b21b6] pb-6 sm:flex-row print:flex-row">
      <div className="flex items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#5b21b6] text-white">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt="" className="size-full object-cover" />
          ) : (
            <Crown className="size-8" />
          )}
        </div>
        <div className="text-sm leading-relaxed text-[#475569]">
          <p className="text-xl font-bold text-[#1e1b4b]">{settings.businessName}</p>
          {settings.tagline && <p className="font-medium text-[#6d28d9]">{settings.tagline}</p>}
          <p>{settings.address}</p>
          <p>
            {settings.phone}
            {settings.email && ` · ${settings.email}`}
          </p>
          {settings.website && <p>{settings.website}</p>}
          {settings.ntn && <p>NTN: {settings.ntn}</p>}
        </div>
      </div>
      <div className="sm:text-right print:text-right">
        <p className="text-3xl font-extrabold tracking-wide text-[#5b21b6] uppercase">{title}</p>
        <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm sm:justify-end print:justify-end">
          {meta.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[#64748b]">{k}</dt>
              <dd className="font-semibold text-[#0f172a]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
