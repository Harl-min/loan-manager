"use client";

import { useState } from "react";
import Sidebar, { MobileTopBar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:flex-row">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile drawer */}
      <Sidebar
        mobile
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopBar onMenu={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}