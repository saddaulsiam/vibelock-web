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
        aria-label="Search drops"
        className="group border-vl-white/15 bg-vl-white/10 text-vl-white/40 hover:border-vl-cyan/60 hover:bg-vl-white/15 relative hidden h-8 w-36 cursor-pointer items-center rounded-full border pr-3.5 pl-9 text-left text-xs transition-all lg:flex xl:w-48"
      >
        <Search
          className="text-vl-white/40 group-hover:text-vl-cyan pointer-events-none absolute left-3.5 size-3.5 transition-colors"
          aria-hidden="true"
        />
        <span className="truncate">Search drops...</span>
      </button>

      {/* Mobile Search Trigger Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        className="text-vl-white/75 hover:bg-vl-white/10 hover:text-vl-white flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors sm:size-9 lg:hidden"
      >
        <Search className="size-4 sm:size-4.5" />
      </button>

      {/* Shared Fullscreen Search Modal */}
      <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} categories={categories} />
    </>
  );
}
