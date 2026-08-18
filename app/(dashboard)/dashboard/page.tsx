import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, StatCard } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode } from "react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const loans = await prisma.loanAccount.findMany({
    where: { userId: (session!.user as any).id },
    orderBy: { createdAt: "desc" },
  });

  const totalOutstanding = loans.reduce((sum: any, l: { principal: any; accruedInterest: any; lateFees: any; }) => sum + l.principal + l.accruedInterest + l.lateFees, 0);
  const primary = loans[0];
  const percentPaidOff = primary
    ? Math.round(((primary.originalAmount - primary.principal) / primary.originalAmount) * 100)
    : 0;

  return (
    <div>
      <p className="text-sm text-muted">Welcome back</p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">Your Loan Portfolio</h1>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard label="Total Outstanding" value={fmtCurrency(totalOutstanding)} />
        <StatCard label="Next Payment" value={fmtCurrency(primary?.monthlyPayment ?? 0)} />
        <StatCard label="Due Date" value={primary ? fmtDate(nextDueDate(primary.originationDate)) : "—"} />
        <StatCard label="Status" value={primary?.status ?? "—"} />
      </div>

      {primary && (
        <Card className="mt-6">
          <h2 className="font-semibold text-foreground">Loan Progress</h2>
          <p className="mt-1 text-sm text-muted">
            {percentPaidOff}% of total principal paid off across your active loans.
          </p>

          <div className="mt-6 flex items-center gap-8">
            <ProgressRing percent={percentPaidOff} />
            <div className="flex-1 space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full bg-success" style={{ width: `${percentPaidOff}%` }} />
              </div>
              <Row label="Principal Paid" dotClass="bg-success" value={fmtCurrency(primary.originalAmount - primary.principal)} />
              <Row label="Remaining Balance" dotClass="bg-border" value={fmtCurrency(primary.principal)} />
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted">Original Loan Amount</span>
                <span className="font-medium text-foreground">{fmtCurrency(primary.originalAmount)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">Your Accounts</h2>
      <div className="space-y-4">
        {loans.map((loan: { id: Key | null | undefined; nickname: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; accountNumber: string | any[]; status: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; principal: any; accruedInterest: any; interestRate: any; monthlyPayment: number; originationDate: Date; }) => (
          <Card key={loan.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{loan.nickname}</h3>
                <p className="text-xs text-muted">Account ••{loan.accountNumber.slice(-4)}</p>
              </div>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                {loan.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <Field label="Balance" value={fmtCurrency(loan.principal + loan.accruedInterest)} />
              <Field label="Rate" value={`${loan.interestRate}% fixed`} />
              <Field label="Monthly" value={fmtCurrency(loan.monthlyPayment)} />
              <Field label="Next due" value={fmtDate(nextDueDate(loan.originationDate))} />
            </div>

            <Link
              href={`/loans/${loan.id}/overview`}
              data-track-label={`View details:${loan.nickname}`}
              className="mt-4 inline-block text-sm font-semibold text-foreground hover:underline"
            >
              View details →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

function nextDueDate(origination: Date) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), origination.getDate());
  if (d < now) d.setMonth(d.getMonth() + 1);
  return d;
}

function Row({ label, value, dotClass }: { label: string; value: string; dotClass: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} /> {label}
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
      <svg width="110" height="110" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} strokeWidth="10" className="stroke-border" fill="none" />
        <circle
          cx="50" cy="50" r={r} strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
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
