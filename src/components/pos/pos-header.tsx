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
    <header className="bg-vl-black text-vl-white flex items-center justify-between border-b border-white/10 px-2.5 py-2 shadow-md select-none sm:px-4 sm:py-2.5">
      <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-3">
        <Link href="/admin">
          <Button
            variant="ghost"
            size="sm"
            className="text-vl-white/70 hover:text-vl-white -ml-1 h-8 rounded-xl px-1.5 transition-all hover:bg-white/10 sm:h-9 sm:px-3"
            title="Exit to Admin Dashboard"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 sm:mr-1.5" />
            <span className="font-heading hidden text-xs font-black tracking-wider sm:inline">
              Exit Admin
            </span>
          </Button>
        </Link>

        <div className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" />

        <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-2.5">
          <div className="bg-vl-cyan text-vl-black flex h-7 w-7 shrink-0 items-center justify-center rounded-xl shadow-[0_0_16px_rgba(0,217,255,0.4)] sm:h-9 sm:w-9">
            <ShoppingBag className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="font-heading text-vl-white text-xs font-black tracking-wider sm:text-base">
                VIBELOCK
              </span>
              <Badge className="bg-vl-cyan text-vl-black font-heading hover:bg-vl-cyan shrink-0 rounded px-1 py-0 text-[9px] font-black shadow-xs sm:px-1.5 sm:text-[10px]">
                POS
              </Badge>
            </div>
            <p className="text-vl-grey hidden text-[10px] font-semibold tracking-widest uppercase sm:block">
              Outlet Counter 01
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5">
        {/* Mobile / Tablet Current Sale Ticket Trigger (< lg) */}
        {onToggleCartMobile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleCartMobile}
            className="bg-vl-cyan text-vl-black relative flex h-8 items-center space-x-1.5 rounded-xl px-2 shadow-xs hover:bg-[#2ae0ff] active:scale-95 sm:px-2.5 lg:hidden"
            title="View Current Sale Ticket"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="font-heading text-xs font-black">{cartItemCount || 0}</span>
          </Button>
        )}

        {/* Compact Parked Badge for Mobile / Tablet (< lg, only when carts held) */}
        {onOpenParkedModal && (parkedCount || 0) > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenParkedModal}
            className="bg-vl-cyan/15 text-vl-cyan hover:bg-vl-cyan/25 border-vl-cyan/40 flex h-8 items-center space-x-1 rounded-xl border px-2 shadow-xs lg:hidden"
            title="View Parked Sales"
          >
            <PauseCircle className="text-vl-cyan h-3.5 w-3.5" />
            <Badge className="bg-vl-cyan text-vl-black hover:bg-vl-cyan h-4 rounded px-1 py-0 text-[9px] font-black">
              {parkedCount}
            </Badge>
          </Button>
        )}

        {/* Network Connectivity Status Indicator (Offline visible everywhere; Online on lg+) */}
        {isOnline === false ? (
          <div
            className="flex animate-pulse items-center space-x-1.5 rounded-xl border border-red-700/60 bg-red-950/80 px-2 py-1 font-mono text-xs text-red-300 shadow-2xs select-none sm:px-2.5 sm:py-1.5"
            title="Counter is operating offline. Server checkout is locked."
          >
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold tracking-wide sm:text-[11px]">Offline</span>
          </div>
        ) : (
          <div
            className="text-vl-cyan hidden items-center space-x-1.5 rounded-xl border border-white/10 bg-[#16171c] px-2.5 py-1.5 font-mono text-xs shadow-2xs select-none lg:flex xl:space-x-2 xl:px-3"
            title="Counter is connected online."
          >
            <span className="relative flex h-2 w-2">
              <span className="bg-vl-cyan absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-vl-cyan relative inline-flex h-2 w-2 rounded-full" />
            </span>
            <span className="hidden text-[11px] font-bold tracking-wide xl:inline">Online</span>
          </div>
        )}

        {/* Real-time Clock (Desktop xl+) */}
        <div className="text-vl-white hidden items-center space-x-2 rounded-xl border border-white/10 bg-[#16171c] px-3 py-1.5 font-mono text-xs shadow-2xs xl:flex">
          <Clock className="text-vl-cyan h-3.5 w-3.5" />
          <span className="font-semibold tracking-wider">{time || "00:00:00"}</span>
        </div>

        {/* In-Store Returns & Exchanges Quick Button (Desktop lg+) */}
        {onOpenReturnModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenReturnModal}
            className="text-vl-white/80 hover:text-vl-white hidden h-9 space-x-1.5 rounded-xl px-2.5 text-xs transition-all hover:bg-white/10 lg:inline-flex xl:px-3"
            title="In-Store Returns & Exchanges [F3]"
          >
            <RotateCcw className="text-vl-cyan h-3.5 w-3.5" />
            <span className="font-heading text-xs font-black">Returns</span>
            <span className="text-vl-cyan hidden rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] xl:inline">
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
            className={`hidden h-9 space-x-1.5 rounded-xl px-2.5 text-xs transition-all lg:inline-flex xl:px-3 ${
              (parkedCount || 0) > 0
                ? "bg-vl-cyan/15 text-vl-cyan hover:bg-vl-cyan/25 border-vl-cyan/40 border shadow-xs hover:text-white"
                : "text-vl-white/70 hover:text-vl-white hover:bg-white/10"
            }`}
            title="View Parked Sales"
          >
            <PauseCircle className="text-vl-cyan h-3.5 w-3.5" />
            <span className="font-heading text-xs font-black">Parked</span>
            {(parkedCount || 0) > 0 && (
              <Badge className="bg-vl-cyan text-vl-black hover:bg-vl-cyan h-4.5 rounded-md px-1.5 py-0 text-[10px] font-black">
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
            className="text-vl-white/80 hover:text-vl-white hidden h-9 space-x-1.5 rounded-xl px-2.5 text-xs transition-all hover:bg-white/10 lg:inline-flex xl:px-3"
            title="Today's Sales & Invoices [F5]"
          >
            <Receipt className="text-vl-cyan h-3.5 w-3.5" />
            <span className="font-heading text-xs font-black">Orders</span>
            <span className="text-vl-cyan hidden rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] xl:inline">
              F5
            </span>
          </Button>
        )}

        {/* Live Drawer & Shift Status Button (Visible across all screens) */}
        {onOpenShiftModal && (
          <div>
            {shift && shift.isOpen ? (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center space-x-1 rounded-xl border border-white/10 bg-[#16171c] px-2 py-1.5 font-mono text-xs text-emerald-400 shadow-2xs transition-all hover:border-emerald-500/50 hover:bg-[#20222a] sm:space-x-1.5 sm:px-3"
                title="Click to view Cash Drawer & Shift details"
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="hidden font-bold sm:inline">
                  Drawer: ৳{shift.expectedCash.toFixed(0)}
                </span>
                <span className="font-bold sm:hidden">৳{shift.expectedCash.toFixed(0)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="bg-vl-cyan/15 hover:bg-vl-cyan/25 text-vl-cyan border-vl-cyan/40 font-heading flex animate-pulse items-center space-x-1 rounded-xl border px-2 py-1.5 text-xs font-black shadow-[0_0_12px_rgba(0,217,255,0.25)] transition-all sm:space-x-1.5 sm:px-3"
                title="Register Shift is Closed. Click to Open Register."
              >
                <Lock className="text-vl-cyan h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Register</span>
                <span className="text-[11px] sm:hidden">Open</span>
              </button>
            )}
          </div>
        )}

        {/* Cashier Badge (Desktop lg+) */}
        <div className="hidden items-center space-x-2 rounded-xl border border-white/10 bg-[#16171c] px-2.5 py-1.5 shadow-2xs lg:flex xl:px-3">
          <div className="bg-vl-cyan/15 text-vl-cyan flex h-5 w-5 items-center justify-center rounded-full">
            <UserCheck className="h-3 w-3" />
          </div>
          <div className="text-left text-xs leading-none">
            <span className="font-heading text-vl-white inline-block max-w-[90px] truncate font-black xl:max-w-[120px]">
              {cashierName}
            </span>
            <span className="text-vl-grey hidden font-mono text-[10px] capitalize xl:block">
              {cashierRole.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Fullscreen Button (Desktop lg+) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-vl-white/70 hover:text-vl-white hidden h-9 w-9 rounded-xl transition-all hover:bg-white/10 lg:inline-flex"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {/* Mobile & Tablet More Actions Dropdown Menu (< lg) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-vl-white/80 flex h-8 w-8 items-center justify-center rounded-xl transition-all outline-none hover:bg-white/10 hover:text-white lg:hidden"
            title="More POS Actions"
            aria-label="More POS Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border border-white/20 bg-[#16171c] p-1.5 text-white shadow-2xl"
          >
            {/* Cashier Info Chip */}
            <div className="mb-1 flex items-center space-x-2.5 border-b border-white/10 px-2 py-2">
              <div className="bg-vl-cyan/20 text-vl-cyan flex h-7 w-7 items-center justify-center rounded-full">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 text-left text-xs leading-tight">
                <span className="font-heading block truncate font-black text-white">
                  {cashierName}
                </span>
                <span className="text-vl-grey block font-mono text-[10px] capitalize">
                  {cashierRole.toLowerCase()}
                </span>
              </div>
            </div>

            {/* Cash Drawer & Shift Details */}
            {onOpenShiftModal && (
              <DropdownMenuItem
                onClick={onOpenShiftModal}
                className="font-heading hover:text-vl-cyan flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
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
                className="font-heading hover:text-vl-cyan flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                <RotateCcw className="text-vl-cyan h-3.5 w-3.5" />
                <span>In-Store Returns</span>
                <span className="text-vl-grey ml-auto font-mono text-[10px]">[F3]</span>
              </DropdownMenuItem>
            )}

            {onOpenParkedModal && (
              <DropdownMenuItem
                onClick={onOpenParkedModal}
                className="font-heading hover:text-vl-cyan flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                <PauseCircle className="text-vl-cyan h-3.5 w-3.5" />
                <span>Parked Sales</span>
                {(parkedCount || 0) > 0 && (
                  <Badge className="bg-vl-cyan text-vl-black ml-auto h-4.5 px-1.5 py-0 text-[10px] font-black">
                    {parkedCount}
                  </Badge>
                )}
              </DropdownMenuItem>
            )}

            {onOpenOrdersModal && (
              <DropdownMenuItem
                onClick={onOpenOrdersModal}
                className="font-heading hover:text-vl-cyan flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                <Receipt className="text-vl-cyan h-3.5 w-3.5" />
                <span>Today&apos;s Orders</span>
                <span className="text-vl-grey ml-auto font-mono text-[10px]">[F5]</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1 bg-white/10" />

            <DropdownMenuItem
              onClick={toggleFullscreen}
              className="font-heading hover:text-vl-cyan flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
