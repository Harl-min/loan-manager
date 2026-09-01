import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";

type LoanAccountHistory = {
  DebitAmt: number;
  TransactionReference: string;
  TransactionDescription: string;
  LoanAccount: string;
  Amount: number;
  CreditAmt: number;
  ClearedBalance: number;
  EventCode: string;
  ChannelDescription: string;
  LedgerBalance: number;
  BusinessUnit: string;
  Currency: string;
  ValueDate: string;
  DateTimestamp: string;
  DrCr: "DR" | "CR";
  ChequeNo: string;
  EventDescription: string;
  TransactionDate: string;
};

type LoanAccountHistoryResponse = {
  loanAccountHistoryBusinessServiceOutput: LoanAccountHistory[];
};

export default async function TransactionsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  const accountNo = params.id;
  const BASE_URL = process.env.NEXT_DATA_API_URL;

  let transactions: LoanAccountHistory[] = [];
  let apiError = false;
  

  if (BASE_URL && accountNo) {

  try {
    const response = await fetch(
      `${BASE_URL}/loanAccountHistory/loanAccountHistoryRestService/loanAccountHistory?LoanAccountNo=${encodeURIComponent(
        accountNo,
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
      throw new Error(`Loan account history API returned ${response.status}`);
    }

    const data: LoanAccountHistoryResponse = await response.json();

    transactions = data.loanAccountHistoryBusinessServiceOutput ?? [];
 if (!data) {
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
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Activity History</h2>

        <div className="flex items-center gap-2">
          <select className="rounded-brand border border-border px-3 py-1.5 text-sm text-muted">
            <option>All time</option>
          </select>

          <select className="rounded-brand border border-border px-3 py-1.5 text-sm text-muted">
            <option>All types</option>
          </select>

          <DownloadCsvButton
            filename={`${accountNo}-transactions.csv`}
            rows={transactions.map((t) => ({
              date: fmtDate(t.TransactionDate),
              label: t.EventDescription || t.TransactionDescription,
              reference: t.TransactionReference,
              amount: t.DrCr === "CR" ? t.Amount : -t.Amount,
            }))}
          />
        </div>
      </div>

      <Card className="mt-4 divide-y divide-border p-0">
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted">
            No transaction history found.
          </div>
        ) : (
          transactions.map((t) => {
            const isCredit = t.DrCr === "CR";
            const amount = isCredit ? t.Amount : -t.Amount;

            return (
              <div
                key={t.TransactionReference}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isCredit ? "bg-success" : "bg-primary"
                    }`}
                  />

                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {t.EventDescription || t.TransactionDescription}
                    </div>

                    <div className="text-xs text-muted">
                      {fmtDate(t.TransactionDate)}
                      {t.TransactionReference
                        ? ` • ${t.TransactionReference}`
                        : ""}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-sm font-semibold ${
                    isCredit ? "text-success" : "text-foreground"
                  }`}
                >
                  {isCredit ? "+" : "-"}
                  {fmtCurrency(Math.abs(amount))}
                </div>
              </div>
            );
          })
        )}
      </Card>
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
