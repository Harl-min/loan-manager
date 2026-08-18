import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import PayoffCalculator from "@/components/PayoffCalculator";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default async function OverviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session!.user as any).id },
  });
  if (!loan) notFound();

  const totalBalance = loan.principal + loan.accruedInterest + loan.lateFees + loan.escrow;

  return (
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

      <PayoffCalculator
        loanId={loan.id}
        currentBalance={totalBalance}
        dailyInterestRate={loan.dailyInterestRate}
      />

      <div className="flex gap-3">
        <Link href={`/loans/${loan.id}/payment`}>
          <Button trackLabel="Make a Payment">Make a Payment</Button>
        </Link>
        <Link href={`/loans/${loan.id}/transactions`}>
          <Button variant="secondary" trackLabel="View Transactions">
            View Transactions
          </Button>
        </Link>
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
