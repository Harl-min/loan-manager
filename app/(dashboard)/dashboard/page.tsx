import Link from "next/link";
import { Card, StatCard } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import {
  LoanStatistics,
  LoanStatisticsResponse,
} from "@/types/loanSummary";
import ApiErrorDialog from "@/components/ApiDialog";

type LoanListItem = {
  ACCT_NO: string;
  REC_ST: string;
  status: string;
  PROD_DESC: string;
};

type LoanListResponse = {
  loanListdbReferenceOutput: LoanListItem[];
};

export default async function DashboardPage() {
  const BASE_URL = process.env.NEXT_DATA_API_URL;

  /*
   * Hardcoded customer number for testing.
   *
   * Replace this later with the customer's actual
   * customer number from the authenticated user.
   */
  const custNum = "0000035668";

  let accounts: LoanListItem[] = [];
  const statisticsByAccount = new Map<
    string,
    LoanStatistics
  >();

  let apiError = false;

  /*
   * -------------------------------------------------------
   * 1. GET CUSTOMER LOAN LIST
   * -------------------------------------------------------
   */
  if (!BASE_URL) {
    apiError = true;
  } else {
    try {
      const response = await fetch(
        `${BASE_URL}/loanList/loanListRestService/loanList?custNum=${encodeURIComponent(
          custNum,
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Loan list API returned ${response.status}`,
        );
      }

      const data: LoanListResponse =
        await response.json();

      accounts =
        data.loanListdbReferenceOutput ?? [];
    } catch (error) {
      console.error(
        "Failed to fetch loan list:",
        error,
      );

      apiError = true;
    }
  }

  /*
   * -------------------------------------------------------
   * 2. FIND THE MOST ACTIVE ACCOUNT
   * -------------------------------------------------------
   *
   * REC_ST === "A" means active.
   *
   * If there is an active account, it becomes the
   * primary account used for the dashboard summary.
   */
  const primaryAccount =
    accounts.find(
      (account) => account.REC_ST === "A",
    ) ?? accounts[0];

  /*
   * -------------------------------------------------------
   * 3. GET STATISTICS FOR EVERY ACCOUNT
   * -------------------------------------------------------
   */
  if (BASE_URL && accounts.length > 0) {
    const results = await Promise.all(
      accounts.map(async (account) => {
        try {
          const response = await fetch(
            `${BASE_URL}/loanStatistics/loanStatisticsRestService/execute?acctNum=${encodeURIComponent(
              account.ACCT_NO,
            )}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              cache: "no-store",
            },
          );

          if (!response.ok) {
            throw new Error(
              `Loan statistics API returned ${response.status}`,
            );
          }

          const data: LoanStatisticsResponse =
            await response.json();

          const statistics =
            data.loanstatisticsdbReferenceOutput?.[0] ??
            null;

          return {
            accountNumber: account.ACCT_NO,
            statistics,
          };
        } catch (error) {
          console.error(
            `Failed to fetch statistics for ${account.ACCT_NO}:`,
            error,
          );

          return {
            accountNumber: account.ACCT_NO,
            statistics: null,
          };
        }
      }),
    );

    results.forEach(
      ({ accountNumber, statistics }) => {
        if (statistics) {
          statisticsByAccount.set(
            accountNumber,
            statistics,
          );
        }
      },
    );

    /*
     * If we have accounts but none of their statistics
     * could be retrieved, show the API error dialog.
     */
    if (
      accounts.length > 0 &&
      statisticsByAccount.size === 0
    ) {
      apiError = true;
    }
  }

  /*
   * -------------------------------------------------------
   * 4. PRIMARY ACCOUNT STATISTICS
   * -------------------------------------------------------
   */
  const primaryStatistics = primaryAccount
    ? statisticsByAccount.get(
        primaryAccount.ACCT_NO,
      )
    : null;

  /*
   * IMPORTANT:
   *
   * No Prisma financial fallback.
   * If API doesn't return data, display "—".
   */
  const totalOutstanding =
    primaryStatistics?.TOTAL_OUTSTANDING_ALL ?? null;

  const nextPayment =
    primaryStatistics?.TOTAL_DUE_NEXT ?? null;

  const dueNow =
    primaryStatistics?.TOTAL_DUE_NOW ?? null;

  const percentPaidOff =
    primaryStatistics &&
    primaryStatistics.ORIGINAL_LOAN_AMOUNT > 0
      ? Math.round(
          (primaryStatistics.PRINCIPAL_PAID /
            primaryStatistics.ORIGINAL_LOAN_AMOUNT) *
            100,
        )
      : 0;

  return (
    <div>
      {/* API ERROR */}
      <ApiErrorDialog
        open={apiError}
        message="We are unable to retrieve your latest loan information at the moment. Please check your internet connection and try again."
      />

      <p className="text-sm text-muted">
        Welcome back
      </p>

      <h1 className="mt-1 text-2xl font-bold text-foreground">
        Your Loan Portfolio
      </h1>

      {/* =====================================================
          SUMMARY
      ====================================================== */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding"
          value={
            totalOutstanding !== null
              ? fmtCurrency(totalOutstanding)
              : "—"
          }
        />

        <StatCard
          label="Next Payment"
          value={
            nextPayment !== null
              ? fmtCurrency(nextPayment)
              : "—"
          }
        />

        <StatCard
          label="Due Now"
          value={
            dueNow !== null
              ? fmtCurrency(dueNow)
              : "—"
          }
        />

        <StatCard
          label="Status"
          value={
            primaryStatistics
              ? formatAccountStatus(
                  primaryStatistics.ACCOUNT_STATUS,
                )
              : "—"
          }
        />
      </div>

      {/* =====================================================
          LOAN PROGRESS
      ====================================================== */}

      <Card className="mt-6">
        <h2 className="font-semibold text-foreground">
          Loan Progress
        </h2>

        <p className="mt-1 text-sm text-muted">
          {primaryStatistics
            ? `${percentPaidOff}% of total principal paid off`
            : "Loan progress information unavailable"}
        </p>

        <div className="mt-6 flex items-center gap-8">
          <ProgressRing
            percent={primaryStatistics ? percentPaidOff : 0}
          />

          <div className="flex-1 space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-success"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      primaryStatistics
                        ? percentPaidOff
                        : 0,
                    ),
                  )}%`,
                }}
              />
            </div>

            <Row
              label="Principal Paid"
              dotClass="bg-success"
              value={
                primaryStatistics
                  ? fmtCurrency(
                      primaryStatistics.PRINCIPAL_PAID,
                    )
                  : "—"
              }
            />

            <Row
              label="Remaining Balance"
              dotClass="bg-border"
              value={
                primaryStatistics
                  ? fmtCurrency(
                      primaryStatistics.TOTAL_PRINCIPAL_OUTSTANDING,
                    )
                  : "—"
              }
            />

            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted">
                Original Loan Amount
              </span>

              <span className="font-medium text-foreground">
                {primaryStatistics
                  ? fmtCurrency(
                      primaryStatistics.ORIGINAL_LOAN_AMOUNT,
                    )
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* =====================================================
          ACCOUNTS
      ====================================================== */}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">
        Your Accounts
      </h2>

      <div className="space-y-4">
        {accounts.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-muted">
              No loan accounts found.
            </p>
          </Card>
        ) : (
          accounts.map((account) => {
            const statistics =
              statisticsByAccount.get(
                account.ACCT_NO,
              );

            return (
              <Card key={account.ACCT_NO}>
                {/* ACCOUNT HEADER */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {statistics?.ACCT_NM ||
                        account.PROD_DESC}
                    </h3>

                    <p className="mt-1 text-sm text-muted">
                      {account.PROD_DESC}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Account ••
                      {account.ACCT_NO.slice(-4)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statistics
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-muted"
                    }`}
                  >
                    {statistics
                      ? formatAccountStatus(
                          statistics.ACCOUNT_STATUS,
                        )
                      : "Unavailable"}
                  </span>
                </div>

                {/* ACCOUNT SUMMARY */}
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <Field
                    label="Balance"
                    value={
                      statistics
                        ? fmtCurrency(
                            statistics.TOTAL_OUTSTANDING_ALL,
                          )
                        : "—"
                    }
                  />

                  <Field
                    label="Rate"
                    value={
                      statistics
                        ? `${statistics.INTEREST_RATE}% fixed`
                        : "—"
                    }
                  />

                  <Field
                    label="Term"
                    value={
                      statistics
                        ? `${statistics.TERM_VALUE} ${
                            statistics.TERM_CD === "M"
                              ? "months"
                              : statistics.TERM_CD
                          }`
                        : "—"
                    }
                  />

                  <Field
                    label="Maturity"
                    value={
                      statistics
                        ? fmtDate(
                            statistics.MATURITY_DT,
                          )
                        : "—"
                    }
                  />
                </div>

                {/* VIEW ACCOUNT */}
              <Link
  href={`/loans/${account.ACCT_NO}/overview`}
  data-track-label={`View account:${account.ACCT_NO}`}
  className="mt-4 inline-block text-sm font-semibold text-foreground hover:underline"
>
  View account →
</Link>
              </Card>
            );
          })
        )}
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

    case "L":
      return "Closed";

    case "D":
      return "Dormant";

    default:
      return status || "Unknown";
  }
}

function Row({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted">
        <span
          className={`h-2 w-2 rounded-full ${dotClass}`}
        />

        {label}
      </span>

      <span className="font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted">
        {label}
      </div>

      <div className="font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function ProgressRing({
  percent,
}: {
  percent: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative h-[110px] w-[110px] shrink-0">
      <svg
        width="110"
        height="110"
        viewBox="0 0 100 100"
        className="-rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          strokeWidth="10"
          className="stroke-border"
          fill="none"
        />

        <circle
          cx="50"
          cy="50"
          r={r}
          strokeWidth="10"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-success"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">
          {percent}%
        </span>

        <span className="text-[10px] text-muted">
          paid off
        </span>
      </div>
    </div>
  );
}