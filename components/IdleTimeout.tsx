"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes until warning
const WARNING_SECONDS = 60; // 1 minute countdown

export default function IdleTimeout() {
  const { status } = useSession();
  const pathname = usePathname();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showWarningRef = useRef(false);

  const isAdminArea = pathname.startsWith("/admin");
  const callbackUrl = isAdminArea ? "/login?admin=1" : "/login";

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const doSignOut = useCallback(() => {
    clearIdleTimer();
    clearCountdown();
    setShowWarning(false);
    showWarningRef.current = false;
    signOut({ callbackUrl });
  }, [callbackUrl]);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setSecondsLeft(WARNING_SECONDS);
    setShowWarning(true);
    showWarningRef.current = true;

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearCountdown();
          doSignOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doSignOut]);

  const resetIdleTimer = useCallback(() => {
    // Activity during warning → stay logged in
    if (showWarningRef.current) {
      clearCountdown();
      setShowWarning(false);
      showWarningRef.current = false;
      setSecondsLeft(WARNING_SECONDS);
    }

    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      startCountdown();
    }, IDLE_TIMEOUT);
  }, [startCountdown]);

  useEffect(() => {
    if (status !== "authenticated") {
      clearIdleTimer();
      clearCountdown();
      setShowWarning(false);
      showWarningRef.current = false;
      return;
    }

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    const onActivity = () => resetIdleTimer();

    events.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    resetIdleTimer();

    return () => {
      clearIdleTimer();
      clearCountdown();
      events.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
    };
  }, [status, pathname, resetIdleTimer]);

  if (status !== "authenticated" || !showWarning) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md rounded-brand border border-border bg-surface p-6 shadow-xl">
        <h2
          id="idle-warning-title"
          className="text-lg font-semibold text-foreground"
        >
          Still there?
        </h2>
        <p className="mt-2 text-sm text-muted">
          You’ve been inactive. You’ll be signed out in{" "}
          <span className="font-semibold text-foreground">{label}</span>{" "}
          unless you continue.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={doSignOut}
            className="rounded-brand border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-muted/10"
          >
            Sign out now
          </button>
          <button
            type="button"
            onClick={resetIdleTimer}
            className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}