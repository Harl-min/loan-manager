"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "@/lib/clsx";
import { brand } from "@/lib/brand";
import Image from "next/image";
const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calculator", label: "Loan Calculator" },
  { href: "/settings", label: "Profile & Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-surface px-4 py-5">
      <div>     
        <div className="mb-8 flex flex-col gap-2 px-2">
          <div className="mx-auto mb-4 flex items-start justify-start">
            <Image src={brand.logo} alt="Logo" width={140} height={40} />
          </div>
          <div>
            {/* <div className="text-sm font-semibold leading-tight text-foreground">{brand.name}</div> */}

            <div className="text-xs leading-tight text-muted">
              {brand.tagline}
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                data-track-label={`nav:${item.label}`}
                className={clsx(
                  "block rounded-brand px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted/10 text-foreground"
                    : "text-muted hover:bg-muted/10 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 px-2">
          <div className="text-sm font-medium text-foreground">
            {session?.user?.name}
          </div>
          <div className="truncate text-xs text-muted">
            {session?.user?.email}
          </div>
        </div>
        <button
          data-track-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-brand px-3 py-2 text-left text-sm font-medium text-muted hover:bg-muted/10 hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
