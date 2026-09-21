"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "@/lib/clsx";
import { brand } from "@/lib/brand";
import Image from "next/image";
import { LogOut } from "lucide-react";

import {
  History,
  UserPen,
  RotateCwFadingClock,ListClock 
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin/users", label: "Manage Users", icon: UserPen },
  { href: "/admin/approvals", label: "Approvals", icon: RotateCwFadingClock },
  { href: "/admin/activity", label: "User Activity", icon: ListClock  },
];
const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;
export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    const accessToken =
      (session as any)?.accessToken || (session as any)?.access_token;
    const refreshToken =
      (session as any)?.refreshToken || (session as any)?.refresh_token;

    try {
      // Kill remote session(s) using refresh_token
      if (refreshToken || accessToken) {
        await fetch(`${ACCT_URL}api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
          },
          body: JSON.stringify(
            refreshToken ? { refresh_token: refreshToken } : {},
          ),
        }).catch((err) => {
          // Still clear local session even if remote logout fails
          console.error("Remote logout failed:", err);
        });
      }
    } finally {
      await signOut({ callbackUrl: "/login?admin=1" }); // or "/login"
    }
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-surface px-4 py-5">
      <div>
        <div className="mb-8 flex flex-col gap-2 px-2">
          <div className="mx-auto mb-4 flex items-start justify-start">
            <Image
              src={brand.logo}
              alt="Logo"
              width={200}
              height={80}
              className="h-auto"
            />
          </div>
          <div>
            {/* <div className="text-sm font-semibold leading-tight text-foreground">{brand.name}</div> */}
            <div className="text-xs font-bold leading-tight text-muted">
              Admin Console
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
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
          <div className="truncate text-sm font-medium text-foreground">
            {session?.user?.name}
          </div>
          <div className="truncate text-xs text-muted">
            {session?.user?.email}
          </div>
          <span className="mt-1 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary w-fit">
            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
            ADMIN
          </span>
        </div>
        {/* <Link
          href="/dashboard"
          data-track-label="Switch to borrower view"
          className="block w-full rounded-brand px-3 py-2 text-left text-sm font-medium text-muted hover:bg-muted/10 hover:text-foreground"
        >
          Borrower view
        </Link> */}
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
    </aside>
  );
}
