"use client";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { Button } from "@/components/ui/button";
import type { CategorySummary, ProductSummary } from "@/lib/catalog/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

interface HomeAllProductsProps {
  products?: ProductSummary[];
  bestSellers?: ProductSummary[];
  categories?: CategorySummary[];
}

export function HomeAllProducts({ products, bestSellers, categories = [] }: HomeAllProductsProps) {
  const allProducts = React.useMemo(() => products ?? bestSellers ?? [], [products, bestSellers]);
  const [activeTab, setActiveTab] = React.useState<string>("all");

  // Derive filter tabs: "ALL" first, then available category names/slugs
  const tabs = React.useMemo(() => {
    const list: { slug: string; label: string }[] = [{ slug: "all", label: "ALL" }];

    // If categories are passed in, sort by Priority starting from 1 (1, 2, 3...)
    const categorySource =
      categories.length > 0
        ? [...categories].sort((a, b) => {
            const orderA = a.sortOrder && a.sortOrder >= 1 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const orderB = b.sortOrder && b.sortOrder >= 1 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          })
        : Array.from(
            new Map(allProducts.flatMap((p) => p.categories || []).map((c) => [c.slug, c])).values()
          );

    categorySource.forEach((cat) => {
      const cleanName = cat.name
        .replace(/^\d+[.\s-]+/, "")
        .trim()
        .toUpperCase();
      if (!list.some((t) => t.slug === cat.slug)) {
        list.push({ slug: cat.slug, label: cleanName });
      }
    });

    return list;
  }, [categories, allProducts]);

  // Filter products by selected tab, capping at 8 for the 4x2 grid
  const displayedProducts = React.useMemo(() => {
    if (activeTab === "all") {
      return allProducts.slice(0, 50);
    }

    const tabSlug = activeTab.toLowerCase();
    const filtered = allProducts.filter((product) => {
      const hasCatMatch = product.categories?.some(
        (c) =>
          c.slug.toLowerCase() === tabSlug ||
          c.name.toLowerCase().includes(tabSlug) ||
          tabSlug.includes(c.slug.toLowerCase())
      );
      if (hasCatMatch) return true;

      // Fallback matching against product name or slug
      return (
        product.name.toLowerCase().includes(tabSlug) || product.slug.toLowerCase().includes(tabSlug)
      );
    });

    return filtered.slice(0, 8);
  }, [allProducts, activeTab]);

  const activeTabLabel = tabs.find((t) => t.slug === activeTab)?.label ?? "Category";

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Smooth wheel RAF accumulator
  const targetScrollLeft = React.useRef(0);
  const wheelRafId = React.useRef<number | null>(null);

  // Mouse drag & momentum variables
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartX = React.useRef(0);
  const dragScrollLeft = React.useRef(0);
  const hasDragged = React.useRef(false);
  const lastDragTime = React.useRef(0);
  const lastDragX = React.useRef(0);
  const dragVelocity = React.useRef(0);
  const inertiaRafId = React.useRef<number | null>(null);

  const stopAllAnimations = React.useCallback(() => {
    if (wheelRafId.current !== null) {
      cancelAnimationFrame(wheelRafId.current);
      wheelRafId.current = null;
    }
    if (inertiaRafId.current !== null) {
      cancelAnimationFrame(inertiaRafId.current);
      inertiaRafId.current = null;
    }
  }, []);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  // Silky-smooth RAF easing for mouse wheel
  const startSmoothWheel = React.useCallback(() => {
    if (wheelRafId.current !== null) return;

    const step = () => {
      const el = scrollRef.current;
      if (!el) {
        wheelRafId.current = null;
        return;
      }

      const current = el.scrollLeft;
      const target = targetScrollLeft.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.6) {
        el.scrollLeft = target;
        wheelRafId.current = null;
        checkScroll();
        return;
      }

      // Smooth exponential ease-out interpolation
      el.scrollLeft = current + diff * 0.16;
      checkScroll();
      wheelRafId.current = requestAnimationFrame(step);
    };

    wheelRafId.current = requestAnimationFrame(step);
  }, [checkScroll]);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(el);
    }

    const timer = setTimeout(checkScroll, 150);

    // Convert desktop vertical mouse wheel to buttery-smooth horizontal scrolling
    // Only intercepts when horizontal scrolling is possible in that direction,
    // avoiding trapping page scroll at the boundaries.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;

        const canScrollMoreLeft = el.scrollLeft > 1;
        const canScrollMoreRight = el.scrollLeft < maxScroll - 1;

        if ((e.deltaY > 0 && canScrollMoreRight) || (e.deltaY < 0 && canScrollMoreLeft)) {
          e.preventDefault();

          if (wheelRafId.current === null) {
            targetScrollLeft.current = el.scrollLeft;
          }

          // Accumulate wheel delta with boundary clamping
          targetScrollLeft.current = Math.max(
            0,
            Math.min(maxScroll, targetScrollLeft.current + e.deltaY * 1.35)
          );

          startSmoothWheel();
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      clearTimeout(timer);
      stopAllAnimations();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      el.removeEventListener("wheel", onWheel);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [checkScroll, startSmoothWheel, stopAllAnimations, tabs]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    stopAllAnimations();
    const scrollAmount = direction === "left" ? -320 : 320;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    stopAllAnimations();
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    lastDragX.current = e.pageX;
    lastDragTime.current = performance.now();
    dragVelocity.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();

    const now = performance.now();
    const dt = now - lastDragTime.current;
    if (dt > 0) {
      const instantVelocity = (lastDragX.current - e.pageX) / dt;
      dragVelocity.current = dragVelocity.current * 0.35 + instantVelocity * 0.65;
    }
    lastDragX.current = e.pageX;
    lastDragTime.current = now;

    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartX.current;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const el = scrollRef.current;
    if (!el || !hasDragged.current) return;

    // Kinetic momentum fling on release
    const velocity = dragVelocity.current;
    if (Math.abs(velocity) > 0.15) {
      let speed = velocity * 15;
      const friction = 0.93;

      const stepInertia = () => {
        speed *= friction;
        el.scrollLeft += speed;
        checkScroll();

        if (Math.abs(speed) > 0.4) {
          inertiaRafId.current = requestAnimationFrame(stepInertia);
        } else {
          inertiaRafId.current = null;
        }
      };

      inertiaRafId.current = requestAnimationFrame(stepInertia);
    }
  };

  const handleTabClick = (tabSlug: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDragged.current) return;
    setActiveTab(tabSlug);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <section className="border-t border-black/5 bg-white py-12 sm:py-16 lg:py-20">
      <Container>
        <SectionHeading
          eyebrow="FEATURED"
          title="EXPLORE OUR CATALOG"
          align="center"
          action={{ href: "/shop", label: "View All" }}
        />

        {/* Filter Tabs (Single-Line Scrollable Pills with Arrows & Drag-Scroll) */}
        {tabs.length > 1 && (
          <div className="relative mt-6 sm:mt-8">
            {/* Left Edge Gradient Fade */}
            {canScrollLeft && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-12 bg-linear-to-r from-white via-white/80 to-transparent transition-opacity"
                aria-hidden="true"
              />
            )}

            {/* Left Chevron Button */}
            {canScrollLeft && (
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => handleScroll("left")}
                className="border-vl-dark-900/15 text-vl-dark-900 hover:border-vl-dark-900/30 absolute top-1/2 left-0 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95 shadow-xs backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Scrollable Container */}
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className={`flex scrollbar-none items-center gap-2 overflow-x-auto overscroll-x-contain px-2 py-1.5 [&::-webkit-scrollbar]:hidden ${
                isDragging ? "cursor-grabbing select-none" : "cursor-grab"
              }`}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.slug;
                return (
                  <Button
                    key={tab.slug}
                    type="button"
                    variant={isActive ? "brand" : "outline"}
                    size="sm"
                    onClick={(e) => handleTabClick(tab.slug, e)}
                    className="shrink-0 rounded-full px-5 text-xs font-semibold whitespace-nowrap transition-colors"
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </div>

            {/* Right Edge Gradient Fade */}
            {canScrollRight && (
              <div
                className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12 bg-linear-to-l from-white via-white/80 to-transparent transition-opacity"
                aria-hidden="true"
              />
            )}

            {/* Right Chevron Button */}
            {canScrollRight && (
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => handleScroll("right")}
                className="border-vl-dark-900/15 text-vl-dark-900 hover:border-vl-dark-900/30 absolute top-1/2 right-0 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95 shadow-xs backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* 4-Column x 2-Row Grid (8 Cards) */}
        {displayedProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-12 sm:grid-cols-3 sm:gap-4 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border-vl-dark-900/20 bg-vl-dark-900/2 mt-8 rounded-xs border border-dashed px-4 py-16 text-center sm:mt-12">
            <p className="text-vl-dark-900 text-sm font-bold tracking-wider uppercase">
              No products found in {activeTabLabel} yet
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              New drops are in production. Check back soon or browse all items.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveTab("all")}
              className="mt-4 px-5"
            >
              Show All Products
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}
