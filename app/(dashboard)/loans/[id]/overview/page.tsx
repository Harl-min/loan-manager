import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import {
  LoanStatistics,
  LoanStatisticsResponse,
} from "@/types/loanSummary";

export default async function OverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const accountNo = params.id;
  const BASE_URL = process.env.NEXT_DATA_API_URL;

  let statistics: LoanStatistics | null = null;
  let apiError = false;

  if (BASE_URL && accountNo) {
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

      if (!response.ok) {
        throw new Error(
          `Loan statistics API returned ${response.status}`
        );
      }

      const data: LoanStatisticsResponse =
        await response.json();

      statistics =
        data.loanstatisticsdbReferenceOutput?.[0] ?? null;

      if (!statistics) {
        apiError = true;
      }
    } catch (error) {
      console.error(
        `Failed to fetch loan statistics for ${accountNo}:`,
        error
      );

      apiError = true;
    }
  } else {
    apiError = true;
  }

  return (
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

            <div className="mt-1 text-xs text-muted">
              {statistics?.STATUS_EFFECTIVE_DT
                ? `Originated ${fmtDate(
                    statistics.STATUS_EFFECTIVE_DT
                  )}`
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
                ? `${statistics.TERM_VALUE} Months`
                : "—"}
            </div>

            <div className="mt-1 text-xs text-muted">
              {statistics?.MATURITY_DT
                ? `Matures ${fmtDate(
                    statistics.MATURITY_DT
                  )}`
                : "—"}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-muted">
              Next Payment Due
            </div>

            <div className="mt-1 text-lg font-semibold text-foreground">
              {statistics
                ? fmtCurrency(statistics.TOTAL_DUE_NEXT)
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
              statistics?.TOTAL_PRINCIPAL_OUTSTANDING ?? null
            }
          />

          <BreakdownRow
            label="Interest Outstanding"
            value={
              statistics?.TOTAL_INTEREST_OUTSTANDING ?? null
            }
          />

          <BreakdownRow
            label="Charges"
            value={
              statistics?.TOTAL_CHRGS ?? null
            }
          />

          <BreakdownRow
            label="Total Due Now"
            value={
              statistics?.TOTAL_DUE_NOW ?? null
            }
          />

          <div className="flex items-center justify-between px-6 py-3 font-semibold text-foreground">
            <span>Total Outstanding</span>

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

      {/* PAYMENT INFORMATION */}
      <div className="grid grid-cols-2 gap-4">

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

      </div>

      {/* API UNAVAILABLE */}
      {apiError && (
        <Card className="border border-warning/30 bg-warning/10">
          <div className="text-sm font-medium text-foreground">
            Loan information unavailable
          </div>

          <p className="mt-1 text-sm text-muted">
            We could not retrieve the latest information
            for this account. Please try again later.
          </p>
        </Card>
      )}

    </div>
  );
}

function BreakdownRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm">
      <span className="text-muted">
        {label}
      </span>

      <span className="font-medium text-foreground">
        {value !== null
          ? fmtCurrency(value)
          : "—"}
      </span>
    </div>
  );
}