"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

export const POS_SOUND_STORAGE_KEY = "vibelock_pos_scan_sound_muted";

function getSoundMutedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(POS_SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSoundMutedServerSnapshot(): boolean {
  return false;
}

function subscribeSoundMuted(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("vibelock-pos-sound-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vibelock-pos-sound-change", callback);
  };
}

/**
 * Reactive hook for managing POS hardware barcode scanner beep sound (muted / enabled).
 * Persists in localStorage and synchronizes across browser tabs/shifts without hydration mismatches.
 */
export function usePosSoundMuted(): {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
} {
  const isMuted = useSyncExternalStore(
    subscribeSoundMuted,
    getSoundMutedSnapshot,
    getSoundMutedServerSnapshot
  );

  const setMuted = (nextVal: boolean) => {
    try {
      localStorage.setItem(POS_SOUND_STORAGE_KEY, String(nextVal));
      window.dispatchEvent(new Event("vibelock-pos-sound-change"));
      if (nextVal) {
        toast.info("Scanner beep sound muted.", { duration: 2500 });
      } else {
        toast.success("Scanner beep sound enabled.", { duration: 2500 });
      }
    } catch {}
  };

  const toggleMute = () => {
    setMuted(!isMuted);
  };

  return { isMuted, toggleMute, setMuted };
}
