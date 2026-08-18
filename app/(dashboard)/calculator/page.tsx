"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

const terms = [3, 5, 10, 15, 30];

export default function CalculatorPage() {
  const [amount, setAmount] = useState(25000);
  const [rate, setRate] = useState(6.49);
  const [years, setYears] = useState(5);

  const { monthly, totalInterest, totalPaid, breakdown } = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    const n = years * 12;
    const payment =
      monthlyRate === 0
        ? amount / n
        : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

    let balance = amount;
    const rows: { month: number; principal: number; interest: number; balance: number }[] = [];
    const today = new Date();
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interest = balance * monthlyRate;
      const principalPortion = payment - interest;
      balance = Math.max(0, balance - principalPortion);
      rows.push({ month: i, principal: principalPortion, interest, balance });
    }

    return {
      monthly: payment,
      totalInterest: payment * n - amount,
      totalPaid: payment * n,
      breakdown: rows,
    };
  }, [amount, rate, years]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Loan Calculator</h1>
      <p className="mt-1 text-sm text-muted">
        Estimate your monthly payment by adjusting the loan amount, interest rate, and term.
      </p>

      <div className="mt-6 grid grid-cols-[1fr_320px] gap-4">
        <Card className="space-y-6">
          <SliderField
            label="Loan Amount"
            icon="$"
            min={1000}
            max={200000}
            step={500}
            value={amount}
            onChange={setAmount}
          />
          <SliderField
            label="Interest Rate (APR %)"
            icon="%"
            min={0}
            max={25}
            step={0.01}
            value={rate}
            onChange={setRate}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Loan Term</label>
            <div className="flex gap-2">
              {terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-track-label={`Loan term:${t}yr`}
                  onClick={() => setYears(t)}
                  className={clsx(
                    "rounded-brand border px-4 py-2 text-sm font-medium",
                    years === t
                      ? "border-foreground bg-muted/10 text-foreground"
                      : "border-border text-muted hover:bg-muted/10"
                  )}
                >
                  {t} yr
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="rounded-brand bg-primary p-6 text-primary-foreground">
          <div className="text-sm opacity-80">Estimated Monthly Payment</div>
          <div className="mt-1 text-3xl font-bold">{fmtCurrency(monthly)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-brand bg-white/10 p-3">
              <div className="text-xs opacity-80">Total Interest</div>
              <div className="mt-1 font-semibold">{fmtCurrency(totalInterest)}</div>
            </div>
            <div className="rounded-brand bg-white/10 p-3">
              <div className="text-xs opacity-80">Total Paid</div>
              <div className="mt-1 font-semibold">{fmtCurrency(totalPaid)}</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-6 p-0">
        <h3 className="border-b border-border p-6 font-semibold text-foreground">
          First-Year Payment Breakdown
        </h3>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                <th className="px-6 py-2 text-left font-medium">Month</th>
                <th className="px-6 py-2 text-right font-medium">Principal</th>
                <th className="px-6 py-2 text-right font-medium">Interest</th>
                <th className="px-6 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.month} className="border-t border-border">
                  <td className="px-6 py-2.5 text-muted">{r.month}</td>
                  <td className="px-6 py-2.5 text-right">{fmtCurrency(r.principal)}</td>
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
    </div>
  );
}

function SliderField({
  label,
  icon,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted">{icon}</span> {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 accent-current"
          data-track-label={`Slider:${label}`}
        />
        <div className="relative w-28">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">
            {icon === "$" ? "$" : ""}
          </span>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={clsx(
              "w-full rounded-brand border border-border py-1.5 text-sm",
              icon === "$" ? "pl-5 pr-2" : "px-2"
            )}
          />
        </div>
      </div>
    </div>
  );
}
