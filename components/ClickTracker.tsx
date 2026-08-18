"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initTracking, resolveTrackedTarget, trackEvent } from "@/lib/tracking";

/**
 * Mounted once in the root layout. Attaches a single document-level, capture
 * phase click listener that automatically logs every button/link activation
 * in the app — no per-button instrumentation required.
 */
export default function ClickTracker() {
  const pathname = usePathname();

  useEffect(() => {
    initTracking();

    const handler = (e: MouseEvent) => {
      const resolved = resolveTrackedTarget(e.target);
      if (!resolved) return;
      const { el, label } = resolved;

      trackEvent({
        label,
        elementId: el.id || undefined,
        path: window.location.pathname,
        metadata: {
          tag: el.tagName.toLowerCase(),
          trackGroup: el.getAttribute("data-track-group") ?? undefined,
        },
      });
    };

    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [pathname]);

  return null;
}
