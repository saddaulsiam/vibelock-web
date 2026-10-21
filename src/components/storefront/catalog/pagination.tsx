"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function DiscoveryPagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav aria-label="Product pages" className="mt-12 flex items-center justify-center gap-3">
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          aria-label="Previous page"
          className="border-border inline-flex size-10 items-center justify-center rounded-sm border transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="border-border text-muted-foreground/50 inline-flex size-10 items-center justify-center rounded-sm border"
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      <span className="min-w-28 text-center text-sm font-medium">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          aria-label="Next page"
          className="border-border inline-flex size-10 items-center justify-center rounded-sm border transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="border-border text-muted-foreground/50 inline-flex size-10 items-center justify-center rounded-sm border"
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
