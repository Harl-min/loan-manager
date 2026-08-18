"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import AmortizationSchedule from "@/components/AmortizationSchedule";

type Transaction = {
  id: string;
  label: string;
  reference: string | null;
  amount: number;
  date: string;
  type: string;
};

type LoanDetail = {
  id: string;
  nickname: string;
  accountNumber: string;
  status: string;
  originalAmount: number;
  interestRate: number;
  termMonths: number;
  originationDate: string;
  maturityDate: string;
  monthlyPayment: number;
  principal: number;
  accruedInterest: number;
  lateFees: number;
  escrow: number;
  ytdInterestPaid: number;
  ytdPrincipalPaid: number;
  transactions: Transaction[];
  user: { id: string; name: string; email: string };
};

const tabs = ["Details", "Transactions", "Schedule"] as const;

export default function AdminLoanDetailPage() {
  const params = useParams<{ id: string; loanId: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Details");

  useEffect(() => {
    api.get<{ loan: LoanDetail }>(`/admin/loans/${params.loanId}`).then((r) => setLoan(r.loan));
  }, [params.loanId]);

  if (!loan) return <p className="text-sm text-muted">Loading…</p>;

  const totalBalance = loan.principal + loan.accruedInterest + loan.lateFees + loan.escrow;

  return (
    <div>
      <button
        data-track-label="Back to customer"
        onClick={() => router.push(`/admin/users/${params.id}`)}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to {loan.user.name}
      </button>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{loan.nickname}</h1>
          <p className="text-sm text-muted">
            Account {loan.accountNumber} • {loan.interestRate}% fixed • {loan.user.email}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Current Balance</div>
          <div className="text-xl font-bold text-foreground">{fmtCurrency(totalBalance)}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-b border-border text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            data-track-label={`Admin loan tab:${t}`}
            onClick={() => setTab(t)}
            className={clsx(
              "-mb-px border-b-2 pb-3 font-medium transition-colors",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Details" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 font-semibold text-foreground">Contract Details</h2>
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-xs text-muted">Original Amount</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(loan.originalAmount)}</div>
                  <div className="mt-1 text-xs text-muted">Originated {fmtDate(loan.originationDate)}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted">Interest Rate</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{loan.interestRate}%</div>
                  <div className="mt-1 text-xs text-muted">Fixed rate</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted">Term</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{loan.termMonths} months</div>
                  <div className="mt-1 text-xs text-muted">Matures {fmtDate(loan.maturityDate)}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted">Monthly Payment</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(loan.monthlyPayment)}</div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-semibold text-foreground">Balance Breakdown</h2>
              <Card className="divide-y divide-border p-0">
                <BreakdownRow label="Principal" value={loan.principal} />
                <BreakdownRow label="Accrued Interest" value={loan.accruedInterest} />
                <BreakdownRow label="Late Fees" value={loan.lateFees} />
                <BreakdownRow label="Escrow" value={loan.escrow} />
                <div className="flex items-center justify-between px-6 py-3 font-semibold text-foreground">
                  <span>Total Balance</span>
                  <span>{fmtCurrency(totalBalance)}</span>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <div className="text-xs text-muted">YTD Interest Paid</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(loan.ytdInterestPaid)}</div>
              </Card>
              <Card>
                <div className="text-xs text-muted">YTD Principal Paid</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(loan.ytdPrincipalPaid)}</div>
              </Card>
            </div>
          </div>
        )}

        {tab === "Transactions" && (
          <Card className="divide-y divide-border p-0">
            {loan.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "h-2 w-2 rounded-full",
                      t.type === "payment" ? "bg-success" : t.type === "fee_waived" ? "bg-warning" : "bg-primary"
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">{t.label}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(t.date)}
                      {t.reference ? ` • ${t.reference}` : ""}
                    </div>
                  </div>
                </div>
                <div className={clsx("text-sm font-semibold", t.amount < 0 ? "text-foreground" : "text-success")}>
                  {t.amount < 0 ? "-" : "+"}
                  {fmtCurrency(Math.abs(t.amount))}
                </div>
              </div>
            ))}
            {loan.transactions.length === 0 && (
              <p className="px-6 py-6 text-center text-sm text-muted">No transactions yet.</p>
            )}
          </Card>
        )}

        {tab === "Schedule" && (
          <AmortizationSchedule
            principal={loan.principal}
            annualRate={loan.interestRate}
            monthlyPayment={loan.monthlyPayment}
            remainingMonths={Math.max(
              1,
              Math.round((new Date(loan.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44))
            )}
          />
        )}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{fmtCurrency(value)}</span>
    </div>
  );
}
