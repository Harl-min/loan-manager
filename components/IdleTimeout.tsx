"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const IDLE_TIMEOUT = 300000; // 5 minutes in milliseconds

export default function IdleTimeout() {
  const { data: session, status } = useSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run when the user is signed in
    if (status !== "authenticated") return;

    const role = (session?.user as any)?.role;
    const isAdmin = role === "admin";

    const callbackUrl = isAdmin ? "/login?admin=1" : "/login";

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
  }, [status, session?.user]);

  return null;
}