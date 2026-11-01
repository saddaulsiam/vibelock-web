"use client";

import { useSyncExternalStore, useEffect, useRef } from "react";
import { toast } from "sonner";

function getOnlineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

function subscribeOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Real-time reactive hook tracking browser internet connectivity for in-store POS.
 * Uses useSyncExternalStore to eliminate SSR hydration mismatches and cascading effect renders.
 * Automatically triggers counter toasts on connection drops and recoveries.
 */
export function usePosOnlineStatus(): boolean {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const prevStatusRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevStatusRef.current === null) {
      prevStatusRef.current = isOnline;
      return;
    }

    if (!isOnline && prevStatusRef.current === true) {
      toast.error(
        "Internet connection lost! Counter is operating in offline mode. Local barcode scanning & cart hold remain available.",
        { duration: 8000 }
      );
    } else if (isOnline && prevStatusRef.current === false) {
      toast.success(
        "Internet connection restored! Counter is back online. Transactions can now be settled.",
        { duration: 5000 }
      );
    }

    prevStatusRef.current = isOnline;
  }, [isOnline]);

  return isOnline;
}

