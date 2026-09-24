"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { clsx } from "@/lib/clsx";
import StatusDialog from "@/components/StatusDialog";
import { fmtCurrency } from "@/lib/format";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;
const PAGE_SIZE = 10;

type UserProfile = "Y" | "N";

type CustomerUser = {
  id: number;
  email: string;
  account_name: string;
  customer_no: string;
  account_number: string | null;
  profile: UserProfile;
  phone_number?: string | null;
  is_verified?: boolean;
  is_locked?: string;
  created_at?: string;
};

type StatusFilter = "ALL" | "PENDING" | "PROFILED" | "INVALID";
type AssociationStatus =
  | "PENDING"
  | "PROFILED"
  | "INVALID"
  | "APPROVED"
  | string;

type AssociationRecord = {
  id: number;
  email: string;
  customer_name: string;
  account_number: string;
  customer_no: string;
  phone_number?: string | null;
  submitted_by?: string | null;
  status: AssociationStatus;
  created_at?: string;
};

function statusLabel(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "INVALID") return "Invalid";
  if (s === "PROFILED") return "Profiled";
  if (s === "APPROVED") return "Approved";
  return status || "Unknown";
}

function statusClass(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "bg-warning/10 text-warning";
  if (s === "INVALID") return "bg-danger/10 text-danger";
  if (s === "PROFILED" || s === "APPROVED") return "bg-success/10 text-success";
  return "bg-muted/10 text-muted";
}

/** Map association row → shape expected by ActivateUserModal */
function associationToCustomerUser(row: AssociationRecord): CustomerUser {
  return {
    id: row.id,
    email: row.email ?? "",
    account_name: row.customer_name ?? "",
    customer_no: row.customer_no ?? "",
    account_number: row.account_number ?? null,
    profile: "N",
    phone_number: row.phone_number,
  };
}

export default function PendingAssociationsTable() {
  const { data: session, status: authStatus } = useSession();

  const [rows, setRows] = useState<AssociationRecord[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CustomerUser | null>(null);

  const accessToken =
    ((session as any)?.accessToken as string | undefined) ||
    ((session as any)?.access_token as string | undefined);

  const loadAssociations = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!accessToken) return;
      if (!opts?.force && hasLoadedRef.current) return;
      if (loadingRef.current) return;

      loadingRef.current = true;
      if (opts?.force) setRefreshing(true);
      setError(null);

      try {
        const response = await fetch(
          `${ACCT_URL}api/v1/admin/customers/associations`,
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
        console.log("GET associations:", data);

        if (!response.ok) {
          throw new Error(
            data?.detail || data?.message || "Failed to load associations",
          );
        }

        const list: AssociationRecord[] = Array.isArray(data)
          ? data
          : (data?.records ?? data?.data ?? data?.customers ?? []);

        setRows(list);
        setCurrentPage(1);
        hasLoadedRef.current = true;
      } catch (err: any) {
        console.error("Failed to load associations:", err);
        setError(err?.message || "Unable to load associations.");
        if (!rows) setRows([]);
      } finally {
        loadingRef.current = false;
        setRefreshing(false);
      }
    },
    [accessToken, rows],
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !accessToken) return;
    loadAssociations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, accessToken]);

  const openActivateModal = (
    row: AssociationRecord,
    mode: "activate" | "deactivate" = "activate",
  ) => {
    setSelectedUser(associationToCustomerUser(row));
    setModalMode(mode);
    setShowActivateModal(true);
  };

  // state
  const [modalMode, setModalMode] = useState<"activate" | "deactivate">(
    "activate",
  );

  const closeActivateModal = () => {
    setShowActivateModal(false);
    setSelectedUser(null);
    setModalMode("activate");
  };

  // const closeActivateModal = () => {
  //   setShowActivateModal(false);
  //   setSelectedUser(null);
  // };

  const refresh = () => loadAssociations({ force: true });

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        (row.customer_name || "").toLowerCase().includes(search) ||
        (row.email || "").toLowerCase().includes(search) ||
        (row.account_number || "").toLowerCase().includes(search) ||
        (row.customer_no || "").toLowerCase().includes(search) ||
        (row.submitted_by || "").toLowerCase().includes(search);

      const status = (row.status || "").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Approvals</h2>
          <p className="mt-0.5 text-sm text-muted">
            Customer account link requests and their review status.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
          className="min-w-[220px] flex-1"
        >
          <Input
            placeholder="Search by name, email, account no, customer no…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "PROFILED", "INVALID"] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                data-track-label={`Association filter:${status}`}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={clsx(
                  "rounded-brand border px-3 py-2 text-sm font-medium",
                  statusFilter === status
                    ? "border-primary bg-background/10 text-primary"
                    : "border-border text-muted hover:bg-muted/10",
                )}
              >
                {status === "ALL"
                  ? "All"
                  : status === "PENDING"
                    ? "Pending"
                    : status === "PROFILED"
                      ? "Profiled"
                      : "Invalid"}
              </button>
            ),
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <p className="text-sm text-muted">
            {rows == null
              ? "Loading…"
              : `${filteredRows.length} of ${rows.length} request${
                  rows.length === 1 ? "" : "s"
                }`}
          </p>
          <Button
            variant="secondary"
            size="sm"
            trackLabel="Refresh associations"
            onClick={refresh}
            disabled={refreshing || !accessToken}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="border-b border-danger/20 bg-danger/10 px-6 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="w-[24%] px-6 py-3 text-left font-medium">
                  Account name
                </th>
                <th className="w-[12%] px-6 py-3 text-left font-medium">
                  Account number
                </th>
                <th className="w-[12%] px-6 py-3 text-left font-medium">
                  Customer number
                </th>
                <th className="w-[16%] px-6 py-3 text-left font-medium">
                  Submitted by
                </th>
                <th className="w-[10%] px-6 py-3 text-left font-medium">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows == null && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-muted">
                    Loading associations…
                  </td>
                </tr>
              )}

              {rows && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-muted">
                    No associations found.
                  </td>
                </tr>
              )}

              {paginatedRows.map((row) => {
                const status = (row.status || "").toUpperCase();
                const isPending = status === "PENDING";
                const isProfiled =
                  status === "PROFILED" || status === "APPROVED";
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-6 py-3">
                      <div className="font-medium text-foreground">
                        {row.customer_name || "—"}
                      </div>
                      <div className="mt-0.5 break-all text-xs text-muted">
                        {row.email || "—"}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-3 text-muted">
                      {row.account_number || "—"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-3 text-muted">
                      {row.customer_no || "—"}
                    </td>

                    <td className="break-all px-6 py-3 text-muted">
                      {row.submitted_by || "—"}
                    </td>

                    <td className="px-6 py-3">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          statusClass(row.status),
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>

                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        {isPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-success/40 text-success hover:bg-success/10"
                            trackLabel={`Activate association:${row.id}`}
                            onClick={() => openActivateModal(row, "activate")}
                          >
                            Activate
                          </Button>
                        )}

                        {isProfiled && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-danger/40 text-danger hover:bg-danger/10"
                            trackLabel={`Deactivate association:${row.id}`}
                            onClick={() => openActivateModal(row, "deactivate")}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-muted">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * PAGE_SIZE, filteredRows.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredRows.length}
              </span>
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={clsx(
                      "rounded-md px-3 py-1.5 text-sm",
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-surface",
                    )}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {showActivateModal && selectedUser && (
        <ActivateUserModal
          user={selectedUser}
          mode={modalMode}
          lockAccountNumber
          autoVerify={modalMode === "activate"}
          onClose={closeActivateModal}
          onActivated={() => {
            closeActivateModal();
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
 * ACTIVATE MODAL (same verify/approve logic; prefill + optional lock)
 * ============================================================ */

function ActivateUserModal({
  user,
  onClose,
  onActivated,
  lockAccountNumber = false,
  autoVerify = false,
  mode = "activate",
}: {
  user: CustomerUser;
  onClose: () => void;
  onActivated: (customerNo: string, email: string) => void;
  lockAccountNumber?: boolean;
  autoVerify?: boolean;
  mode?: "activate" | "deactivate";
}) {
  const { data: session } = useSession();
  const isDeactivate = mode === "deactivate";

  const [accountNumber, setAccountNumber] = useState(
    user.account_number?.trim() || "",
  );
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const autoVerifyRan = useRef(false);
  const deactivateLoadRan = useRef(false);

  type AssociationPreview = {
    id: number;
    email: string;
    account_number: string;
    customer_no: string;
    customer_name: string;
    addr_line_1?: string | null;
    corebank_email?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    primary_officer_name?: string | null;
    bu_nm?: string | null;
    industry_desc?: string | null;
    cust_seg_desc?: string | null;
    disbursement_limit?: number | null;
    term_cd?: string | null;
    term_value?: number | null;
    ref_desc?: string | null;
    rec_st?: string | null;
    status?: string | null;
  };

  const [association, setAssociation] = useState<AssociationPreview | null>(
    null,
  );

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    buttonText: string;
  }>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
  });

  const getAccessToken = () =>
    ((session as any)?.accessToken ||
      (session as any)?.access_token ||
      undefined) as string | undefined;

  /** Shared: load association by email (pending + profiled/deactivate) */
  const fetchAssociationByEmail = async (email: string) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("You are not authenticated. Please log in again.");
    }

    const associationUrl =
      `${ACCT_URL}api/v1/admin/customers/associations` +
      `?email=${encodeURIComponent(email)}`;

    console.log("GET association by email:", associationUrl);

    const associationResponse = await fetch(associationUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const associationData = await associationResponse.json().catch(() => null);
    console.log("association by email response:", associationData);

    if (!associationResponse.ok) {
      throw new Error(
        associationData?.detail ||
          associationData?.message ||
          "Unable to retrieve the association.",
      );
    }

    const records: AssociationPreview[] = Array.isArray(
      associationData?.records,
    )
      ? associationData.records
      : Array.isArray(associationData)
        ? associationData
        : associationData?.data
          ? [associationData.data]
          : [];

    if (!records.length) {
      throw new Error("No association record was returned for this email.");
    }

    // Prefer PROFILED when deactivating; otherwise first record
    if (isDeactivate) {
      const profiled =
        records.find(
          (r) =>
            (r.status || "").toUpperCase() === "PROFILED" ||
            (r.status || "").toUpperCase() === "APPROVED",
        ) ?? records[0];
      return profiled;
    }

    return records[0];
  };

  const approveAssociation = async (assocId: number) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("You are not authenticated. Please log in again.");
    }

    const payload = {
      assoc_id: assocId,
      review_notes: "Valid",
    };

    const response = await fetch(
      `${ACCT_URL}api/v1/admin/customers/associations/approve`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.detail || data?.message || "Unable to approve this association.",
      );
    }
    return data;
  };

  const verifyAccount = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isDeactivate) return;

    if (association?.id) {
      setError("");
      setActivating(true);
      try {
        const data = await approveAssociation(association.id);
        setStatusDialog({
          open: true,
          type: "success",
          title: "Activation successful",
          message: data?.message || "Profile approved and linked successfully.",
          buttonText: "Done",
        });
      } catch (err: any) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Activation failed",
          message:
            err?.message ||
            "Unable to activate this customer. Please try again.",
          buttonText: "Close",
        });
      } finally {
        setActivating(false);
      }
      return;
    }

    const account_number = accountNumber.trim();
    if (!account_number) {
      setError("Please enter an account number.");
      return;
    }
    if (!user.email) {
      setError("This customer does not have an email address.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    setError("");
    setAssociation(null);
    setVerifying(true);

    try {
      const payload = { email: user.email, account_number };
      const response = await fetch(
        `${ACCT_URL}api/v1/admin/customers/associate-profile`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (data?.detail === "This account is already pending approval.") {
        const existing = await fetchAssociationByEmail(user.email);
        setAssociation(existing);
        return;
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Unable to verify this account number.",
        );
      }

      const preview = Array.isArray(data?.records)
        ? data.records[0]
        : data?.data;

      if (!preview?.id) {
        throw new Error("Association response did not include an id.");
      }

      setAssociation(preview);
    } catch (err: any) {
      setError(err?.message || "Unable to verify this account number.");
      setAssociation(null);
    } finally {
      setVerifying(false);
    }
  };

  // Activate: auto-verify when opened from table
  useEffect(() => {
    if (isDeactivate) return;
    if (!autoVerify || autoVerifyRan.current) return;
    if (!accountNumber.trim()) return;
    autoVerifyRan.current = true;
    void verifyAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deactivate: load full details via associations?email=
  useEffect(() => {
    if (!isDeactivate) return;
    if (deactivateLoadRan.current) return;
    if (!user.email) {
      setError("This customer does not have an email address.");
      return;
    }

    deactivateLoadRan.current = true;
    setLoadingDetails(true);
    setError("");

    fetchAssociationByEmail(user.email)
      .then((record) => {
        setAssociation(record);
      })
      .catch((err: any) => {
        setError(err?.message || "Unable to load association details.");
        setAssociation(null);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeactivate, user.email]);

  const invalidateCustomer = async () => {
    if (!association?.id) {
      setError("Please verify the account number first.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    setError("");
    setInvalidating(true);

    try {
      const payload = {
        assoc_id: association.id,
        review_notes: "Invalid",
      };

      const response = await fetch(
        `${ACCT_URL}api/v1/admin/customers/associations/invalid`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Unable to invalidate this association.",
        );
      }

      setStatusDialog({
        open: true,
        type: "success",
        title: "User invalidated",
        message:
          data?.message || "This association has been marked as invalid.",
        buttonText: "Done",
      });
    } catch (err: any) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Invalidate failed",
        message:
          err?.message ||
          "Unable to invalidate this customer. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setInvalidating(false);
    }
  };

  const deactivateCustomer = async () => {
    if (!association?.id) {
      setError("Association id is missing.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    setError("");
    setDeactivating(true);

    try {
      const payload = {
        assoc_id: association.id,
        review_notes: "Dissociated",
      };

      const response = await fetch(
        `${ACCT_URL}api/v1/admin/customers/associations/dissociate`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Unable to deactivate this association.",
        );
      }

      setStatusDialog({
        open: true,
        type: "success",
        title: "Account deactivated",
        message:
          data?.message ||
          "This customer account has been dissociated successfully.",
        buttonText: "Done",
      });
    } catch (err: any) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Deactivate failed",
        message:
          err?.message ||
          "Unable to deactivate this customer. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setDeactivating(false);
    }
  };

  const closeStatusDialog = () => {
    const wasSuccess = statusDialog.type === "success";
    setStatusDialog((prev) => ({ ...prev, open: false }));

    if (wasSuccess) {
      onActivated(
        association?.customer_no || user.customer_no || "",
        association?.email || user.email,
      );
      onClose();
    }
  };

  const inputLocked = lockAccountNumber && Boolean(user.account_number);
  const busy =
    verifying || activating || invalidating || deactivating || loadingDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      {/* Panel: full-width on mobile, capped on desktop */}
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-brand border border-border bg-surface shadow-xl sm:max-h-[90vh] sm:rounded-brand">
        {/* ========== STATIC HEADER ========== */}
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {isDeactivate ? "Deactivate User" : "Activate User"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isDeactivate ? (
                  <>
                    Remove the account link for{" "}
                    <span className="font-medium text-foreground">
                      {user.account_name || "this customer"}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Link{" "}
                    <span className="font-medium text-foreground">
                      {user.account_name || "this customer"}
                    </span>{" "}
                    to their account.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-xl leading-none text-muted hover:text-foreground"
              disabled={busy}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ========== SCROLLABLE BODY ========== */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-5">
            {!isDeactivate && (
              <form onSubmit={verifyAccount}>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Account number
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={accountNumber}
                    onChange={(e) => {
                      if (inputLocked) return;
                      setAccountNumber(e.target.value);
                      setAssociation(null);
                    }}
                    maxLength={10}
                    placeholder="Enter account number"
                    disabled={busy || inputLocked}
                    className="w-full"
                  />
                  <Button
                    type="submit"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={busy || !accountNumber.trim()}
                  >
                    {verifying
                      ? "Verifying…"
                      : activating
                        ? "Activating…"
                        : association
                          ? "Activate"
                          : "Verify"}
                  </Button>
                </div>
                {association && (
                  <p className="mt-1 text-xs text-foreground">
                    Click <strong>Activate</strong> to link this user, or
                    invalidate below.
                  </p>
                )}
              </form>
            )}

            {error && (
              <div className="rounded-brand border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {isDeactivate && loadingDetails && (
              <p className="text-sm text-muted">Loading account details…</p>
            )}

            {association && (
              <div className="rounded-brand border border-border bg-muted/5 p-4">
                <div className="mb-4">
                  <h3 className="font-semibold text-foreground">
                    Account details
                  </h3>
                  <p className="text-xs text-muted">
                    {isDeactivate
                      ? "Confirm before deactivating this linked account."
                      : "Confirm the information before activating or invalidating."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted">User name</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {association.customer_name || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Account number</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {association.account_number || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Customer No.</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {association.customer_no || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Status</div>
                    <div
                      className={`mt-1 text-sm font-medium ${
                        association.status === "PROFILED"
                          ? "text-success"
                          : association.status === "INVALID"
                            ? "text-danger"
                            : association.status === "PENDING"
                              ? "text-warning"
                              : "text-muted"
                      }`}
                    >
                      {association.status || association.ref_desc || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Primary officer</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {association.primary_officer_name || "—"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted">Registered Email</div>
                    <div className="mt-1 break-all text-sm font-medium text-foreground">
                      {association.corebank_email || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Disbursement Limit</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {fmtCurrency(association.disbursement_limit ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Loan Term</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {association.term_value != null
                        ? `${association.term_value} ${
                            association.term_value === 1 ? "Month" : "Months"
                          }`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========== STATIC FOOTER ========== */}
        <div className="shrink-0 border-t border-border bg-surface px-4 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            {isDeactivate ? (
              <Button
                className="w-full bg-danger text-background hover:bg-danger/90 sm:w-auto"
                disabled={busy || !association?.id}
                onClick={deactivateCustomer}
                trackLabel={`Dissociate association:${association?.id}`}
              >
                {deactivating ? "Deactivating…" : "Deactivate"}
              </Button>
            ) : (
              <>
                {association && (
                  <Button
                    className="w-full border-danger/40 bg-danger text-background hover:bg-background hover:text-danger sm:w-auto"
                    variant="outline"
                    disabled={busy}
                    onClick={invalidateCustomer}
                    trackLabel={`Invalidate association:${association.id}`}
                  >
                    {invalidating ? "Invalidating…" : "Invalidate user"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <StatusDialog
        open={statusDialog.open}
        type={statusDialog.type}
        title={statusDialog.title}
        message={statusDialog.message}
        buttonText={statusDialog.buttonText}
        onClose={closeStatusDialog}
      />
    </div>
  );
}
