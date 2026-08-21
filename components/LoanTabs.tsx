"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

const tabs = [
  { key: "overview", label: "Overview" },
  // { key: "payment", label: "Make a Payment" },
  { key: "transactions", label: "Transactions" },
  { key: "schedule", label: "Schedule" },
  // { key: "documents", label: "Documents" },
];

export default function LoanTabs({ loanId }: { loanId: string }) {
  const pathname = usePathname();

  return (
    <div className="mt-6 flex gap-6 border-b border-border text-sm">
      {tabs.map((tab) => {
        const href = `/loans/${loanId}/${tab.key}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.key}
            href={href}
            data-track-label={`Loan tab:${tab.label}`}
            className={clsx(
              "-mb-px border-b-2 pb-3 font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
