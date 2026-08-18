import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";

export default async function TransactionsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session!.user as any).id },
    include: { transactions: { orderBy: { date: "desc" } } },
  });
  if (!loan) notFound();

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
            filename={`${loan.nickname.replace(/\s+/g, "-").toLowerCase()}-transactions.csv`}
            rows={loan.transactions.map((t) => ({
              date: fmtDate(t.date),
              label: t.label,
              reference: t.reference ?? "",
              amount: t.amount,
            }))}
          />
        </div>
      </div>

      <Card className="mt-4 divide-y divide-border p-0">
        {loan.transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  t.type === "payment" ? "bg-success" : t.type === "fee_waived" ? "bg-warning" : "bg-primary"
                }`}
              />
              <div>
                <div className="text-sm font-medium text-foreground">{t.label}</div>
                <div className="text-xs text-muted">
                  {fmtDate(t.date)}
                  {t.reference ? ` • ${t.reference}` : ""}
                </div>
              </div>
            </div>
            <div className={`text-sm font-semibold ${t.amount < 0 ? "text-foreground" : "text-success"}`}>
              {t.amount < 0 ? "-" : "+"}
              {fmtCurrency(Math.abs(t.amount))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
