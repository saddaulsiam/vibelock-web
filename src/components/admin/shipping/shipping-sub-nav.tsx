import Link from "next/link";
import { Truck, MapPin, DollarSign } from "lucide-react";

export function ShippingSubNav({ activeTab }: { activeTab: "shipments" | "zones" | "methods" }) {
  const tabs = [
    {
      id: "shipments",
      label: "Live Shipments & Dispatch",
      href: "/admin/shipping",
      icon: Truck,
    },
    {
      id: "zones",
      label: "Delivery Zones",
      href: "/admin/shipping/zones",
      icon: MapPin,
    },
    {
      id: "methods",
      label: "Shipping Rates & Methods",
      href: "/admin/shipping/methods",
      icon: DollarSign,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              isActive
                ? "bg-[#101114] text-white shadow-2xs"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <Icon className={`size-3.5 ${isActive ? "text-[#00D9FF]" : "text-neutral-500"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
