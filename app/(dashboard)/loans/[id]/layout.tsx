import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtCurrency } from "@/lib/format";
import LoanTabs from "@/components/LoanTabs";

export default async function LoanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session!.user as any).id },
  });
  if (!loan) notFound();

  return (
    <div>
      <Link href="/dashboard" data-track-label="Back to dashboard" className="text-sm text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{loan.nickname}</h1>
          <p className="text-sm text-muted">
            Account {loan.accountNumber} • {loan.interestRate}% fixed
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Current Balance</div>
          <div className="text-xl font-bold text-foreground">
            {fmtCurrency(loan.principal + loan.accruedInterest + loan.lateFees)}
          </div>
        </div>
      </div>

      <LoanTabs loanId={loan.id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
