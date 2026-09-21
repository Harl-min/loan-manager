"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "@/lib/clsx";
import { brand } from "@/lib/brand";
import Image from "next/image";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  CreditCard,
  History,
  UserPen,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // { href: "/calculator", label: "Loan Calculator" },
  { href: "/settings", label: "Profile & Settings", icon: UserPen },
];
const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [signingOut, setSigningOut] = useState(false);
  const [customerName, setCustomerName] = useState("");

  // ----------------------------------------------------------
  // Get the customer's full name
  // ----------------------------------------------------------
  useEffect(() => {
    const loadCustomerInfo = async () => {
      const email = session?.user?.email;

      if (!email) {
        setCustomerName(session?.user?.name || "");
        return;
      }

      const accessToken =
        (session as any)?.accessToken ||
        (session as any)?.access_token;

      try {
        const url =
          `${ACCT_URL}api/v1/auth/get-customer-info` +
          `?email=${encodeURIComponent(email)}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        console.log("Customer info response:", data);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "Unable to retrieve customer information.",
          );
        }

        /*
         * Expected customer info:
         *
         * {
         *   email,
         *   customer_no,
         *   profile,
         *   account_name,
         *   account_number
         * }
         *
         * account_name is the customer's full name.
         */
        const fullName =
          data?.account_name ||
          data?.full_name ||
          data?.customer_name ||
          data?.name ||
          session?.user?.name ||
          "";

        setCustomerName(fullName);
      } catch (error) {
        console.error(
          "Failed to load customer information:",
          error,
        );

        // Fallback to NextAuth name if the API fails.
        setCustomerName(session?.user?.name || "");
      }
    };

    loadCustomerInfo();
  }, [session]);

  // ----------------------------------------------------------
  // Customer sign out
  // ----------------------------------------------------------
  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    const refreshToken =
      (session as any)?.refreshToken ||
      (session as any)?.refresh_token;

    try {
      // --------------------------------------------------------
      // Kill remote session using ONLY refresh_token.
      // No access token and no Authorization header.
      // --------------------------------------------------------
      if (refreshToken) {
        await fetch(`${ACCT_URL}api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        }).catch((err) => {
          // Local NextAuth session should still be cleared even
          // if the remote logout request fails.
          console.error("Remote logout failed:", err);
        });
      }
    } finally {
      // Clear the local NextAuth session.
      await signOut({
        callbackUrl: "/login",
      });
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
            <div className="text-xs font-bold leading-tight text-muted">
              {brand.tagline}
            </div>
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
            {customerName || session?.user?.name || "Customer"}
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

          <span>
            {signingOut ? "Signing out…" : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}
