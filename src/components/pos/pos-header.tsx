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
  ShoppingCart,
  Banknote,
  Lock,
  RotateCcw,
  PauseCircle,
  Receipt,
  WifiOff,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  cartItemCount?: number;
  onToggleCartMobile?: () => void;
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
  cartItemCount,
  onToggleCartMobile,
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
    <header className="bg-vl-black text-vl-white px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-md border-b border-white/10 select-none">
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        <Link href="/admin">
          <Button
            variant="ghost"
            size="sm"
            className="text-vl-white/70 hover:text-vl-white hover:bg-white/10 -ml-1 h-8 sm:h-9 px-1.5 sm:px-3 rounded-xl transition-all"
            title="Exit to Admin Dashboard"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline text-xs font-heading font-black tracking-wider">Exit Admin</span>
          </Button>
        </Link>

        <div className="h-4 w-px bg-white/15 hidden sm:block shrink-0" />

        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-vl-cyan text-vl-black shadow-[0_0_16px_rgba(0,217,255,0.4)]">
            <ShoppingBag className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="font-heading font-black tracking-wider text-xs sm:text-base text-vl-white">
                VIBELOCK
              </span>
              <Badge className="bg-vl-cyan text-vl-black text-[9px] sm:text-[10px] font-heading font-black px-1 sm:px-1.5 py-0 hover:bg-vl-cyan shadow-xs rounded shrink-0">
                POS
              </Badge>
            </div>
            <p className="text-[10px] text-vl-grey tracking-widest uppercase font-semibold hidden sm:block">
              Outlet Counter 01
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 shrink-0">
        {/* Mobile / Tablet Current Sale Ticket Trigger (< lg) */}
        {onToggleCartMobile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleCartMobile}
            className="relative lg:hidden flex h-8 items-center space-x-1.5 rounded-xl bg-vl-cyan text-vl-black px-2 sm:px-2.5 hover:bg-[#2ae0ff] shadow-xs active:scale-95"
            title="View Current Sale Ticket"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="font-heading font-black text-xs">{cartItemCount || 0}</span>
          </Button>
        )}

        {/* Compact Parked Badge for Mobile / Tablet (< lg, only when carts held) */}
        {onOpenParkedModal && (parkedCount || 0) > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenParkedModal}
            className="lg:hidden flex h-8 items-center space-x-1 rounded-xl bg-vl-cyan/15 text-vl-cyan px-2 hover:bg-vl-cyan/25 border border-vl-cyan/40 shadow-xs"
            title="View Parked Sales"
          >
            <PauseCircle className="h-3.5 w-3.5 text-vl-cyan" />
            <Badge className="bg-vl-cyan text-vl-black font-black text-[9px] h-4 px-1 py-0 hover:bg-vl-cyan rounded">
              {parkedCount}
            </Badge>
          </Button>
        )}

        {/* Live Drawer & Shift Status Button (Visible across all screens) */}
        {onOpenShiftModal && (
          <div>
            {shift && shift.isOpen ? (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-1 sm:space-x-1.5 bg-[#16171c] hover:bg-[#20222a] hover:border-emerald-500/50 px-2 sm:px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-emerald-400 transition-all shadow-2xs"
                title="Click to view Cash Drawer & Shift details"
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="font-bold hidden sm:inline">Drawer: ৳{shift.expectedCash.toFixed(0)}</span>
                <span className="font-bold sm:hidden">৳{shift.expectedCash.toFixed(0)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-1 sm:space-x-1.5 bg-vl-cyan/15 hover:bg-vl-cyan/25 text-vl-cyan px-2 sm:px-3 py-1.5 rounded-xl border border-vl-cyan/40 text-xs font-heading font-black transition-all animate-pulse shadow-[0_0_12px_rgba(0,217,255,0.25)]"
                title="Register Shift is Closed. Click to Open Register."
              >
                <Lock className="h-3.5 w-3.5 text-vl-cyan" />
                <span className="hidden sm:inline">Open Register</span>
                <span className="sm:hidden text-[11px]">Open</span>
              </button>
            )}
          </div>
        )}

        {/* Network Connectivity Status Indicator (Offline visible everywhere; Online on lg+) */}
        {isOnline === false ? (
          <div
            className="flex items-center space-x-1.5 bg-red-950/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-red-700/60 text-xs font-mono text-red-300 animate-pulse select-none shadow-2xs"
            title="Counter is operating offline. Server checkout is locked."
          >
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
            <span className="font-bold text-[10px] sm:text-[11px] tracking-wide">Offline</span>
          </div>
        ) : (
          <div
            className="hidden lg:flex items-center space-x-1.5 xl:space-x-2 bg-[#16171c] px-2.5 xl:px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-vl-cyan select-none shadow-2xs"
            title="Counter is connected online."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vl-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-vl-cyan" />
            </span>
            <span className="font-bold text-[11px] tracking-wide hidden xl:inline">Online</span>
          </div>
        )}

        {/* Real-time Clock (Desktop xl+) */}
        <div className="hidden xl:flex items-center space-x-2 bg-[#16171c] px-3 py-1.5 rounded-xl border border-white/10 text-vl-white text-xs font-mono shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-vl-cyan" />
          <span className="font-semibold tracking-wider">{time || "00:00:00"}</span>
        </div>

        {/* In-Store Returns & Exchanges Quick Button (Desktop lg+) */}
        {onOpenReturnModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenReturnModal}
            className="hidden lg:inline-flex text-vl-white/80 hover:text-vl-white hover:bg-white/10 text-xs h-9 px-2.5 xl:px-3 rounded-xl space-x-1.5 transition-all"
            title="In-Store Returns & Exchanges [F3]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-vl-cyan" />
            <span className="font-heading font-black text-xs">Returns</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md text-vl-cyan font-mono hidden xl:inline">
              F3
            </span>
          </Button>
        )}

        {/* Parked Sales / Held Carts Quick Button (Desktop lg+) */}
        {onOpenParkedModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenParkedModal}
            className={`hidden lg:inline-flex text-xs h-9 px-2.5 xl:px-3 rounded-xl space-x-1.5 transition-all ${
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

        {/* Today's Counter Orders / Invoices Button (Desktop lg+) */}
        {onOpenOrdersModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenOrdersModal}
            className="hidden lg:inline-flex text-vl-white/80 hover:text-vl-white hover:bg-white/10 text-xs h-9 px-2.5 xl:px-3 rounded-xl space-x-1.5 transition-all"
            title="Today's Sales & Invoices [F5]"
          >
            <Receipt className="h-3.5 w-3.5 text-vl-cyan" />
            <span className="font-heading font-black text-xs">Orders</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md text-vl-cyan font-mono hidden xl:inline">
              F5
            </span>
          </Button>
        )}

        {/* Cashier Badge (Desktop lg+) */}
        <div className="hidden lg:flex items-center space-x-2 bg-[#16171c] px-2.5 xl:px-3 py-1.5 rounded-xl border border-white/10 shadow-2xs">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-vl-cyan/15 text-vl-cyan">
            <UserCheck className="h-3 w-3" />
          </div>
          <div className="text-left text-xs leading-none">
            <span className="font-heading font-black text-vl-white truncate max-w-[90px] xl:max-w-[120px] inline-block">
              {cashierName}
            </span>
            <span className="text-[10px] text-vl-grey hidden xl:block font-mono capitalize">
              {cashierRole.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Fullscreen Button (Desktop lg+) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="hidden lg:inline-flex text-vl-white/70 hover:text-vl-white hover:bg-white/10 h-9 w-9 rounded-xl transition-all"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile & Tablet More Actions Dropdown Menu (< lg) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xl text-vl-white/80 hover:bg-white/10 hover:text-white transition-all outline-none"
            title="More POS Actions"
            aria-label="More POS Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border border-white/20 bg-[#16171c] text-white p-1.5 shadow-2xl">
            {/* Cashier Info Chip */}
            <div className="flex items-center space-x-2.5 px-2 py-2 border-b border-white/10 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vl-cyan/20 text-vl-cyan">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div className="text-left text-xs leading-tight min-w-0">
                <span className="font-heading font-black text-white truncate block">
                  {cashierName}
                </span>
                <span className="text-[10px] text-vl-grey block font-mono capitalize">
                  {cashierRole.toLowerCase()}
                </span>
              </div>
            </div>

            {/* Cash Drawer & Shift Details */}
            {onOpenShiftModal && (
              <DropdownMenuItem
                onClick={onOpenShiftModal}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-heading font-bold text-slate-200 hover:text-vl-cyan hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {shift && shift.isOpen
                    ? `Drawer (৳${shift.expectedCash.toFixed(0)})`
                    : "Open Register Shift"}
                </span>
                <span className="ml-auto font-mono text-[10px] text-emerald-400">
                  {shift && shift.isOpen ? "OPEN" : "CLOSED"}
                </span>
              </DropdownMenuItem>
            )}

            {onOpenReturnModal && (
              <DropdownMenuItem
                onClick={onOpenReturnModal}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-heading font-bold text-slate-200 hover:text-vl-cyan hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-vl-cyan" />
                <span>In-Store Returns</span>
                <span className="ml-auto font-mono text-[10px] text-vl-grey">[F3]</span>
              </DropdownMenuItem>
            )}

            {onOpenParkedModal && (
              <DropdownMenuItem
                onClick={onOpenParkedModal}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-heading font-bold text-slate-200 hover:text-vl-cyan hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <PauseCircle className="h-3.5 w-3.5 text-vl-cyan" />
                <span>Parked Sales</span>
                {(parkedCount || 0) > 0 && (
                  <Badge className="ml-auto bg-vl-cyan text-vl-black font-black text-[10px] h-4.5 px-1.5 py-0">
                    {parkedCount}
                  </Badge>
                )}
              </DropdownMenuItem>
            )}

            {onOpenOrdersModal && (
              <DropdownMenuItem
                onClick={onOpenOrdersModal}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-heading font-bold text-slate-200 hover:text-vl-cyan hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5 text-vl-cyan" />
                <span>Today&apos;s Orders</span>
                <span className="ml-auto font-mono text-[10px] text-vl-grey">[F5]</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-heading font-bold text-slate-200 hover:text-vl-cyan hover:bg-white/10 rounded-lg cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
