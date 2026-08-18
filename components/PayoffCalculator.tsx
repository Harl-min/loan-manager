"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fmtCurrency, fmtDate, fmtDateInput } from "@/lib/format";

export default function PayoffCalculator({
  loanId,
  currentBalance,
  dailyInterestRate,
}: {
  loanId: string;
  currentBalance: number;
  dailyInterestRate: number;
}) {
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 6);

  const [date, setDate] = useState(fmtDateInput(defaultDate));
  const [result, setResult] = useState<{ amount: number; days: number; label: string } | null>(null);

  function calculate() {
    const target = new Date(date);
    const today = new Date();
    let days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) days = 0;
    const amount = currentBalance + days * dailyInterestRate;
    setResult({ amount, days, label: fmtDate(target) });
  }

  return (
    <Card>
      <h3 className="font-semibold text-foreground">Payoff Quote Generator</h3>
      <p className="mt-1 text-sm text-muted">
        Select a future date to calculate the exact payoff amount, including daily interest of{" "}
        {fmtCurrency(dailyInterestRate)}/day.
      </p>

      <div className="mt-4 flex items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Payoff date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-brand border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button trackLabel="Calculate payoff" onClick={calculate}>
          Calculate
        </Button>
      </div>

      {result && (
        <div className="mt-4 rounded-brand bg-muted/10 p-4">
          <div className="text-xs text-muted">Payoff amount for {result.label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{fmtCurrency(result.amount)}</div>
          <div className="mt-1 text-xs text-muted">
            {result.days} days of accrued interest (adjusted to next business day — weekends not
            processed)
          </div>
        </div>
      )}
    </Card>
  );
}
