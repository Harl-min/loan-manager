"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

export type AssociationRecord = {
  id: number;
  email: string;
  account_number: string;
  customer_no: string;
  customer_name: string;
  status: string;
};

type CustomerAccountLinkProps = {
  email: string;
  onStatusChange?: (status: string | null) => void;
};

function statusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "profiled") return "Profiled";
  if (s === "invalid") return "Invalid";
  if (s === "approved") return "Approved";
  return status || "Unknown";
}

function statusClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "bg-warning/10 text-warning";
  if (s === "profiled" || s === "approved") return "bg-success/10 text-success";
  if (s === "invalid") return "bg-danger/10 text-danger";
  return "bg-muted/10 text-muted";
}

export default function CustomerAccountLink({
  email,
  onStatusChange,
}: CustomerAccountLinkProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [records, setRecords] = useState<AssociationRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  /** After INVALID (once only): user can open the form again */
  const [allowRetry, setAllowRetry] = useState(false);

  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  const hasRecords = (records?.length ?? 0) > 0;
  const primaryStatus = records?.[0]?.status?.toLowerCase() ?? "";

  const hasInvalid = !!records?.some(
    (r) => r.status?.toLowerCase() === "invalid",
  );
  const hasPending = !!records?.some(
    (r) => r.status?.toLowerCase() === "pending",
  );

  /**
   * Click here only when:
   * - there is an invalid record
   * - not pending
   * - total === 1 (invalid once; hide when total >= 2)
   * - user has not already opened the form
   */
  const showInvalidRetry =
    hasInvalid && !hasPending && total === 1 && !allowRetry;

  /**
   * Account form when:
   * - no records, or
   * - invalid once + user clicked "Click here"
   */
  const showLinkForm =
    records !== null &&
    (!hasRecords ||
      (allowRetry && hasInvalid && !hasPending && total === 1));

  const accessToken =
    ((session as any)?.accessToken as string | undefined) ||
    ((session as any)?.access_token as string | undefined);

  const applyStatus = useCallback(
    (list: AssociationRecord[]) => {
      const primary = list[0];
      onStatusChange?.(primary?.status ?? null);
    },
    [onStatusChange],
  );

  const loadAssociations = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!accessToken) return;
      if (!opts?.force && hasLoadedRef.current) return;
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${ACCT_URL}api/v1/auth/my-associations`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => null);
        console.log("GET /api/v1/auth/my-associations:", data);

        if (!response.ok) {
          throw new Error(
            data?.detail || data?.message || "Unable to load associations.",
          );
        }

        const list: AssociationRecord[] = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
            ? data
            : [];

        const apiTotal =
          typeof data?.total === "number" ? data.total : list.length;

        setRecords(list);
        setTotal(apiTotal);
        applyStatus(list);
        hasLoadedRef.current = true;
        setAllowRetry(false);
      } catch (err) {
        console.error("my-associations error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your account link status.",
        );
        setRecords((prev) => prev ?? []);
        setTotal(0);
        onStatusChange?.(null);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [accessToken, applyStatus, onStatusChange],
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !accessToken) return;
    loadAssociations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, accessToken]);

  async function handleLink() {
    const account = accountNumber.trim();
    if (!account) {
      setError("Please enter your account number.");
      return;
    }
    if (!email) {
      setError("Your email is missing. Please sign in again.");
      return;
    }
    if (!accessToken) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        account_number: account,
      };

      console.log("POST /api/v1/auth/associate-profile payload:", payload);

      const response = await fetch(
        `${ACCT_URL}api/v1/auth/associate-profile`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);
      console.log("associate-profile response:", data);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Unable to submit your account number. Please try again.",
        );
      }

      setSuccessMsg(
        data?.message ||
          "Your account link request was submitted for review.",
      );
      setAccountNumber("");
      setAllowRetry(false);

      hasLoadedRef.current = false;
      await loadAssociations({ force: true });
      router.refresh();
    } catch (err) {
      console.error("associate-profile error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to validate your account number.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-primary">
          {hasRecords ? "Account link status" : "Link Your Account"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {loading && records == null
            ? "Checking your account link status…"
            : hasRecords
              ? primaryStatus === "pending"
                ? "Your account link request is pending approval."
                : primaryStatus === "invalid"
                  ? total === 1
                    ? "Your previous link request is invalid. You can try a different account number."
                    : "Your previous link request is invalid. Contact support for help."
                  : primaryStatus === "profiled" ||
                      primaryStatus === "approved"
                    ? "Your account has been linked. Refresh the page if your loans are not visible yet."
                    : "Here is the status of your account link request."
              : "Enter your account number to link your loan account to your email address. We’ll show the status of your request after you submit."}
        </p>
      </div>

      {loading && records == null && (
        <p className="text-sm text-muted">Checking link status…</p>
      )}

      {hasRecords && (
        <div className="space-y-3">
          {records!.map((row) => (
            <div
              key={row.id}
              className="rounded-brand border border-border bg-muted/5 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    {row.customer_name || "Account link"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    Account {row.account_number || "—"}
                  </div>
                  <div className="mt-0.5 break-all text-xs text-muted">
                    {row.email}
                  </div>
                </div>

                <span
                  className={clsx(
                    "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusClass(row.status),
                  )}
                >
                  {statusLabel(row.status)}
                </span>
              </div>
            </div>
          ))}

          {hasPending && (
            <p className="text-xs text-muted">
              Your request is pending approval. You’ll see your loans once
              it’s approved.
            </p>
          )}

          {/* Click here: only invalid once (total === 1), never pending or total >= 2 */}
          {showInvalidRetry && (
            <p className="text-xs text-muted">
              Contact support or try a different account number.{" "}
              <button
                type="button"
                onClick={() => {
                  setAllowRetry(true);
                  setError(null);
                  setSuccessMsg(null);
                  setAccountNumber("");
                }}
                className="font-semibold text-primary underline underline-offset-2 hover:text-hover"
              >
                Click here
              </button>
            </p>
          )}
        </div>
      )}

      {showLinkForm && (
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setAccountNumber(value);
            }}
            maxLength={10}
            inputMode="numeric"
            placeholder="Enter account number"
            className="w-full min-w-[12rem] max-w-[50%] rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            disabled={submitting}
          />

          <button
            type="button"
            onClick={handleLink}
            disabled={submitting || !accountNumber.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Linking…" : "Link Account"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {/* {successMsg && <p className="text-sm text-success">{successMsg}</p>} */}
    </div>
  );
}

export function formatAssociationStatus(status: string | null | undefined) {
  if (!status) return "—";
  return statusLabel(status);
}

export function associationStatusTone(status: string | null | undefined) {
  if (!status) return "muted";
  const s = status.toLowerCase();
  if (s === "pending") return "warning";
  if (s === "profiled" || s === "approved") return "success";
  if (s === "invalid") return "danger";
  return "muted";
}