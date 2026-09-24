"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function IdleTimeout() {
  const { status } = useSession();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Path is more reliable than role for customer vs admin
    const isAdminArea = pathname.startsWith("/admin");
    const callbackUrl = isAdminArea ? "/login?admin=1" : "/login";

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resetTimer = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl });
      }, IDLE_TIMEOUT);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimer();
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [status, pathname]);

  return null;
}