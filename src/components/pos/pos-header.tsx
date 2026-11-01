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
    <header className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between shadow-md border-b border-slate-800 select-none">
      <div className="flex items-center space-x-3">
        <Link href="/admin">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800 -ml-1 h-9 px-2.5"
            title="Exit to Admin Dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline text-xs font-medium">Exit Admin</span>
          </Button>
        </Link>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 p-1.5 rounded-lg shadow-inner">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold tracking-tight text-base text-white">VIBELOCK</span>
              <Badge className="bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0 hover:bg-amber-400">
                POS
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              Outlet Counter 01
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Network Connectivity Status Indicator */}
        {isOnline === false ? (
          <div
            className="flex items-center space-x-1.5 bg-red-950/80 px-2.5 py-1 rounded-md border border-red-700/60 text-xs font-mono text-red-300 animate-pulse select-none"
            title="Counter is operating offline. Server checkout is locked."
          >
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
            <span className="font-bold text-[11px]">Offline</span>
          </div>
        ) : (
          <div
            className="hidden sm:flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 text-xs font-mono text-emerald-400 select-none"
            title="Counter is connected online."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-[11px]">Online</span>
          </div>
        )}

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700 text-slate-200 text-xs font-mono">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>{time || "00:00:00"}</span>
        </div>

        {/* In-Store Returns & Exchanges Quick Button */}
        {onOpenReturnModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenReturnModal}
            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 px-2.5 space-x-1.5"
            title="In-Store Returns & Exchanges [F3]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">Returns</span>
            <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400 font-mono hidden lg:inline">
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
            className={`text-xs h-8 px-2.5 space-x-1.5 transition-colors ${
              (parkedCount || 0) > 0
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 hover:text-white border border-amber-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="View Parked Sales"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>Parked</span>
            {(parkedCount || 0) > 0 && (
              <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] h-4 px-1 py-0 hover:bg-amber-500">
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
            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 px-2.5 space-x-1.5"
            title="Today's Sales & Invoices [F5]"
          >
            <Receipt className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">Orders</span>
            <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400 font-mono hidden lg:inline">
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
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md border border-slate-700 text-xs font-mono text-emerald-400 transition-colors"
                title="Click to view Cash Drawer & Shift details"
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="font-bold">Drawer: ৳{shift.expectedCash.toFixed(0)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-md border border-amber-500/40 text-xs font-bold transition-colors animate-pulse"
                title="Register Shift is Closed. Click to Open Register."
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Open Register</span>
              </button>
            )}
          </div>
        )}

        {/* Cashier Badge */}
        <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
          <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
          <div className="text-left text-xs leading-none">
            <span className="font-semibold text-slate-200 truncate max-w-[120px] inline-block">
              {cashierName}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono capitalize">
              {cashierRole.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Fullscreen Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8"
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
