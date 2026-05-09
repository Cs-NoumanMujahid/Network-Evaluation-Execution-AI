"use client";

import { useEffect, useRef, useState } from "react";
import { useSidebarTransition } from "@/hooks/useSidebarTransition";

interface FrozenChartProps {
  children: React.ReactNode;
}

/**
 * Wraps chart components and freezes their pixel width while the sidebar
 * is animating open/closed. This prevents Recharts ResponsiveContainer from
 * firing resize events on every animation frame, eliminating sidebar lag.
 *
 * After the sidebar transition completes (180ms), the frozen width is released
 * and the chart snaps directly to its final correct size.
 */
export default function FrozenChart({ children }: FrozenChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);
  const isTransitioning = useSidebarTransition(180);

  useEffect(() => {
    if (isTransitioning) {
      // Capture the current rendered width before sidebar starts moving
      if (containerRef.current) {
        setFrozenWidth(containerRef.current.offsetWidth);
      }
    } else {
      // Sidebar has settled — release the frozen width so chart resizes to new dimensions
      setFrozenWidth(null);
    }
  }, [isTransitioning]);

  return (
    <div
      ref={containerRef}
      style={frozenWidth !== null ? { width: frozenWidth, flexShrink: 0 } : { width: "100%" }}
    >
      {children}
    </div>
  );
}
