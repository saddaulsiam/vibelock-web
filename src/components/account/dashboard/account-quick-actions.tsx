import Link from "next/link";
import { Zap, User, Lock, MessageSquare, LogOut, ChevronRight } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function AccountQuickActions() {
  const actions = [
    {
      title: "Update Profile",
      description: "Edit your personal information",
      icon: User,
      href: "/account/profile",
    },
    {
      title: "Change Password",
      description: "Keep your account secure",
      icon: Lock,
      href: "/account/security",
    },
    {
      title: "Contact Support",
      description: "Get help with your orders",
      icon: MessageSquare,
      href: "/contact",
    },
  ];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[#101114]/10 pb-4">
          <Zap className="size-4.5 text-[#0099b8]" />
          <h3 className="text-base font-bold text-[#101114]">Quick Actions</h3>
        </div>

        {/* Action List */}
        <div className="mt-4 flex flex-col gap-2.5">
          {actions.map((act) => (
            <Link
              key={act.title}
              href={act.href}
              className="group flex items-center justify-between rounded-xl border border-[#101114]/10 p-3 transition-all hover:border-[#101114]/25 hover:bg-[#F3F0E8]/50 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F0E8] text-[#101114] transition-colors group-hover:bg-[#101114] group-hover:text-white">
                  <act.icon className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#101114]">{act.title}</h4>
                  <p className="text-muted-foreground text-[11px]">{act.description}</p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}

          {/* Logout Action */}
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="group flex w-full items-center justify-between rounded-xl border border-[#101114]/10 p-3 text-left transition-all hover:border-rose-200 hover:bg-rose-50/50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F0E8] text-[#101114] transition-colors group-hover:bg-rose-600 group-hover:text-white">
                  <LogOut className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#101114] group-hover:text-rose-700">
                    Logout
                  </h4>
                  <p className="text-muted-foreground text-[11px]">Sign out from your account</p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-600" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
