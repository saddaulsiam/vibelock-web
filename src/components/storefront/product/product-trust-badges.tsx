import { Truck, RotateCcw, ShieldCheck, Banknote } from "lucide-react";

export function ProductTrustBadges() {
  const perks = [
    {
      icon: Banknote,
      title: "Cash on Delivery",
      subtitle: "Pay upon arrival anywhere in BD",
    },
    {
      icon: Truck,
      title: "Express Shipping",
      subtitle: "24-48h Dhaka • 3-5 days outside",
    },
    {
      icon: RotateCcw,
      title: "7 Days Exchange",
      subtitle: "Easy size & fit replacements",
    },
    {
      icon: ShieldCheck,
      title: "100% Authentic",
      subtitle: "Original VibeLock heavy cotton",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-vl-dark-900/10 bg-vl-white-300/40 p-3 sm:p-4">
      {perks.map((perk) => {
        const Icon = perk.icon;
        return (
          <div key={perk.title} className="flex items-start gap-2.5 p-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs ring-1 ring-black/5 text-vl-dark-900">
              <Icon className="size-3.5 text-vl-cyan-dark" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight text-vl-dark-900">{perk.title}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-vl-dark-900/60 truncate">
                {perk.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

