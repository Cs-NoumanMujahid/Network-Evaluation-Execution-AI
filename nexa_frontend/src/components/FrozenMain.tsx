"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Wraps the main content area and freezes its pixel width the instant
 * the sidebar state changes — BEFORE the browser repaints.
 *
 * useLayoutEffect fires synchronously after DOM mutations but before paint,
 * so we capture the width at exactly the right moment. The result:
 * every child (charts, grids, tables) sees a fixed-width parent throughout
 * the entire sidebar CSS animation. Zero resize events fire on any chart.
 *
 * After the sidebar animation completes (200ms), the fixed width is released
 * and the layout snaps directly to its final dimensions.
 */
export default function FrozenMain({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);
  const { state } = useSidebar();

  useLayoutEffect(() => {
    // Capture width synchronously before paint
    if (ref.current) {
      setFrozenWidth(ref.current.offsetWidth);
    }
    // Release after sidebar animation is done (sidebar.tsx uses duration-150)
    const timer = setTimeout(() => setFrozenWidth(null), 220);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <main
      ref={ref}
      style={
        frozenWidth !== null
          ? { width: frozenWidth, minWidth: frozenWidth, overflow: "hidden", flexShrink: 0 }
          : { width: "100%", minWidth: 0 }
      }
    >
      {children}
    </main>
  );
}
