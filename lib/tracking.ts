"use client";

// ---------------------------------------------------------------------------
// Button/interaction activity tracker.
//
// Design:
//  - A single capture-phase `click` listener is attached to `document` once
//    (see components/ClickTracker.tsx). It requires no per-button wiring —
//    every <button>, <a>, or any element marked `data-track` is captured
//    automatically, so adding new buttons anywhere in the app "just works".
//  - Events are queued in memory and flushed in batches (every 4s, when 10
//    events accumulate, or on page unload via sendBeacon) to avoid firing a
//    network request per click.
//  - The server endpoint (app/api/events/route.ts) persists rows to the DB
//    via Prisma. If NEXT_PUBLIC_API_URL points at an external server instead,
//    events are posted there — the queueing logic doesn't change.
// ---------------------------------------------------------------------------

export type TrackedEvent = {
  label: string;
  elementId?: string;
  path: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

const QUEUE_KEY = "__neptune_track_queue";
const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 10;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "neptune_session_id";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

let queue: TrackedEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function endpoint() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  return `${base}/events`;
}

async function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const payload = JSON.stringify({ sessionId: getSessionId(), events: batch });

  try {
    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint(), blob);
      return;
    }
    await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "include",
      keepalive: true,
    });
  } catch {
    // Best-effort: dropped events shouldn't break the UI.
  }
}

export function trackEvent(event: Omit<TrackedEvent, "timestamp">) {
  queue.push({ ...event, timestamp: new Date().toISOString() });
  if (queue.length >= MAX_BATCH) void flush();
}

export function initTracking() {
  if (typeof window === "undefined" || timer) return;
  timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  window.addEventListener("beforeunload", () => flush(true));
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
}

/** Finds the nearest clickable ancestor and derives a human label for it. */
export function resolveTrackedTarget(target: EventTarget | null): {
  el: HTMLElement;
  label: string;
} | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>(
    "[data-track], button, a, [role='button'], input[type='submit'], input[type='button']"
  );
  if (!el) return null;

  const label =
    el.getAttribute("data-track-label") ||
    el.getAttribute("aria-label") ||
    el.textContent?.trim().slice(0, 80) ||
    el.getAttribute("id") ||
    el.tagName.toLowerCase();

  return { el, label };
}
