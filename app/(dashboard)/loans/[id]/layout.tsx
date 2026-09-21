import Link from "next/link";
import { fmtCurrency, fmtDate } from "@/lib/format";
import LoanTabs from "@/components/LoanTabs";

import {
  LoanStatistics,
  LoanStatisticsResponse,
} from "@/types/loanSummary";

export default async function LoanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const accountNo = params.id;
  const BASE_URL = process.env.NEXT_DATA_API_URL;

  let statistics: LoanStatistics | null = null;

  if (BASE_URL) {
    try {
      const response = await fetch(
        `${BASE_URL}/loanStatistics/loanStatisticsRestService/execute?acctNum=${encodeURIComponent(
          accountNo
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data: LoanStatisticsResponse =
          await response.json();

        statistics =
          data.loanstatisticsdbReferenceOutput?.[0] ?? null;
      }
    } catch (error) {
      console.error(
        `Failed to fetch loan statistics for ${accountNo}:`,
        error
      );
    }
  }

  const accountName =
    statistics?.ACCT_NM || "Loan Account";

  const accountStatus = statistics
    ? formatAccountStatus(statistics.ACCOUNT_STATUS)
    : "Unavailable";

  return (
    <div>

      <Link
        href="/dashboard"
        data-track-label="Back to dashboard"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-2 flex items-start justify-between">

        <div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">
              {accountName}
            </h1>

            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              {accountStatus}
            </span>
          </div>

          <p className="text-sm text-muted">
            Account {accountNo}

            {statistics?.INTEREST_RATE !== undefined &&
              ` • ${statistics.INTEREST_RATE}% fixed`}
          </p>

          {statistics?.MATURITY_DT && (
            <p className="mt-1 text-xs text-muted">
              Matures {fmtDate(statistics.MATURITY_DT)}
            </p>
          )}

        </div>

        <div className="text-right">

          <div className="text-xs text-muted">
            Current Balance
          </div>

          <div className="text-xl font-bold text-primary">
            {statistics
              ? fmtCurrency(
                  statistics.TOTAL_OUTSTANDING_ALL
                )
              : "—"}
          </div>

        </div>

      </div>

      <LoanTabs loanId={accountNo} />

      <div className="mt-6">
        {children}
      </div>

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