"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, ExternalLink, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface OrderNotificationItem {
  id: string;
  orderNumber: string;
  total: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  city: string;
  itemCount: number;
  createdAt: string;
}

const STORAGE_KEY_LAST_SEEN = "vibelock_admin_last_seen_order_ts";
const STORAGE_KEY_SOUND = "vibelock_admin_notification_sound_enabled";

/**
 * Gentle 2-tone melodic chime via Web Audio API (zero external asset requests)
 */
function playOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: F#5 (739.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(739.99, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: C#6 (1108.73 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1108.73, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Gracefully handle browser autoplay blocks before user interaction
  }
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function AdminNotificationBell() {
  const [orders, setOrders] = useState<OrderNotificationItem[]>([]);
  const [lastSeenTs, setLastSeenTs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_SEEN);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SOUND);
      return stored !== "false";
    } catch {
      return true;
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/orders", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      const incomingOrders: OrderNotificationItem[] = data.orders;
      setOrders(incomingOrders);

      // Detect if there are genuinely new orders that arrived while active
      if (initialFetchDoneRef.current && incomingOrders.length > 0) {
        const hasBrandNew = incomingOrders.some(
          (o) => !knownOrderIdsRef.current.has(o.id) && new Date(o.createdAt).getTime() > lastSeenTs
        );
        if (hasBrandNew && soundEnabled) {
          playOrderChime();
        }
      }

      // Record known IDs
      const newIds = new Set<string>();
      incomingOrders.forEach((o) => newIds.add(o.id));
      knownOrderIdsRef.current = newIds;
      initialFetchDoneRef.current = true;
    } catch (error) {
      console.warn("[AdminNotificationBell] Polling error:", error);
    }
  }, [lastSeenTs, soundEnabled]);

  // Periodic Smart Polling (30s interval, pauses when tab is hidden)
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOrders();
    }, 0);

    const interval = setInterval(() => {
      if (!document.hidden) {
        void fetchOrders();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void fetchOrders();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchOrders]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, String(nextState));
    } catch {}
    if (nextState) {
      playOrderChime();
    }
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    setLastSeenTs(now);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SEEN, String(now));
    } catch {}
  };

  const unreadCount = orders.filter((o) => new Date(o.createdAt).getTime() > lastSeenTs).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative flex size-9 items-center justify-center rounded-xl transition-colors outline-none",
          "border-vl-dark-900/10 hover:bg-vl-dark-50 text-vl-dark-900 border bg-white",
          isOpen && "bg-vl-dark-50 border-vl-dark-900/20"
        )}
        title="Admin Notifications"
        aria-label={`Admin notifications, ${unreadCount} unread`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-vl-cyan text-vl-dark-900 absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-black shadow-2xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-vl-dark-900/10 text-vl-dark-900 w-80 rounded-xl border bg-white p-0 shadow-xl sm:w-96"
      >
        {/* Header */}
        <div className="border-vl-dark-900/10 flex items-center justify-between border-b px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xs font-black tracking-wider uppercase">
              Notifications
            </span>
            {unreadCount > 0 ? (
              <Badge variant="cyan" className="h-4 px-1.5 font-mono text-[9px] font-bold">
                {unreadCount} NEW
              </Badge>
            ) : (
              <Badge variant="outline" className="text-vl-dark-400 h-4 px-1.5 font-mono text-[9px]">
                UPDATED
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-vl-dark-400 hover:text-vl-dark-900 size-7"
              onClick={toggleSound}
              title={soundEnabled ? "Mute notification sound" : "Unmute notification sound"}
              aria-label={soundEnabled ? "Mute notification sound" : "Unmute notification sound"}
            >
              {soundEnabled ? (
                <Volume2 className="size-3.5" />
              ) : (
                <VolumeX className="size-3.5 text-red-500" />
              )}
            </Button>

            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-vl-dark-400 hover:text-vl-cyan-700 h-7 px-2 text-[11px] font-semibold"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="mr-1 size-3.5" />
                <span>Mark read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Order List */}
        <div className="divide-vl-dark-900/5 max-h-80 divide-y overflow-y-auto">
          {orders.length === 0 ? (
            <div className="p-6 text-center">
              <ShoppingBag className="text-vl-dark-300 mx-auto size-7 stroke-1" />
              <p className="text-vl-dark-500 mt-2 text-xs font-medium">
                No recent orders in last 48 hours
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isUnread = new Date(order.createdAt).getTime() > lastSeenTs;
              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "hover:bg-vl-dark-50/80 block p-3 text-left transition-colors",
                    isUnread && "bg-vl-cyan-50/60 border-vl-cyan border-l-2"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-vl-dark-900 font-mono text-xs font-bold">
                          #{order.orderNumber}
                        </span>
                        {order.paymentMethod === "COD" ? (
                          <Badge
                            variant="outline"
                            className="h-3.5 px-1 font-mono text-[8px] font-bold"
                          >
                            COD
                          </Badge>
                        ) : (
                          <Badge
                            variant="cyan"
                            className="h-3.5 px-1 font-mono text-[8px] font-bold"
                          >
                            PAID
                          </Badge>
                        )}
                      </div>
                      <p className="text-vl-dark-500 mt-0.5 truncate text-[11px] font-medium">
                        {order.customerName} &bull; {order.city}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-vl-dark-900 font-mono text-xs font-bold">
                        ৳{Number(order.total).toLocaleString("en-BD")}
                      </span>
                      <p className="text-vl-dark-400 mt-0.5 text-[10px]">
                        {formatRelativeTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-vl-dark-900/10 bg-vl-dark-50/50 border-t p-2 text-center">
          <Link
            href="/admin/orders"
            onClick={() => setIsOpen(false)}
            className="text-vl-dark-500 hover:text-vl-dark-900 inline-flex items-center gap-1 text-[11px] font-bold"
          >
            <span>View All Orders in Dashboard</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
