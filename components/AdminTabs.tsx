"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import AmortizationSchedule from "@/components/AmortizationSchedule";

import type {
  LoanScheduleItem,
  LoanAccountHistoryItem,
} from "@/types/loan";

import { LoanStatistics } from "@/types/loanSummary";

type AdminLoanDetailClientProps = {
  accountNo: string;
  statistics: LoanStatistics | null;
  transactions: LoanAccountHistoryItem[];
  schedule: LoanScheduleItem[];
  customerId: string;
  apiError: boolean;
};

const tabs = ["Details", "Transactions", "Schedule"] as const;

export default function AdminLoanDetailClient({
  accountNo,
  statistics,
  transactions,
  schedule,
  customerId,
  apiError,
}: AdminLoanDetailClientProps) {
  const router = useRouter();

  const [tab, setTab] =
    useState<(typeof tabs)[number]>("Details");

  /*
   * All financial information now comes from
   * the Loan Statistics API.
   *
   * No Prisma loan object is required.
   */

  const currentBalance =
    statistics?.TOTAL_OUTSTANDING_ALL ?? null;

  const accountName =
    statistics?.ACCT_NM || "Loan Account";

  const interestRate =
    statistics?.INTEREST_RATE ?? null;

  const accountStatus =
    statistics
      ? formatAccountStatus(statistics.ACCOUNT_STATUS)
      : "Unavailable";

  return (
    <div>

      {/* BACK TO CUSTOMER */}
      <button
        data-track-label="Back to customer"
        onClick={() =>
          router.push(`/admin/users/${customerId}`)
        }
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to customer
      </button>

      {/* ACCOUNT HEADER */}
      <div className="mt-2 flex items-start justify-between">

        <div>

          <div className="flex items-center gap-3">

            <h1 className="text-2xl font-bold text-foreground">
              {accountName}
            </h1>

            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statistics
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              {accountStatus}
            </span>

          </div>

          <p className="text-sm text-muted">
            Account {accountNo}
            {interestRate !== null
              ? ` • ${interestRate}% fixed`
              : ""}
          </p>

          {statistics?.MATURITY_DT && (
            <p className="mt-1 text-xs text-muted">
              Matures {fmtDate(statistics.MATURITY_DT)}
            </p>
          )}

        </div>

        {/* CURRENT BALANCE */}
        <div className="text-right">

          <div className="text-xs text-muted">
            Current Balance
          </div>

          <div className="text-xl font-bold text-foreground">
            {currentBalance !== null
              ? fmtCurrency(currentBalance)
              : "—"}
          </div>

        </div>

      </div>

      {/* API ERROR */}
      {apiError && (
        <Card className="mt-4 border border-warning/30 bg-warning/10">
          <p className="text-sm text-muted">
            Loan information is currently unavailable.
            Please try again later.
          </p>
        </Card>
      )}

      {/* TABS */}
      <div className="mt-6 flex gap-6 border-b border-border text-sm">

        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            data-track-label={`Admin loan tab:${t}`}
            onClick={() => setTab(t)}
            className={clsx(
              "-mb-px border-b-2 pb-3 font-medium transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}

      </div>

      <div className="mt-6">

        {/* ================= DETAILS ================= */}
        {tab === "Details" && (
          <div className="space-y-6">

            {/* CONTRACT DETAILS */}
            <div>

              <h2 className="mb-3 font-semibold text-foreground">
                Contract Details
              </h2>

              <div className="grid grid-cols-4 gap-4">

                <Card className="p-4">

                  <div className="text-xs text-muted">
                    Original Amount
                  </div>

                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {statistics
                      ? fmtCurrency(
                          statistics.ORIGINAL_LOAN_AMOUNT
                        )
                      : "—"}
                  </div>

                </Card>

                <Card className="p-4">

                  <div className="text-xs text-muted">
                    Interest Rate
                  </div>

                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {statistics
                      ? `${statistics.INTEREST_RATE}%`
                      : "—"}
                  </div>

                  <div className="mt-1 text-xs text-muted">
                    Fixed rate
                  </div>

                </Card>

                <Card className="p-4">

                  <div className="text-xs text-muted">
                    Term
                  </div>

                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {statistics
                      ? `${statistics.TERM_VALUE} ${
                          statistics.TERM_CD || "Months"
                        }`
                      : "—"}
                  </div>

                  <div className="mt-1 text-xs text-muted">
                    {statistics?.MATURITY_DT
                      ? `Matures ${fmtDate(
                          statistics.MATURITY_DT
                        )}`
                      : "Maturity unavailable"}
                  </div>

                </Card>

                <Card className="p-4">

                  <div className="text-xs text-muted">
                    Total Due Next
                  </div>

                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {statistics
                      ? fmtCurrency(
                          statistics.TOTAL_DUE_NEXT
                        )
                      : "—"}
                  </div>

                </Card>

              </div>

            </div>

            {/* BALANCE BREAKDOWN */}
            <div>

              <h2 className="mb-3 font-semibold text-foreground">
                Balance Breakdown
              </h2>

              <Card className="divide-y divide-border p-0">

                <BreakdownRow
                  label="Principal Outstanding"
                  value={
                    statistics?.TOTAL_PRINCIPAL_OUTSTANDING
                  }
                />

                <BreakdownRow
                  label="Interest Outstanding"
                  value={
                    statistics?.TOTAL_INTEREST_OUTSTANDING
                  }
                />

                <BreakdownRow
                  label="Overdue Principal"
                  value={
                    statistics?.OVERDUE_PRINCIPAL
                  }
                />

                <BreakdownRow
                  label="Overdue Interest"
                  value={
                    statistics?.OVERDUE_INTEREST
                  }
                />

                <BreakdownRow
                  label="Charges"
                  value={statistics?.CHARGES}
                />

                <div className="flex items-center justify-between px-6 py-3 font-semibold text-foreground">

                  <span>Total Balance</span>

                  <span>
                    {statistics
                      ? fmtCurrency(
                          statistics.TOTAL_OUTSTANDING_ALL
                        )
                      : "—"}
                  </span>

                </div>

              </Card>

            </div>

            {/* PAYMENT SUMMARY */}
            <div className="grid grid-cols-3 gap-4">

              <Card>

                <div className="text-xs text-muted">
                  Principal Paid
                </div>

                <div className="mt-1 text-lg font-semibold text-foreground">
                  {statistics
                    ? fmtCurrency(
                        statistics.PRINCIPAL_PAID
                      )
                    : "—"}
                </div>

              </Card>

              <Card>

                <div className="text-xs text-muted">
                  Interest Paid
                </div>

                <div className="mt-1 text-lg font-semibold text-foreground">
                  {statistics
                    ? fmtCurrency(
                        statistics.INTEREST_PAID
                      )
                    : "—"}
                </div>

              </Card>

              <Card>

                <div className="text-xs text-muted">
                  Total Paid
                </div>

                <div className="mt-1 text-lg font-semibold text-foreground">
                  {statistics
                    ? fmtCurrency(
                        statistics.TOTAL_PAID
                      )
                    : "—"}
                </div>

              </Card>

            </div>

            {/* DUE SUMMARY */}
            <div className="grid grid-cols-2 gap-4">

              <Card>

                <div className="text-xs text-muted">
                  Due Now
                </div>

                <div className="mt-1 text-lg font-semibold text-foreground">
                  {statistics
                    ? fmtCurrency(
                        statistics.TOTAL_DUE_NOW
                      )
                    : "—"}
                </div>

              </Card>

              <Card>

                <div className="text-xs text-muted">
                  Next Payment
                </div>

                <div className="mt-1 text-lg font-semibold text-foreground">
                  {statistics
                    ? fmtCurrency(
                        statistics.TOTAL_DUE_NEXT
                      )
                    : "—"}
                </div>

              </Card>

            </div>

          </div>
        )}

        {/* ================= TRANSACTIONS ================= */}
        {tab === "Transactions" && (
          <Card className="divide-y divide-border p-0">

            {transactions.length === 0 ? (

              <p className="px-6 py-6 text-center text-sm text-muted">
                No transactions yet.
              </p>

            ) : (

              transactions.map((t, index) => {

                const isCredit = t.DrCr === "CR";

                return (
                  <div
                    key={`${t.TransactionReference}-${index}`}
                    className="flex items-center justify-between px-6 py-4"
                  >

                    <div className="flex items-center gap-3">

                      <span
                        className={clsx(
                          "h-2 w-2 rounded-full",
                          isCredit
                            ? "bg-success"
                            : "bg-primary"
                        )}
                      />

                      <div>

                        <div className="text-sm font-medium text-foreground">
                          {t.EventDescription ||
                            t.TransactionDescription ||
                            "Transaction"}
                        </div>

                        <div className="text-xs text-muted">

                          {fmtDate(
                            t.TransactionDate
                          )}

                          {t.TransactionReference
                            ? ` • ${t.TransactionReference}`
                            : ""}

                        </div>

                      </div>

                    </div>

                    <div
                      className={clsx(
                        "text-sm font-semibold",
                        isCredit
                          ? "text-success"
                          : "text-foreground"
                      )}
                    >
                      {isCredit ? "+" : "-"}
                      {fmtCurrency(
                        Math.abs(t.Amount)
                      )}
                    </div>

                  </div>
                );
              })
            )}

          </Card>
        )}

        {/* ================= SCHEDULE ================= */}
        {tab === "Schedule" && (
          <AmortizationSchedule
            schedule={schedule}
          />
        )}

      </div>

    </div>
  );
}

function BreakdownRow({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm">

      <span className="text-muted">
        {label}
      </span>

      <span className="font-medium text-foreground">
        {value !== undefined && value !== null
          ? fmtCurrency(value)
          : "—"}
      </span>

    </div>
  );
}

function formatAccountStatus(status: string) {
  switch (status) {
    case "A":
      return "Active";

    case "I":
      return "Inactive";

    case "C":
      return "Closed";

    case "D":
      return "Dormant";

    default:
      return status || "Unknown";
  }
}