import Link from "next/link";
import { Card, StatCard } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { LoanStatistics, LoanStatisticsResponse } from "@/types/loanSummary";
import ApiErrorDialog from "@/components/ApiDialog";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import CustomerAccountLink from "@/components/CustomerAccountLink";

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
  const ACCT_URL = process.env.NEXT_DATA_AUTH_URL;

  console.log("========================================");
  console.log("DASHBOARD API FLOW START");
  console.log("BASE_URL:", BASE_URL);

  const session = await getServerSession(authOptions);

  const email = session?.user?.email?.trim().toLowerCase() ?? "";

  console.log("Session email:", email);

  let custNum = "";
  let customerProfile = "";

  let accounts: LoanListItem[] = [];

  const statisticsByAccount = new Map<string, LoanStatistics>();

  let apiError = false;

  /*
   * =======================================================
   * 1. GET CUSTOMER INFORMATION
   * =======================================================
   */
  console.log("---- CUSTOMER INFO API ----");

  if (!email) {
    console.error("CUSTOMER INFO API NOT CALLED: No session email");
    apiError = true;
  } else if (!ACCT_URL) {
    console.error(
      "CUSTOMER INFO API NOT CALLED: NEXT_DATA_AUTH_URL is missing",
    );
    apiError = true;
  } else {
    try {
      const url = `${ACCT_URL}api/v1/auth/get-customer-info`;
      console.log("Calling:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });

      console.log("Customer info status:", response.status);

      const data = await response.json();
      console.log("Customer info response:", data);

      if (!response.ok) {
        throw new Error(`Customer info API returned ${response.status}`);
      }

      custNum = data.customer_no ?? "";
      customerProfile = data.profile?.trim().toUpperCase() ?? "";

      console.log("Customer number:", custNum);
      console.log("Customer profile:", customerProfile);
    } catch (error) {
      console.error("CUSTOMER INFO API ERROR:", error);
      apiError = true;
    }
  }

  /*
   * Linked = has customer number and profile is active (Y).
   * Unlinked = no customer_no and/or profile N → show account link UI.
   */
  const isLinked = Boolean(custNum) && customerProfile === "Y";
  const isUnlinked = !isLinked;

  /*
   * =======================================================
   * 2. GET CUSTOMER LOAN LIST (only when linked)
   * =======================================================
   */
  console.log("---- LOAN LIST API ----");

  if (!BASE_URL) {
    console.error("LOAN LIST API NOT CALLED: NEXT_DATA_API_URL is missing");
  } else if (!isLinked) {
    console.log("LOAN LIST API NOT CALLED: Profile not linked");
  } else {
    try {
      const url = `${BASE_URL}/loanList/loanListRestService/loanList?custNum=${encodeURIComponent(
        custNum,
      )}`;

      console.log("Calling:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      console.log("Loan list status:", response.status);

      const data: LoanListResponse = await response.json();
      console.log("Loan list response:", data);

      if (!response.ok) {
        throw new Error(`Loan list API returned ${response.status}`);
      }

      accounts = data.loanListdbReferenceOutput ?? [];
      console.log("Loan accounts:", accounts);
    } catch (error) {
      console.error("LOAN LIST API ERROR:", error);
      apiError = true;
    }
  }

  /*
   * =======================================================
   * 3. GET LOAN STATISTICS (only when linked)
   * =======================================================
   */
  console.log("---- LOAN STATISTICS API ----");

  // const primaryAccount =
  //   accounts.find((account) => account.REC_ST === "A") ?? accounts[0];

    /*
   * =======================================================
   * 3. GET LOAN STATISTICS (only when linked)
   * =======================================================
   */
  console.log("---- LOAN STATISTICS API ----");

  if (!BASE_URL) {
    console.error(
      "LOAN STATISTICS API NOT CALLED: NEXT_DATA_API_URL is missing",
    );
  } else if (!isLinked || accounts.length === 0) {
    console.log(
      "LOAN STATISTICS API NOT CALLED: Not linked or no loan accounts",
    );
  } else {
    const results = await Promise.all(
      accounts.map(async (account) => {
        try {
          const url = `${BASE_URL}/loanStatistics/loanStatisticsRestService/execute?acctNum=${encodeURIComponent(
            account.ACCT_NO,
          )}`;

          console.log("Calling statistics:", url);

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });

          console.log(
            `Statistics status [${account.ACCT_NO}]:`,
            response.status,
          );

          if (!response.ok) {
            throw new Error(`Loan statistics API returned ${response.status}`);
          }

          const data: LoanStatisticsResponse = await response.json();
          console.log(`Statistics response [${account.ACCT_NO}]:`, data);

          const statistics = data.loanstatisticsdbReferenceOutput?.[0] ?? null;

          return { accountNumber: account.ACCT_NO, statistics };
        } catch (error) {
          console.error(`Statistics API ERROR [${account.ACCT_NO}]:`, error);
          return { accountNumber: account.ACCT_NO, statistics: null };
        }
      }),
    );

    results.forEach(({ accountNumber, statistics }) => {
      if (statistics) {
        statisticsByAccount.set(accountNumber, statistics);
      }
    });

    if (accounts.length > 0 && statisticsByAccount.size === 0) {
      apiError = true;
    }
  }

  /*
   * =======================================================
   * AGGREGATE STATS (after map is filled)
   * =======================================================
   */
  const allStats = [...statisticsByAccount.values()];

  const sum = (pick: (s: LoanStatistics) => number) =>
    allStats.reduce((acc, s) => acc + (Number(pick(s)) || 0), 0);

  const hasStats = allStats.length > 0;

  const totalOutstanding = hasStats
    ? sum((s) => s.TOTAL_OUTSTANDING_ALL)
    : null;
  const nextPayment = hasStats ? sum((s) => s.TOTAL_DUE_NEXT) : null;
  const dueNow = hasStats ? sum((s) => s.TOTAL_DUE_NOW) : null;
  const principalPaid = hasStats ? sum((s) => s.PRINCIPAL_PAID) : 0;
  const originalLoanAmount = hasStats
    ? sum((s) => s.ORIGINAL_LOAN_AMOUNT)
    : 0;
  const remainingPrincipal = hasStats
    ? sum((s) => s.TOTAL_PRINCIPAL_OUTSTANDING)
    : 0;

  const percentPaidOff =
    originalLoanAmount > 0
      ? Math.round((principalPaid / originalLoanAmount) * 100)
      : 0;

  const statusLabel =
    allStats.length === 1
      ? formatAccountStatus(allStats[0].ACCOUNT_STATUS)
      : allStats.length > 1
        ? `${allStats.length} accounts`
        : null;

  // console.log("========================================");
  // console.log("DASHBOARD API FLOW END");
  // console.log("Final customer number:", custNum);
  // console.log("Linked:", isLinked);
  // console.log("Final accounts:", accounts.length);
  // console.log("========================================");
  // const primaryStatistics = primaryAccount
  // ? statisticsByAccount.get(primaryAccount.ACCT_NO)
  // : null;

  // const totalOutstanding = primaryStatistics?.TOTAL_OUTSTANDING_ALL ?? null;
  // const nextPayment = primaryStatistics?.TOTAL_DUE_NEXT ?? null;
  // const dueNow = primaryStatistics?.TOTAL_DUE_NOW ?? null;

  // const percentPaidOff =
  // primaryStatistics && primaryStatistics.ORIGINAL_LOAN_AMOUNT > 0
  // ? Math.round(
  //   (primaryStatistics.PRINCIPAL_PAID /
  //     primaryStatistics.ORIGINAL_LOAN_AMOUNT) *
  //     100,
  //   )
  //   : 0;
  //   console.log(primaryStatistics);

  return (
    <div>
      <ApiErrorDialog
        open={apiError}
        message="We are unable to retrieve your latest loan information at the moment. Please check your internet connection and try again."
      />

      <p className="text-sm text-primary">Welcome back</p>

      <h1 className="mt-1 text-2xl font-semibold text-foreground">
        Your Loan Portfolio
      </h1>

      {/* =====================================================
          SUMMARY
      ====================================================== */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding"
          value={
            isLinked && totalOutstanding !== null
              ? fmtCurrency(totalOutstanding)
              : "—"
          }
        />
        <StatCard
          label="Total Due Next"
          value={
            isLinked && nextPayment !== null ? fmtCurrency(nextPayment) : "—"
          }
        />
        <StatCard
          label="Total Due Now"
          value={isLinked && dueNow !== null ? fmtCurrency(dueNow) : "—"}
        />
        <StatCard
          label="Status"
          value={
            isLinked && statusLabel
              ? statusLabel
              : isUnlinked
                ? "Not linked"
                : "—"
          }
        />
      </div>

      {/* =====================================================
          UNLINKED → account link
          LINKED   → loan progress
      ====================================================== */}
      {isUnlinked ? (
        <Card className="mt-6">
          <CustomerAccountLink email={email} />
        </Card>
      ) : (
        <Card className="mt-6">
          <h2 className="font-semibold text-foreground">Loan Progress</h2>
          <p className="mt-1 text-sm text-muted">
            {allStats.length > 0
              ? `${percentPaidOff}% of total principal paid off`
              : "Loan progress information unavailable"}
          </p>

          <div className="mt-6 flex items-center gap-8">
            <ProgressRing percent={allStats.length > 0 ? percentPaidOff : 0} />

            <div className="flex-1 space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-success"
                  style={{
                    width: `${Math.min(100, Math.max(0, percentPaidOff))}%`,
                  }}
                />
              </div>

              <Row
                label="Principal Paid"
                dotClass="bg-success"
                value={allStats.length > 0 ? fmtCurrency(principalPaid) : "—"}
              />
              <Row
                label="Remaining Balance"
                dotClass="bg-border"
                value={
                  allStats.length > 0 ? fmtCurrency(remainingPrincipal) : "—"
                }
              />
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted">Original Loan Amount</span>
                <span className="font-medium text-foreground">
                  {allStats.length > 0 ? fmtCurrency(originalLoanAmount) : "—"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* =====================================================
          ACCOUNTS (linked only)
      ====================================================== */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">
        Your Accounts
      </h2>

      <div className="space-y-4">
        {isUnlinked ? (
          <Card>
            <p className="py-4 text-center text-sm text-muted">
              Link your account above to see your loan accounts here.
            </p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-muted">
              No loan accounts found.
            </p>
          </Card>
        ) : (
          accounts.map((account) => {
            const statistics = statisticsByAccount.get(account.ACCT_NO);

            return (
              <Card key={account.ACCT_NO}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">
                      {statistics?.ACCT_NM || account.PROD_DESC}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {account.PROD_DESC}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Account ••{account.ACCT_NO.slice(-4)}
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
                      ? formatAccountStatus(statistics.ACCOUNT_STATUS)
                      : "Unavailable"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <Field
                    label="Balance"
                    value={
                      statistics
                        ? fmtCurrency(statistics.TOTAL_OUTSTANDING_ALL)
                        : "—"
                    }
                  />
                  <Field
                    label="Rate"
                    value={
                      statistics ? `${statistics.INTEREST_RATE}% fixed` : "—"
                    }
                  />
                  <Field
                    label="Term"
                    value={
                      statistics
                        ? `${statistics.TERM_VALUE} ${
                            statistics.TERM_CD === "M"
                              ? "Months"
                                : statistics.TERM_CD === "Y"
                              ? "Years"
                              : statistics.TERM_CD
                          }`
                        : "—"
                    }
                  />
                  <Field
                    label="Maturity"
                    value={statistics ? fmtDate(statistics.MATURITY_DT) : "—"}
                  />
                </div>

                <Link
                  href={`/loans/${account.ACCT_NO}/overview`}
                  data-track-label={`View account:${account.ACCT_NO}`}
                  className="mt-4 inline-block text-sm font-semibold text-primary hover:underline hover:text-hover"
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
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />

        {label}
      </span>

      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>

      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
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
        <span className="text-xl font-bold text-foreground">{percent}%</span>

        <span className="text-[10px] text-muted">paid off</span>
      </div>
    </div>
  );
}
