"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { fmtDateInput } from "@/lib/format";

type Allocation = "standard" | "principal_only" | "custom";

export default function MakePaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const standardAmount = 547.32;
  const [allocation, setAllocation] = useState<Allocation>("standard");
  const [amount, setAmount] = useState(standardAmount.toString());
  const [date, setDate] = useState(fmtDateInput(new Date()));
  const [method, setMethod] = useState("Primary Checking ••4471 (Default)");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectAllocation(next: Allocation) {
    setAllocation(next);
    if (next === "standard") setAmount(standardAmount.toString());
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/loans/${params.id}/payments`, {
        method,
        allocation,
        amount: parseFloat(amount),
        scheduledAt: new Date(date).toISOString(),
      });
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Couldn't process that payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-3 font-semibold text-foreground">Make a Payment</h2>
      <Card>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Payment method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-brand border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option>Primary Checking ••4471 (Default)</option>
              <option>Savings ••2210</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Payment date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-brand border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Allocation</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["standard", "Standard Monthly"],
                  ["principal_only", "Principal-Only"],
                  ["custom", "Custom Amount"],
                ] as [Allocation, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-track-label={`Allocation:${label}`}
                  onClick={() => selectAllocation(key)}
                  className={`rounded-brand border px-3 py-2 text-sm font-medium transition-colors ${
                    allocation === key
                      ? "border-foreground bg-muted/10 text-foreground"
                      : "border-border text-muted hover:bg-muted/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                disabled={allocation === "standard"}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-brand border border-border py-2.5 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted/5"
              />
            </div>
            {allocation === "standard" && (
              <p className="mt-1 text-xs text-muted">Your standard monthly payment of ${standardAmount.toFixed(2)}.</p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">Payment submitted successfully.</p>}

          <Button
            className="w-full"
            trackLabel="Submit payment"
            disabled={loading}
            onClick={submit}
          >
            {loading ? "Submitting…" : `Submit $${parseFloat(amount || "0").toFixed(2)} Payment`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
