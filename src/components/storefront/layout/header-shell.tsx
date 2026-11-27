"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface HeaderShellProps {
  children: React.ReactNode;
  hasAnnouncement?: boolean;
}

export function HeaderShell({ children, hasAnnouncement = false }: HeaderShellProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const lastScrollY = lastScrollYRef.current;

          // Determine if we are scrolled past the initial page top / announcement bar
          const scrollThreshold = hasAnnouncement ? 34 : 20;
          setIsScrolled(currentScrollY > scrollThreshold);

          // Scroll tolerance to prevent tiny jittering on sensitive touchpads
          const diff = currentScrollY - lastScrollY;

          const topThreshold = hasAnnouncement ? 80 : 60;
          if (currentScrollY <= topThreshold) {
            // At the top of the page: always show
            setIsVisible(true);
          } else if (diff > 18) {
            // Scrolling down: hide header
            setIsVisible(false);
          } else if (diff < -16) {
            // Scrolling up: reveal header
            setIsVisible(true);
          }

          lastScrollYRef.current = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasAnnouncement]);

  return (
    <header
      className={cn(
        "pointer-events-none fixed right-0 left-0 z-50 w-full px-2.5 transition-all duration-300 ease-out sm:px-6 lg:px-8",
        isScrolled
          ? "top-1.5 sm:top-2"
          : hasAnnouncement
            ? "top-10 sm:top-11"
            : "top-2 sm:top-3",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0 sm:-translate-y-20"
      )}
    >
      {children}
    </header>
  );
}
