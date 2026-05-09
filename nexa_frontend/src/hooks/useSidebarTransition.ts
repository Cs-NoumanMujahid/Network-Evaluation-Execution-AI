import { useEffect, useRef, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Tracks whether the sidebar is currently mid-transition.
 * Returns `true` for the duration of the CSS animation (150ms),
 * then snaps back to `false` once the new layout is settled.
 */
export function useSidebarTransition(durationMs = 180) {
  const { state } = useSidebar();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsTransitioning(false), durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, durationMs]);

  return isTransitioning;
}
