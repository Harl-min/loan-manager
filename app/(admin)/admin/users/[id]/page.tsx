"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, StatCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

type Loan = {
  id: string;
  nickname: string;
  accountNumber: string;
  status: string;
  originalAmount: number;
  principal: number;
  accruedInterest: number;
  interestRate: number;
  monthlyPayment: number;
};

type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  role: "BORROWER" | "ADMIN";
  isBlocked: boolean;
  emailVerified: boolean;
  phone: string | null;
  mailingAddress: string | null;
  createdAt: string;
  loans: Loan[];
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get<{ user: CustomerDetail }>(`/admin/users/${params.id}`);
    setCustomer(res.user);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!customer) return <p className="text-sm text-muted">Loading…</p>;

  async function saveProfile() {
    if (!customer) return;
    setSaving(true);
    await api.patch(`/admin/users/${customer.id}`, {
      name: customer.name,
      phone: customer.phone ?? "",
      mailingAddress: customer.mailingAddress ?? "",
    });
    setSaving(false);
    setSavedMsg("Profile saved.");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  async function toggleBlock() {
    if (!customer) return;
    setBusy(true);
    await api.patch(`/admin/users/${customer.id}`, { isBlocked: !customer.isBlocked });
    await load();
    setBusy(false);
  }

  const totalOutstanding = customer.loans.reduce((s, l) => s + l.principal + l.accruedInterest, 0);

  return (
    <div>
      <button
        data-track-label="Back to users"
        onClick={() => router.push("/admin/users")}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to users
      </button>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted">
            {customer.email} • {customer.role}
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            customer.isBlocked ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
          )}
        >
          {customer.isBlocked ? "Blocked" : "Active"}
        </span>
      </div>

      {/* -- Add/Modify Customer Profile -- */}
      <Card className="mt-6">
        <h2 className="font-semibold text-foreground">Customer Profile</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <Input label="Email" value={customer.email} disabled />
          <Input
            label="Phone"
            value={customer.phone ?? ""}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
          <Input
            label="Mailing address"
            value={customer.mailingAddress ?? ""}
            onChange={(e) => setCustomer({ ...customer, mailingAddress: e.target.value })}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button trackLabel="Save customer profile" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            variant={customer.isBlocked ? "secondary" : "outline"}
            trackLabel={customer.isBlocked ? "Unblock customer" : "Block customer"}
            onClick={toggleBlock}
            disabled={busy}
          >
            {customer.isBlocked ? "Unblock account" : "Block account"}
          </Button>
          {savedMsg && <span className="text-sm text-success">{savedMsg}</span>}
        </div>
      </Card>

      {/* -- View Customer Dashboard: Portfolio/Overview -- */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">Loan Portfolio</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Outstanding" value={fmtCurrency(totalOutstanding)} />
        <StatCard label="Active Loans" value={String(customer.loans.length)} />
        <StatCard
          label="Status"
          value={customer.loans.every((l) => l.status === "Current") ? "Current" : "Attention"}
        />
      </div>

      <div className="mt-4 space-y-4">
        {customer.loans.map((loan) => (
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
              <Field label="Original" value={fmtCurrency(loan.originalAmount)} />
            </div>
            <Link
              href={`/admin/users/${customer.id}/loans/${loan.id}`}
              data-track-label={`Admin view loan:${loan.nickname}`}
              className="mt-4 inline-block text-sm font-semibold text-foreground hover:underline"
            >
              View loan details →
            </Link>
          </Card>
        ))}
        {customer.loans.length === 0 && (
          <p className="text-sm text-muted">This customer has no loans on file yet.</p>
        )}
      </div>
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
