"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { SearchModal } from "./search-modal";
import type { CategorySummary } from "@/lib/catalog/types";

interface HeaderSearchProps {
  categories?: CategorySummary[];
}

export function HeaderSearch({ categories = [] }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Desktop Search Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search drops (Press Ctrl+K or Cmd+K to search)"
        className="group border-vl-white/10 bg-vl-white/5 text-vl-white/60 hover:border-vl-cyan/40 hover:bg-vl-white/10 relative hidden h-8.5 w-40 cursor-pointer items-center justify-between rounded-full border pr-2 pl-8.5 text-left text-xs transition-all lg:flex xl:w-48"
      >
        <Search
          className="text-vl-white/50 group-hover:text-vl-cyan pointer-events-none absolute left-3 size-3.5 transition-colors"
          aria-hidden="true"
        />
        <span className="text-vl-white/60 group-hover:text-vl-white/85 truncate text-xs transition-colors">
          Search drops...
        </span>
        <kbd className="border-vl-white/15 bg-vl-white/10 text-vl-white/50 group-hover:border-vl-cyan/30 group-hover:text-vl-cyan inline-flex h-4.5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium transition-colors">
          ⌘K
        </kbd>
      </button>

      {/* Mobile Search Trigger Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        className="hover:text-vl-cyan hover:bg-vl-white/10 text-vl-white/75 focus-visible:ring-vl-cyan inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        <Search className="size-4 sm:size-4.5" />
      </button>

      {/* Shared Fullscreen Search Modal */}
      <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} categories={categories} />
    </>
  );
}
