"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MegaMenuSubCategory } from "./mega-menu-data";

interface CategoryMegaMenuProps {
  isOpen: boolean;
  categoryName: string;
  categorySlug: string;
  subCategories: MegaMenuSubCategory[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

/**
 * Computes smart dynamic column layout and card width based on subcategories count.
 * Prevents awkward empty gaps when there are fewer than 5 subcategories,
 * while cleanly wrapping when there are more than 5.
 */
function getMegaMenuLayout(count: number) {
  if (count <= 1) {
    return {
      wrapperWidth: "w-[260px]",
      gridClass: "grid-cols-1 gap-y-4",
      padding: "p-6",
    };
  }
  if (count === 2) {
    return {
      wrapperWidth: "w-[480px]",
      gridClass: "grid-cols-2 gap-x-8 gap-y-6",
      padding: "p-7",
    };
  }
  if (count === 3) {
    return {
      wrapperWidth: "w-[680px]",
      gridClass: "grid-cols-3 gap-x-8 gap-y-6",
      padding: "p-7 sm:p-8",
    };
  }
  if (count === 4) {
    return {
      wrapperWidth: "w-[860px]",
      gridClass: "grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6",
      padding: "p-7 sm:p-8",
    };
  }
  if (count === 6) {
    return {
      wrapperWidth: "w-[880px]",
      gridClass: "grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-7",
      padding: "p-7 sm:p-8",
    };
  }
  // 5, or 7+ subcategories
  return {
    wrapperWidth: "w-[min(94vw,980px)]",
    gridClass: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-7",
    padding: "p-7 sm:p-9",
  };
}

export function CategoryMegaMenu({
  isOpen,
  subCategories,
  onMouseEnter,
  onMouseLeave,
  onClose,
}: CategoryMegaMenuProps) {
  const layout = getMegaMenuLayout(subCategories.length);

  return (
    <AnimatePresence>
      {isOpen && subCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`pointer-events-auto absolute top-full left-1/2 z-50 mt-1 max-w-[94vw] -translate-x-1/2 pt-2 before:absolute before:inset-x-0 before:-top-4 before:h-4 ${layout.wrapperWidth}`}
        >
          {/* ── Main Mega Menu Card ── */}
          <div
            className={`relative overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_30px_70px_-15px_rgba(0,0,0,0.22),0_12px_28px_-6px_rgba(0,0,0,0.08)] ${layout.padding}`}
          >
            {/* Top Subtle Cyan Glow Ambient */}
            <div
              className="bg-vl-cyan/10 pointer-events-none absolute -top-16 left-1/2 h-32 w-80 -translate-x-1/2 rounded-full blur-2xl"
              aria-hidden="true"
            />

            {/* ── Dynamic Columns Grid ── */}
            <div className={`relative z-10 grid ${layout.gridClass}`}>
              {subCategories.map((sub) => (
                <div key={sub.id || sub.slug} className="flex flex-col">
                  {/* Sub-Category Header */}
                  <Link
                    href={`/category/${sub.slug}`}
                    onClick={onClose}
                    className="group/sub mb-2.5 flex items-center justify-between border-b border-black/8 pb-1.5 transition-colors"
                  >
                    <span className="text-vl-dark-900 group-hover/sub:text-vl-cyan font-heading text-xs font-black tracking-wider uppercase transition-colors">
                      {sub.name}
                    </span>
                    <ArrowRight className="text-vl-cyan size-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover/sub:translate-x-0 group-hover/sub:opacity-100" />
                  </Link>

                  {/* Child-Categories List */}
                  {sub.children && sub.children.length > 0 ? (
                    <ul className="space-y-1.5 pt-0.5">
                      {sub.children.map((child) => (
                        <li key={child.id || child.slug}>
                          <Link
                            href={`/category/${child.slug}`}
                            onClick={onClose}
                            className="hover:text-vl-dark-900 block py-0.5 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase transition-all duration-150 hover:translate-x-1"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link
                      href={`/category/${sub.slug}`}
                      onClick={onClose}
                      className="text-2xs group/link hover:text-vl-dark-900 inline-flex items-center gap-1 pt-1 font-semibold text-neutral-400 uppercase transition-colors"
                    >
                      <span>Explore collection</span>
                      <ArrowRight className="size-2.5 transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
