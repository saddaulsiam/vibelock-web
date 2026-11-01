"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Clock,
  UserCheck,
  ShoppingBag,
  Banknote,
  Lock,
  RotateCcw,
  PauseCircle,
  Receipt,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PosShiftSummary } from "@/lib/pos/pos-shift-types";

interface PosHeaderProps {
  cashierName: string;
  cashierRole: string;
  shift?: PosShiftSummary | null;
  onOpenShiftModal?: () => void;
  onOpenReturnModal?: () => void;
  parkedCount?: number;
  onOpenParkedModal?: () => void;
  onOpenOrdersModal?: () => void;
  isOnline?: boolean;
}

export function PosHeader({
  cashierName,
  cashierRole,
  shift,
  onOpenShiftModal,
  onOpenReturnModal,
  parkedCount,
  onOpenParkedModal,
  onOpenOrdersModal,
  isOnline = true,
}: PosHeaderProps) {
  const [time, setTime] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="bg-vl-black text-vl-white px-4 py-2.5 flex items-center justify-between shadow-md border-b border-white/10 select-none">
      <div className="flex items-center space-x-3">
        <Link href="/admin">
          <Button
            variant="ghost"
            size="sm"
            className="text-vl-white/70 hover:text-vl-white hover:bg-white/10 -ml-1 h-9 px-3 rounded-xl transition-all"
            title="Exit to Admin Dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline text-xs font-heading font-black tracking-wider">Exit Admin</span>
          </Button>
        </Link>

        <div className="h-4 w-px bg-white/15 hidden sm:block" />

        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vl-cyan text-vl-black shadow-[0_0_16px_rgba(0,217,255,0.4)]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-heading font-black tracking-wider text-base text-vl-white">
                VIBELOCK
              </span>
              <Badge className="bg-vl-cyan text-vl-black text-[10px] font-heading font-black px-1.5 py-0 hover:bg-vl-cyan shadow-xs rounded">
                POS
              </Badge>
            </div>
            <p className="text-[10px] text-vl-grey tracking-widest uppercase font-semibold">
              Outlet Counter 01
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Network Connectivity Status Indicator */}
        {isOnline === false ? (
          <div
            className="flex items-center space-x-1.5 bg-red-950/80 px-3 py-1.5 rounded-xl border border-red-700/60 text-xs font-mono text-red-300 animate-pulse select-none shadow-2xs"
            title="Counter is operating offline. Server checkout is locked."
          >
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
            <span className="font-bold text-[11px] tracking-wide">Offline</span>
          </div>
        ) : (
          <div
            className="hidden sm:flex items-center space-x-2 bg-[#16171c] px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-vl-cyan select-none shadow-2xs"
            title="Counter is connected online."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vl-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-vl-cyan" />
            </span>
            <span className="font-bold text-[11px] tracking-wide">Online</span>
          </div>
        )}

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center space-x-2 bg-[#16171c] px-3 py-1.5 rounded-xl border border-white/10 text-vl-white text-xs font-mono shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-vl-cyan" />
          <span className="font-semibold tracking-wider">{time || "00:00:00"}</span>
        </div>

        {/* In-Store Returns & Exchanges Quick Button */}
        {onOpenReturnModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenReturnModal}
            className="text-vl-white/80 hover:text-vl-white hover:bg-white/10 text-xs h-9 px-3 rounded-xl space-x-1.5 transition-all"
            title="In-Store Returns & Exchanges [F3]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-vl-cyan" />
            <span className="hidden md:inline font-heading font-black text-xs">Returns</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md text-vl-cyan font-mono hidden lg:inline">
              F3
            </span>
          </Button>
        )}

        {/* Parked Sales / Held Carts Quick Button */}
        {onOpenParkedModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenParkedModal}
            className={`text-xs h-9 px-3 rounded-xl space-x-1.5 transition-all ${
              (parkedCount || 0) > 0
                ? "bg-vl-cyan/15 text-vl-cyan hover:bg-vl-cyan/25 hover:text-white border border-vl-cyan/40 shadow-xs"
                : "text-vl-white/70 hover:text-vl-white hover:bg-white/10"
            }`}
            title="View Parked Sales"
          >
            <PauseCircle className="h-3.5 w-3.5 text-vl-cyan" />
            <span className="font-heading font-black text-xs">Parked</span>
            {(parkedCount || 0) > 0 && (
              <Badge className="bg-vl-cyan text-vl-black font-black text-[10px] h-4.5 px-1.5 py-0 hover:bg-vl-cyan rounded-md">
                {parkedCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Today's Counter Orders / Invoices Button */}
        {onOpenOrdersModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenOrdersModal}
            className="text-vl-white/80 hover:text-vl-white hover:bg-white/10 text-xs h-9 px-3 rounded-xl space-x-1.5 transition-all"
            title="Today's Sales & Invoices [F5]"
          >
            <Receipt className="h-3.5 w-3.5 text-vl-cyan" />
            <span className="hidden md:inline font-heading font-black text-xs">Orders</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md text-vl-cyan font-mono hidden lg:inline">
              F5
            </span>
          </Button>
        )}

        {/* Live Drawer & Shift Status Button */}
        {onOpenShiftModal && (
          <div>
            {shift && shift.isOpen ? (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-2 bg-[#16171c] hover:bg-[#20222a] hover:border-emerald-500/50 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-emerald-400 transition-all shadow-2xs"
                title="Click to view Cash Drawer & Shift details"
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="font-bold">Drawer: ৳{shift.expectedCash.toFixed(0)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-2 bg-vl-cyan/15 hover:bg-vl-cyan/25 text-vl-cyan px-3.5 py-1.5 rounded-xl border border-vl-cyan/40 text-xs font-heading font-black transition-all animate-pulse shadow-[0_0_12px_rgba(0,217,255,0.25)]"
                title="Register Shift is Closed. Click to Open Register."
              >
                <Lock className="h-3.5 w-3.5 text-vl-cyan" />
                <span>Open Register</span>
              </button>
            )}
          </div>
        )}

        {/* Cashier Badge */}
        <div className="flex items-center space-x-2.5 bg-[#16171c] px-3.5 py-1.5 rounded-xl border border-white/10 shadow-2xs">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-vl-cyan/15 text-vl-cyan">
            <UserCheck className="h-3 w-3" />
          </div>
          <div className="text-left text-xs leading-none">
            <span className="font-heading font-black text-vl-white truncate max-w-[120px] inline-block">
              {cashierName}
            </span>
            <span className="text-[10px] text-vl-grey block font-mono capitalize">
              {cashierRole.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Fullscreen Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-vl-white/70 hover:text-vl-white hover:bg-white/10 h-9 w-9 rounded-xl transition-all"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
