"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useSyncExternalStore, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  subscribeWishlist,
} from "@/lib/wishlist";

export function HeaderWishlist() {
  const rawWishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const wishlistCount = useMemo(() => {
    try {
      const parsed = JSON.parse(rawWishlist);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [rawWishlist]);

  return (
    <Link
      href="/wishlist"
      aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : "Wishlist"}
      className="hover:text-vl-cyan text-vl-white/75 hover:bg-vl-white/10 focus-visible:ring-vl-cyan relative inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Heart className="size-4 sm:size-4.5" aria-hidden="true" />
      <AnimatePresence>
        {wishlistCount > 0 && (
          <motion.span
            key={wishlistCount}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [1, 1.3, 0.95, 1], opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-vl-cyan text-vl-black absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black shadow-[0_0_8px_rgba(0,217,255,0.7)]"
          >
            {wishlistCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
