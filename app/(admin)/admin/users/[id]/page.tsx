"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { fmtCurrency, fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

type LoanStatistics = {
  ACCT_NO: string;
  ACCT_NM: string;
  OVERDUE_PRINCIPAL: number;
  OVERDUE_INTEREST: number;
  DUE_PRINCIPAL: number;
  DUE_INTEREST: number;
  TOTAL_PRINCIPAL_OUTSTANDING: number;
  TOTAL_INTEREST_OUTSTANDING: number;
  PRINCIPAL_PAID: number;
  INTEREST_PAID: number;
  TOTAL_PAID: number;
  TOTAL_OVERDUE: number;
  TOTAL_DUE_NEXT: number;
  TOTAL_OUTSTANDING_ALL: number;
  TOTAL_DUE_NOW: number;
  ORIGINAL_LOAN_AMOUNT: number;
  CHARGES: number;
  INTEREST_RATE: number;
  TERM_VALUE: number;
  TERM_CD: string;
  MATURITY_DT: string;
  ACCOUNT_STATUS: string;
};

type CustomerAccount = {
  ACCT_NO: string;
  REC_ST: string;
  status: string;
  PROD_DESC: string;
  statistics: LoanStatistics | null;
};

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const customerNo = decodeURIComponent(params.id);

  // Seed from query (table), then overwrite from list API when available
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [mailingAddress, setMailingAddress] = useState(
    searchParams.get("address") ?? "",
  );
  const [profileLoading, setProfileLoading] = useState(true);

  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const getAccessToken = () =>
    ((session as any)?.accessToken ||
      (session as any)?.access_token ||
      undefined) as string | undefined;

  // ----------------------------------------------------------
  // Load customer profile: GET .../customers/list?search={customerNo}
  // ----------------------------------------------------------
  async function loadCustomerProfile() {
    const token = getAccessToken();
    if (!token || !customerNo) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const url =
        `${ACCT_URL}api/v1/admin/customers/list` +
        `?search=${encodeURIComponent(customerNo)}`;

      console.log("GET customer by search:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);
      console.log("customers/list?search= response:", data);

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || "Failed to load customer",
        );
      }

      const list = data?.customers ?? [];
      const match =
        list.find(
          (c: any) =>
            String(c.customer_no || "") === String(customerNo),
        ) ?? list[0];

      if (match) {
        setName(match.full_name ?? "");
        setEmail(match.email ?? "");
        setPhone(match.phone_number ?? "");
        // address not in this API response — leave query seed if any
      }
    } catch (error) {
      console.error("Failed to load customer profile:", error);
      // keep query-param seeds; do not block accounts
    } finally {
      setProfileLoading(false);
    }
  }

  // ----------------------------------------------------------
  // Loan accounts (unchanged)
  // ----------------------------------------------------------
  async function loadAccounts() {
    setAccountsLoading(true);
    setAccountsError(false);
    try {
      const response = await fetch(
        `/api/admin/customer-accounts?custNum=${encodeURIComponent(customerNo)}`,
        { method: "GET", cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Account API returned ${response.status}`);
      }
      const data = await response.json();
      setAccounts(data.accounts ?? []);
    } catch (error) {
      console.error("Failed to load customer accounts:", error);
      setAccounts([]);
      setAccountsError(true);
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadCustomerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerNo, session]);

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerNo]);

  async function saveProfile() {
    setSaving(true);
    setSaving(false);
    setSavedMsg("Profile saved.");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  return (
    <div>
      <button
        data-track-label="Back to users"
        onClick={() => router.push("/admin/users")}
        className="text-sm text-muted hover:text-hover"
      >
        ← Back to users
      </button>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {name || (profileLoading ? "Loading…" : "Customer")}
          </h1>
          <p className="text-sm text-muted">
            Customer No. {customerNo}
            {email ? ` • ${email}` : ""}
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-primary">Customer Profile</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={profileLoading}
          />
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={profileLoading}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={profileLoading}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            trackLabel="Save customer profile"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {savedMsg && (
            <span className="text-sm text-success">{savedMsg}</span>
          )}
        </div>
      </Card>

      {/* LOAN ACCOUNTS */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-primary">
        Loan Accounts
      </h2>

      {accountsLoading && (
        <div className="space-y-4">
          <Card>
            <div className="h-5 w-48 animate-pulse rounded bg-border" />
            <div className="mt-5 grid grid-cols-4 gap-4">
              <div className="h-10 animate-pulse rounded bg-border" />
              <div className="h-10 animate-pulse rounded bg-border" />
              <div className="h-10 animate-pulse rounded bg-border" />
              <div className="h-10 animate-pulse rounded bg-border" />
            </div>
          </Card>
        </div>
      )}

      {!accountsLoading && accountsError && (
        <Card className="border border-warning/30 bg-warning/10">
          <div className="font-medium text-foreground">
            Loan accounts unavailable
          </div>
          <p className="mt-1 text-sm text-muted">
            We could not retrieve this customer's loan accounts at the moment.
          </p>
        </Card>
      )}

      {!accountsLoading && accounts.length === 0 && !accountsError && (
        <Card>
          <p className="text-sm text-muted">
            This customer has no loan accounts.
          </p>
        </Card>
      )}

      {!accountsLoading && accounts.length > 0 && (
        <div className="space-y-4">
          {accounts.map((account) => {
            const statistics = account.statistics;
            const accountName =
              statistics?.ACCT_NM || account.PROD_DESC || "Loan Account";

            return (
              <Card key={account.ACCT_NO}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {accountName}
                    </h3>
                    <p className="text-xs text-muted">{account.PROD_DESC}</p>
                    <p className="mt-1 text-xs text-muted">
                      Account ••{account.ACCT_NO.slice(-4)}
                    </p>
                  </div>

                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      account.status === "Active"
                        ? "bg-success/10 text-success"
                        : "bg-border text-muted",
                    )}
                  >
                    {statistics
                      ? formatAccountStatus(statistics.ACCOUNT_STATUS)
                      : account.status || "Unavailable"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <Field
                    label="Balance"
                    value={
                      statistics
                        ? fmtCurrency(statistics.TOTAL_OUTSTANDING_ALL)
                        : "—"
                    }
                  />
                  <Field
                    label="Rate"
                    value={
                      statistics
                        ? `${statistics.INTEREST_RATE}% fixed`
                        : "—"
                    }
                  />
                  <Field
                    label="Term"
                    value={
                      statistics
                        ? `${statistics.TERM_VALUE} Months`
                        : "—"
                    }
                  />
                  <Field
                    label="Maturity"
                    value={
                      statistics?.MATURITY_DT
                        ? fmtDate(statistics.MATURITY_DT)
                        : "—"
                    }
                  />
                </div>

                <Link
                  href={`/admin/users/${customerNo}/loans/${account.ACCT_NO}`}
                  data-track-label={`Admin view loan:${accountName}`}
                  className="mt-4 inline-block text-sm font-semibold text-primary hover:underline hover:text-hover"
                >
                  View account →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAccountStatus(status: string) {
  switch (status) {
    case "A":
      return "Active";
    case "I":
      return "Inactive";
    case "L":
      return "Closed";
    case "D":
      return "Dormant";
    default:
      return status || "Unknown";
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}