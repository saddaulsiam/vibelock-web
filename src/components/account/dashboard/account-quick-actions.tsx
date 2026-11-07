import Link from "next/link";
import { User, Lock, MessageSquare, ChevronRight } from "lucide-react";

export function AccountQuickActions() {
  const actions = [
    {
      title: "Personal Profile",
      description: "Update display name, contact phone, and avatar",
      icon: User,
      href: "/account/profile",
    },
    {
      title: "Security & Password",
      description: "Manage credentials and account protection",
      icon: Lock,
      href: "/account/profile#security",
    },
    {
      title: "Help & Customer Support",
      description: "Direct assistance for order or return inquiries",
      icon: MessageSquare,
      href: "/contact",
    },
  ];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
      <div>
        {/* Header */}
        <div className="border-b border-[#101114]/8 pb-3.5 sm:pb-4">
          <h3 className="text-sm font-bold tracking-tight text-[#101114] uppercase sm:text-base">
            Account Preferences
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
            Direct shortcuts to manage credentials and support
          </p>
        </div>

        {/* Action List - Minimalist divider style, comfortable mobile tap targets */}
        <div className="divide-y divide-vl-black/6">
          {actions.map((act) => (
            <Link
              key={act.title}
              href={act.href}
              className="group flex min-h-12 items-center justify-between py-3 transition-colors first:pt-3.5 last:pb-1 hover:text-[#101114]"
            >
              <div className="flex items-center gap-3">
                <act.icon className="size-4 shrink-0 text-neutral-400 transition-colors group-hover:text-[#101114]" />
                <div>
                  <h4 className="text-xs font-semibold text-[#101114]">{act.title}</h4>
                  <p className="text-[11px] text-neutral-500">{act.description}</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-vl-black/8 pt-4">
        <Link
          href="/account/orders"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#101114] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 active:scale-99"
        >
          <span>Track Active Deliveries</span>
        </Link>
      </div>
    </div>
  );
}
