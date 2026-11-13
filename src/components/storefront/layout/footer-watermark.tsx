"use client";

import { motion, useInView } from "framer-motion";
import * as React from "react";

export function FooterWatermark() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "100px 0px 0px 0px" });

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative mt-3 overflow-hidden select-none"
    >
      {/* Giant watermark text — full-width, anchored to bottom */}
      <div
        className="flex w-full items-end justify-center"
        style={{ height: "clamp(60px, 12vw, 160px)" }}
      >
        <motion.span
          initial={{ y: "100%", opacity: 0 }}
          animate={isInView ? { y: "20%", opacity: 1 } : { y: "100%", opacity: 0 }}
          transition={{
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="text-vl-dark-500/30 block leading-none font-black tracking-tight whitespace-nowrap uppercase will-change-transform"
          style={{
            fontSize: "clamp(72px, 14vw, 200px)",
            lineHeight: 1,
          }}
        >
          VIBELOCK
        </motion.span>
      </div>
    </div>
  );
}
