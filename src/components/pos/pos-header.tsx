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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PosHeaderProps {
  cashierName: string;
  cashierRole: string;
}

export function PosHeader({ cashierName, cashierRole }: PosHeaderProps) {
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
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700 text-slate-200 text-xs font-mono">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>{time || "00:00:00"}</span>
        </div>

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
