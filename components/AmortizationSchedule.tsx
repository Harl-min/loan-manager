"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";

export default function AmortizationSchedule({
  principal,
  annualRate,
  monthlyPayment,
  remainingMonths,
}: {
  principal: number;
  annualRate: number;
  monthlyPayment: number;
  remainingMonths: number;
}) {
  const [extra, setExtra] = useState(0);

  const rows = useMemo(() => {
    const monthlyRate = annualRate / 100 / 12;
    let balance = principal;
    const out: { n: number; date: Date; payment: number; interest: number; balance: number }[] = [];
    const today = new Date();

    for (let i = 1; i <= remainingMonths && balance > 0.005; i++) {
      const interest = balance * monthlyRate;
      let payment = monthlyPayment + extra;
      let principalPortion = payment - interest;
      if (principalPortion > balance) {
        principalPortion = balance;
        payment = principalPortion + interest;
      }
      balance = Math.max(0, balance - principalPortion);

      const date = new Date(today.getFullYear(), today.getMonth() + i, 15);
      out.push({ n: i, date, payment, interest, balance });
    }
    return out;
  }, [principal, annualRate, monthlyPayment, extra, remainingMonths]);

  return (
    <Card className="p-0">
      <div className="border-b border-border p-6">
        <h3 className="font-semibold text-foreground">&quot;What-If&quot; Calculator</h3>
        <label className="mt-3 block text-sm font-medium text-foreground">Extra monthly payment</label>
        <div className="relative mt-1.5 w-40">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            type="number"
            min={0}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value) || 0)}
            className="w-full rounded-brand border border-border py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-xs text-muted">
            <tr>
              <th className="px-6 py-2 text-left font-medium">#</th>
              <th className="px-6 py-2 text-left font-medium">Date</th>
              <th className="px-6 py-2 text-right font-medium">Payment</th>
              <th className="px-6 py-2 text-right font-medium">Interest</th>
              <th className="px-6 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className="border-t border-border">
                <td className="px-6 py-2.5 text-muted">{r.n}</td>
                <td className="px-6 py-2.5">{fmtDate(r.date)}</td>
                <td className="px-6 py-2.5 text-right">{fmtCurrency(r.payment)}</td>
                <td className="px-6 py-2.5 text-right text-muted">{fmtCurrency(r.interest)}</td>
                <td className="px-6 py-2.5 text-right font-semibold text-foreground">
                  {fmtCurrency(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
