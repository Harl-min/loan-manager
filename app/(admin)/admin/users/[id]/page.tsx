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

type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  mailingAddress: string | null;
  isBlocked: boolean;

  /*
   * Keep this because the customer API
   * may still return it, but we will NOT
   * use it for the account cards.
   */
  loans: any[];
};

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

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] =
    useState<CustomerDetail | null>(null);

  const [accounts, setAccounts] =
    useState<CustomerAccount[]>([]);

  const [accountsLoading, setAccountsLoading] =
    useState(true);

  const [accountsError, setAccountsError] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  /*
   * Load customer from Prisma/API.
   *
   * This remains exactly as your existing
   * customer profile flow.
   */
  async function load() {
    const res = await api.get<{
      user: CustomerDetail;
    }>(`/admin/users/${params.id}`);

    setCustomer(res.user);
  }

  /*
   * Load external loan accounts.
   *
   * The route uses the hardcoded custNum:
   * 0000035668
   */
  async function loadAccounts() {
    setAccountsLoading(true);
    setAccountsError(false);

    try {
      const response = await fetch(
        "/api/admin/customer-accounts",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Account API returned ${response.status}`
        );
      }

      const data = await response.json();

      setAccounts(data.accounts ?? []);
    } catch (error) {
      console.error(
        "Failed to load customer accounts:",
        error
      );

      setAccounts([]);
      setAccountsError(true);
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    load();

    loadAccounts();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!customer) {
    return (
      <p className="text-sm text-muted">
        Loading…
      </p>
    );
  }

  async function saveProfile() {
    if (!customer) return;

    setSaving(true);

    await api.patch(
      `/admin/users/${customer.id}`,
      {
        name: customer.name,
        phone: customer.phone ?? "",
        mailingAddress:
          customer.mailingAddress ?? "",
      }
    );

    setSaving(false);

    setSavedMsg("Profile saved.");

    setTimeout(
      () => setSavedMsg(null),
      2000
    );
  }

  async function toggleBlock() {
    if (!customer) return;

    setBusy(true);

    await api.patch(
      `/admin/users/${customer.id}`,
      {
        isBlocked: !customer.isBlocked,
      }
    );

    await load();

    setBusy(false);
  }

  return (
    <div>

      {/* BACK */}
      <button
        data-track-label="Back to users"
        onClick={() =>
          router.push("/admin/users")
        }
        className="text-sm text-muted hover:text-foreground"
      >
        ← Back to users
      </button>

      {/* CUSTOMER HEADER */}
      <div className="mt-2 flex items-start justify-between">

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {customer.name}
          </h1>

          <p className="text-sm text-muted">
            {customer.email} • {customer.role}
          </p>
        </div>

        <span
          className={clsx(
            "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
            customer.isBlocked
              ? "bg-danger/10 text-danger"
              : "bg-warning/10 text-warning"
          )}
        >
          <div className="h-2 w-2 rounded-full bg-green-600" />

          {customer.isBlocked
            ? "Blocked"
            : "Inactive"}
        </span>

      </div>

      {/* CUSTOMER PROFILE */}
      <Card className="mt-6">

        <h2 className="font-semibold text-foreground">
          Customer Profile
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-4">

          <Input
            label="Full name"
            value={customer.name}
            onChange={(e) =>
              setCustomer({
                ...customer,
                name: e.target.value,
              })
            }
          />

          <Input
            label="Email"
            value={customer.email}
            disabled
          />

          <Input
            label="Phone"
            value={customer.phone ?? ""}
            onChange={(e) =>
              setCustomer({
                ...customer,
                phone: e.target.value,
              })
            }
          />

          <Input
            label="Mailing address"
            value={
              customer.mailingAddress ?? ""
            }
            onChange={(e) =>
              setCustomer({
                ...customer,
                mailingAddress: e.target.value,
              })
            }
          />

        </div>

        <div className="mt-4 flex items-center gap-3">

          <Button
            trackLabel="Save customer profile"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Save changes"}
          </Button>

          <Button
            variant={
              customer.isBlocked
                ? "secondary"
                : "outline"
            }
            trackLabel={
              customer.isBlocked
                ? "Unblock customer"
                : "Block customer"
            }
            onClick={toggleBlock}
            disabled={busy}
          >
            {customer.isBlocked
              ? "Unblock account"
              : "Block account"}
          </Button>

          {savedMsg && (
            <span className="text-sm text-success">
              {savedMsg}
            </span>
          )}

        </div>
      </Card>

      {/* LOAN ACCOUNTS */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">
        Loan Accounts
      </h2>

      {accountsLoading && (
        <div className="space-y-4">

          {[1].map((item) => (
            <Card key={item}>
              <div className="h-5 w-48 animate-pulse rounded bg-border" />

              <div className="mt-5 grid grid-cols-4 gap-4">
                <div className="h-10 animate-pulse rounded bg-border" />
                <div className="h-10 animate-pulse rounded bg-border" />
                <div className="h-10 animate-pulse rounded bg-border" />
                <div className="h-10 animate-pulse rounded bg-border" />
              </div>
            </Card>
          ))}

        </div>
      )}

      {!accountsLoading && accountsError && (
        <Card className="border border-warning/30 bg-warning/10">
          <div className="font-medium text-foreground">
            Loan accounts unavailable
          </div>

          <p className="mt-1 text-sm text-muted">
            We could not retrieve this customer's
            loan accounts at the moment.
          </p>
        </Card>
      )}

      {!accountsLoading &&
        accounts.length === 0 &&
        !accountsError && (
          <Card>
            <p className="text-sm text-muted">
              This customer has no loan accounts.
            </p>
          </Card>
        )}

      {!accountsLoading && accounts.length > 0 && (
        <div className="space-y-4">

          {accounts.map((account) => {

            const statistics =
              account.statistics;

            /*
             * Prefer the account name returned
             * by the statistics API.
             *
             * Otherwise use the loan-list
             * product description.
             */
            const accountName =
              statistics?.ACCT_NM ||
              account.PROD_DESC ||
              "Loan Account";

            return (
              <Card
                key={account.ACCT_NO}
              >

                {/* ACCOUNT HEADER */}
                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="font-semibold text-foreground">
                      {accountName}
                    </h3>

                    <p className="text-xs text-muted">
                      {account.PROD_DESC}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Account ••
                      {account.ACCT_NO.slice(-4)}
                    </p>

                  </div>

                {/* ACCOUNT STATUS */}

                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      account.status ===
                        "Active"
                        ? "bg-success/10 text-success"
                        : "bg-border text-muted"
                    )}
                  >
                    {statistics
                      ? formatAccountStatus(
                          statistics.ACCOUNT_STATUS
                        )
                      : account.status ||
                        "Unavailable"}
                  </span>

                </div>

                {/* ACCOUNT SUMMARY */}
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">

                  <Field
                    label="Balance"
                    value={
                      statistics
                        ? fmtCurrency(
                            statistics.TOTAL_OUTSTANDING_ALL
                          )
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
                        ? fmtDate(
                            statistics.MATURITY_DT
                          )
                        : "—"
                    }
                  />

                </div>

                {/* VIEW ACCOUNT */}
                <Link
                  href={`/admin/users/${customer.id}/loans/${account.ACCT_NO}`}
                  data-track-label={`Admin view loan:${accountName}`}
                  className="mt-4 inline-block text-sm font-semibold text-foreground hover:underline"
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

function formatAccountStatus(
  status: string
) {
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

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted">
        {label}
      </div>

      <div className="font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}