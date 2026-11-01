"use client";

import { useState, useRef } from "react";
import { Barcode, Loader2, Volume2, VolumeX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchPosProductByBarcodeOrSku } from "@/lib/pos/pos-queries";
import { usePosSoundMuted } from "@/lib/pos";
import type { PosProductSummary, PosProductVariant } from "@/lib/pos/pos-types";
import { toast } from "sonner";

interface PosProductScannerProps {
  onAddVariant: (variant: PosProductVariant, product: PosProductSummary) => void;
  scannerRef?: React.RefObject<HTMLInputElement | null>;
  catalogProducts?: PosProductSummary[];
}

export function findLocalVariant(
  term: string,
  catalogProducts?: PosProductSummary[]
): { matchedVariant: PosProductVariant; product: PosProductSummary } | null {
  if (!catalogProducts || catalogProducts.length === 0) return null;
  const normalized = term.trim().toLowerCase();

  for (const product of catalogProducts) {
    for (const variant of product.variants) {
      if (
        variant.sku.toLowerCase() === normalized ||
        (variant.barcode && variant.barcode.toLowerCase() === normalized)
      ) {
        return { matchedVariant: variant, product };
      }
    }
  }
  return null;
}

export function PosProductScanner({
  onAddVariant,
  scannerRef: externalRef,
  catalogProducts,
}: PosProductScannerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const internalRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef || internalRef;
  const { isMuted, toggleMute } = usePosSoundMuted();

  // Synthesize instant POS scanner beep sound using Web Audio API (no external asset needed)
  const playScanBeep = (isSuccess: boolean) => {
    if (isMuted) return; // Muted by cashier
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isSuccess ? "sine" : "sawtooth";
      osc.frequency.setValueAtTime(isSuccess ? 1200 : 300, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (isSuccess ? 0.08 : 0.2));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.08 : 0.2));
    } catch {
      // AudioContext might be blocked or unsupported; silent fallback is fine
    }
  };

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    if (!term || isSearching) return;

    // Check offline status
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    if (isOffline) {
      const localMatch = findLocalVariant(term, catalogProducts);
      if (localMatch) {
        const { matchedVariant, product } = localMatch;
        if (matchedVariant.availableStock <= 0) {
          playScanBeep(false);
          toast.error(`Out of stock: ${matchedVariant.sku} (${product.name})`);
        } else {
          playScanBeep(true);
          onAddVariant(matchedVariant, product);
          toast.success(`[Offline Scan] ${matchedVariant.sku} - ৳${matchedVariant.effectivePrice}`);
          setSearchTerm("");
        }
      } else {
        playScanBeep(false);
        toast.warning(`[Offline Mode] No local item found for SKU/barcode: "${term}"`);
      }
      inputRef.current?.focus();
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchPosProductByBarcodeOrSku(term);
      if (result) {
        const { matchedVariant, product } = result;
        if (matchedVariant.availableStock <= 0) {
          playScanBeep(false);
          toast.error(`Out of stock: ${matchedVariant.sku} (${product.name})`);
        } else {
          playScanBeep(true);
          onAddVariant(matchedVariant, product);
          toast.success(`Scanned: ${matchedVariant.sku} - ৳${matchedVariant.effectivePrice}`);
          setSearchTerm("");
        }
      } else {
        playScanBeep(false);
        toast.warning(`No product found for barcode/SKU: "${term}"`);
      }
    } catch {
      // Sudden network loss fallback: check in-memory local catalog
      const localMatch = findLocalVariant(term, catalogProducts);
      if (localMatch) {
        const { matchedVariant, product } = localMatch;
        if (matchedVariant.availableStock <= 0) {
          playScanBeep(false);
          toast.error(`Out of stock: ${matchedVariant.sku} (${product.name})`);
        } else {
          playScanBeep(true);
          onAddVariant(matchedVariant, product);
          toast.success(
            `[Offline Fallback] ${matchedVariant.sku} - ৳${matchedVariant.effectivePrice}`
          );
          setSearchTerm("");
        }
      } else {
        playScanBeep(false);
        toast.error("Network error scanning item. Please verify connection.");
      }
    } finally {
      setIsSearching(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleScanSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
          <Barcode className="mr-1.5 h-5 w-5 text-vl-cyan" />
          <span className="hidden font-mono text-[11px] font-semibold text-slate-400 sm:inline">
            SCAN SKU:
          </span>
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Scan barcode or type SKU (e.g. VL-TEE-BLK-M) and hit Enter [F2]"
          className="h-12 rounded-lg border-2 border-[#d6d2c4] bg-white pr-28 pl-28 font-mono text-sm tracking-wide text-vl-black shadow-2xs focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/25 sm:pr-32 sm:pl-32"
          autoComplete="off"
          autoFocus
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {/* Mute / Unmute Scan Beep Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={`h-8 w-8 rounded-md transition-colors ${
              isMuted
                ? "text-vl-grey hover:bg-black/5 hover:text-vl-black"
                : "text-vl-cyan hover:bg-vl-cyan/10 hover:text-vl-cyan"
            }`}
            title={
              isMuted
                ? "Scan beep is muted. Click to enable sound."
                : "Scan beep is enabled. Click to mute."
            }
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setSearchTerm("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="h-8 rounded-md bg-vl-black px-4 text-xs font-bold text-vl-white hover:bg-black hover:text-vl-cyan transition-colors"
          >
            {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-vl-cyan" /> : "Scan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
