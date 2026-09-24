"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "@/lib/clsx";
import { brand } from "@/lib/brand";
import Image from "next/image";
import {
  LogOut,
  LayoutDashboard,
  UserPen,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Profile & Settings", icon: UserPen },
];

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

type SidebarProps = {
  /** Controlled open state from layout (mobile drawer) */
  open?: boolean;
  onClose?: () => void;
  /** When true, render as fixed drawer (mobile) */
  mobile?: boolean;
};

export default function Sidebar({
  open = true,
  onClose,
  mobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const email = session?.user?.email?.trim().toLowerCase() || "";
    const sessionName = session?.user?.name?.trim() || "";
    const accessToken =
      (session as any)?.accessToken || (session as any)?.access_token;

    if (!email || !accessToken || !ACCT_URL) {
      setDisplayName(sessionName || "Customer");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${ACCT_URL}api/v1/auth/profile`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        console.log("GET /api/v1/auth/profile:", data);

        if (!response.ok) {
          throw new Error(
            data?.detail || data?.message || "Unable to load profile",
          );
        }

        const name =
          data?.full_name ||
          data?.name ||
          sessionName ||
          "Customer";

        if (!cancelled) setDisplayName(name);
      } catch (err) {
        console.error("Profile load failed:", err);
        if (!cancelled) setDisplayName(sessionName || "Customer");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Close drawer after navigating on mobile
  useEffect(() => {
    if (mobile) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const refreshToken =
      (session as any)?.refreshToken || (session as any)?.refresh_token;

    try {
      if (refreshToken) {
        await fetch(`${ACCT_URL}api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => undefined);
      }
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const nav = (
    <div className="flex h-full w-64 flex-col justify-between border-r border-border bg-surface px-4 py-5">
      <div>
        <div className="mb-8 flex flex-col gap-2 px-2">
          <div className="mb-4 flex items-start justify-between gap-2">
            <Image
              src={brand.logo}
              alt="Logo"
              width={180}
              height={72}
              className="h-auto w-auto max-w-[160px]"
            />
            {mobile && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-brand p-2 text-muted hover:bg-muted/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="text-xs font-bold leading-tight text-muted">
            {brand.tagline}
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                data-track-label={`nav:${item.label}`}
                className={clsx(
                  "flex items-center gap-2 rounded-brand px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted/10 text-primary"
                    : "text-muted hover:bg-muted/10 hover:text-hover",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 px-2">
          <div className="truncate text-sm font-medium text-primary">
            {displayName}
          </div>
          <div className="truncate text-xs text-muted">
            {session?.user?.email || ""}
          </div>
        </div>
        <button
          data-track-label="Sign out"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2 rounded-brand px-3 py-2 text-left text-sm font-medium text-muted hover:bg-muted/10 hover:text-hover disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );

  // Mobile: fixed drawer + backdrop
  if (mobile) {
    return (
      <>
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={onClose}
          aria-hidden={!open}
        />
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-50 h-full transform transition-transform duration-200 lg:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {nav}
        </aside>
      </>
    );
  }

  // Desktop: static column
  return <aside className="hidden h-screen shrink-0 lg:block">{nav}</aside>;
}

/** Top bar + menu button for small screens */
export function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-brand p-2 text-muted hover:bg-muted/10"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Image
        src={brand.logo}
        alt="Logo"
        width={120}
        height={40}
        className="h-8 w-auto"
      />
    </header>
  );
}