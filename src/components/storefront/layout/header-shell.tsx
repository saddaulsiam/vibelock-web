"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface HeaderShellProps {
  children: React.ReactNode;
  announcement?: React.ReactNode;
}

export function HeaderShell({ children, announcement }: HeaderShellProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const lastScrollY = lastScrollYRef.current;

          // Scroll tolerance to prevent tiny jittering on sensitive touchpads
          const diff = currentScrollY - lastScrollY;

          if (currentScrollY <= 60) {
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
  }, []);

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 w-full transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      {announcement && <div className="pointer-events-auto w-full">{announcement}</div>}
      <div className="w-full px-2.5 pt-2 sm:px-6 sm:pt-2.5 lg:px-8">{children}</div>
    </header>
  );
}
