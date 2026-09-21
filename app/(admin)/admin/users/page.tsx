"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusDialog from "@/components/StatusDialog";
import { clsx } from "@/lib/clsx";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;
const PAGE_SIZE = 10;

/* ============================================================
 * TYPES
 * ============================================================ */

type CreateRole = "viewer" | "admin" | "super_admin";
type UserProfile = "Y" | "N";
type UserStatus = "active" | "inactive";
type RoleFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortDirection = "asc" | "desc";
type ListMode = "users" | "admins";

type SortKey =
  | "account_name"
  | "email"
  | "customer_no"
  | "phone_number"
  | "created_at"
  | "profile";

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

type ApiCustomer = {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  profile: string;
  customer_no: string | null;
  account_number: string | null;
  is_verified: boolean;
  is_locked: string;
  created_at: string;
};

type CustomersListResponse = {
  total: number;
  page: number;
  page_size: number;
  customers: ApiCustomer[];
};

type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: string;
  last_login?: string;
  created_at?: string;
};

type AdminsListResponse = {
  total: number;
  admins: AdminUser[];
};

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
};

/* ============================================================
 * HELPERS
 * ============================================================ */

function formatCreatedAt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapApiCustomer(c: ApiCustomer): CustomerUser {
  return {
    id: c.id,
    email: c.email ?? "",
    account_name: c.full_name ?? "",
    customer_no: c.customer_no ?? "",
    account_number: c.account_number ?? "",
    profile: c.profile === "Y" ? "Y" : "N",
    phone_number: c.phone_number,
    is_verified: c.is_verified,
    is_locked: c.is_locked,
    created_at: c.created_at,
  };
}

const isLocked = (user: CustomerUser) =>
  (user.is_locked || "").toUpperCase() === "Y";

const getUserStatus = (user: CustomerUser): UserStatus => {
  if (isLocked(user)) return "inactive";
  return user.profile === "Y" ? "active" : "inactive";
};

function isAdminActive(admin: AdminUser) {
  const v = (admin.is_active || "").toString().toUpperCase();
  return v === "Y" || v === "TRUE" || v === "1" || v === "ACTIVE";
}

/* ============================================================
 * PAGE
 * ============================================================ */

export default function ManageUsersPage() {
  const { data: session, status } = useSession();

  const [listMode, setListMode] = useState<ListMode>("users");

  /* ---------- Customers ---------- */
  const [users, setUsers] = useState<CustomerUser[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoleFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("account_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  /* ---------- Admins ---------- */
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] =
    useState<RoleFilter>("ALL");
  const [adminPage, setAdminPage] = useState(1);
  const [adminRefreshing, setAdminRefreshing] = useState(false);

  const adminsLoadedRef = useRef(false);
  const adminsLoadingRef = useRef(false);

  /* ---------- Shared dialog ---------- */
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
  });

  const closeStatusDialog = () => {
    setStatusDialog((prev) => ({ ...prev, open: false }));
  };

  const getAccessToken = () =>
    ((session as any)?.accessToken ||
      (session as any)?.access_token ||
      undefined) as string | undefined;

  const accessToken = getAccessToken();

  /* ============================================================
   * LOAD CUSTOMERS
   * ============================================================ */

  const loadUsers = async (opts?: { force?: boolean }) => {
    const token = getAccessToken();
    if (!token) {
      console.warn("No access token – cannot load customers");
      setUsers([]);
      return;
    }
    if (!opts?.force && hasLoadedRef.current) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    if (opts?.force) setRefreshing(true);

    try {
      const response = await fetch(
        `${ACCT_URL}api/v1/admin/customers/list`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const data: CustomersListResponse = await response.json();
      console.log("GET /api/v1/admin/customers/list:", data);

      if (!response.ok) {
        throw new Error(
          (data as any)?.detail ||
            (data as any)?.message ||
            "Failed to load customers",
        );
      }

      const mapped = (data.customers ?? []).map(mapApiCustomer);
      setUsers(mapped);
      setTotalCount(data.total ?? mapped.length);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load customers:", error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
    }
  };

  /* ============================================================
   * LOAD ADMINS
   * ============================================================ */

  const loadAdmins = async (opts?: { force?: boolean }) => {
    const token = getAccessToken();
    if (!token) {
      setAdmins([]);
      return;
    }
    if (!opts?.force && adminsLoadedRef.current) return;
    if (adminsLoadingRef.current) return;

    adminsLoadingRef.current = true;
    if (opts?.force) setAdminRefreshing(true);

    try {
      const response = await fetch(`${ACCT_URL}api/v1/admin/list`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data: AdminsListResponse = await response.json();
      console.log("GET /api/v1/admin/list:", data);

      if (!response.ok) {
        throw new Error(
          (data as any)?.detail ||
            (data as any)?.message ||
            "Failed to load admins",
        );
      }

      const list = data.admins ?? [];
      setAdmins(list);
      setAdminTotal(data.total ?? list.length);
      setAdminPage(1);
      adminsLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load admins:", error);
      setAdmins([]);
      setAdminTotal(0);
    } finally {
      adminsLoadingRef.current = false;
      setAdminRefreshing(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, accessToken]);

  const refreshUsers = () => loadUsers({ force: true });
  const refreshAdmins = () => loadAdmins({ force: true });

  const switchListMode = (mode: ListMode) => {
    setListMode(mode);
    if (mode === "admins") {
      loadAdmins();
    }
  };

  /* ============================================================
   * CUSTOMERS: filter / sort / page
   * ============================================================ */

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const search = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.account_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.customer_no || "").toLowerCase().includes(search) ||
        (user.phone_number || "").toLowerCase().includes(search) ||
        (user.created_at || "").toLowerCase().includes(search);

      const userStatus = getUserStatus(user);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && userStatus === "active") ||
        (statusFilter === "INACTIVE" && userStatus === "inactive");

      return matchesSearch && matchesStatus;
    });
  }, [users, query, statusFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      switch (sortKey) {
        case "email":
          valueA = a.email;
          valueB = b.email;
          break;
        case "customer_no":
          valueA = a.customer_no;
          valueB = b.customer_no;
          break;
        case "phone_number":
          valueA = a.phone_number ?? "";
          valueB = b.phone_number ?? "";
          break;
        case "created_at":
          valueA = a.created_at ?? "";
          valueB = b.created_at ?? "";
          break;
        case "profile":
          valueA = a.profile;
          valueB = b.profile;
          break;
        case "account_name":
        default:
          valueA = a.account_name;
          valueB = b.account_name;
          break;
      }

      const comparison = valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredUsers, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const renderSortHeader = (label: string, key: SortKey, width: string) => (
    <th className={`${width} px-6 py-3 text-left font-medium`}>
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
      >
        <span>{label}</span>
        <span className="text-[11px]">{getSortArrow(key)}</span>
      </button>
    </th>
  );

  /* ============================================================
   * ADMINS: filter / page
   * ============================================================ */

  const filteredAdmins = useMemo(() => {
    if (!admins) return [];
    const search = adminQuery.trim().toLowerCase();

    return admins.filter((admin) => {
      const matchesSearch =
        !search ||
        (admin.full_name || "").toLowerCase().includes(search) ||
        (admin.email || "").toLowerCase().includes(search) ||
        (admin.role || "").toLowerCase().includes(search);

      const active = isAdminActive(admin);
      const matchesStatus =
        adminStatusFilter === "ALL" ||
        (adminStatusFilter === "ACTIVE" && active) ||
        (adminStatusFilter === "INACTIVE" && !active);

      return matchesSearch && matchesStatus;
    });
  }, [admins, adminQuery, adminStatusFilter]);

  const adminTotalPages = Math.max(
    1,
    Math.ceil(filteredAdmins.length / PAGE_SIZE),
  );

  const paginatedAdmins = useMemo(() => {
    const start = (adminPage - 1) * PAGE_SIZE;
    return filteredAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredAdmins, adminPage]);

  useEffect(() => {
    if (adminPage > adminTotalPages) setAdminPage(adminTotalPages);
  }, [adminPage, adminTotalPages]);

  /* ============================================================
   * LOCK / UNLOCK
   * ============================================================ */

  const handleLockToggle = async (
    user: CustomerUser,
    action: "lock" | "unlock",
  ) => {
    const token = getAccessToken();
    if (!token) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Not authenticated",
        message: "You are not authenticated. Please log in again.",
        buttonText: "Close",
      });
      return;
    }

    const routeId = user.customer_no || String(user.id);
    setBusyId(routeId);

    try {
      const endpoint =
        action === "lock"
          ? `${ACCT_URL}api/v1/admin/customers/lock`
          : `${ACCT_URL}api/v1/admin/customers/unlock`;

      const payload = {
        email: user.email,
        reason: action === "lock" ? "lock" : "unlock",
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Unable to ${action} this customer.`,
        );
      }

      setUsers((current) => {
        if (!current) return current;
        return current.map((u) =>
          u.email === user.email
            ? { ...u, is_locked: action === "lock" ? "Y" : "N" }
            : u,
        );
      });

      setStatusDialog({
        open: true,
        type: "success",
        title: action === "lock" ? "Customer locked" : "Customer unlocked",
        message:
          data?.message ||
          (action === "lock"
            ? `Customer ${user.email} has been locked`
            : `Customer ${user.email} has been unlocked`),
        buttonText: "Done",
      });
    } catch (err: any) {
      setStatusDialog({
        open: true,
        type: "error",
        title: action === "lock" ? "Lock failed" : "Unlock failed",
        message:
          err?.message ||
          `Unable to ${action} this customer. Please try again.`,
        buttonText: "Close",
      });
    } finally {
      setBusyId(null);
    }
  };

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Users</h1>
          <p className="mt-1 text-sm text-muted">
            Search and manage customers and admin accounts.
          </p>
        </div>
        <Button
          trackLabel="Create user"
          onClick={() => setShowCreateUser(true)}
        >
          + Create User
        </Button>
      </div>

      {/* Users | Admins toggle */}
      <div className="mt-6 flex w-fit rounded-brand border border-border p-1">
        <button
          type="button"
          onClick={() => switchListMode("users")}
          className={clsx(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            listMode === "users"
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => switchListMode("admins")}
          className={clsx(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            listMode === "admins"
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Admins
        </button>
      </div>

      {/* ===================== USERS ===================== */}
      {listMode === "users" && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCurrentPage(1);
              }}
              className="flex-1"
            >
              <Input
                placeholder="Search by name, email, customer number…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </form>
            <div className="flex gap-2">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setCurrentPage(1);
                  }}
                  className={clsx(
                    "rounded-brand border px-3 py-2 text-sm font-medium",
                    statusFilter === s
                      ? "border-primary bg-background/10 text-primary"
                      : "border-border text-muted hover:bg-muted/10",
                  )}
                >
                  {s === "ALL"
                    ? "All"
                    : s === "ACTIVE"
                      ? "Active"
                      : "Inactive"}
                </button>
              ))}
            </div>
          </div>

          <Card className="mt-4 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <p className="text-sm text-muted">
                {users
                  ? `${totalCount || sortedUsers.length} customer${
                      (totalCount || sortedUsers.length) === 1 ? "" : "s"
                    }`
                  : "Loading…"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshUsers}
                disabled={refreshing || !accessToken}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    {renderSortHeader("Name", "account_name", "w-[18%]")}
                    {renderSortHeader(
                      "Customer No.",
                      "customer_no",
                      "w-[14%]",
                    )}
                    {renderSortHeader(
                      "Phone Number",
                      "phone_number",
                      "w-[14%]",
                    )}
                    {renderSortHeader(
                      "Date Created",
                      "created_at",
                      "w-[14%]",
                    )}
                    {renderSortHeader("Profile", "profile", "w-[10%]")}
                    <th className="px-6 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => {
                    const routeId = user.customer_no || String(user.id);

                    return (
                      <tr key={user.id} className="border-t border-border">
                        <td className="px-6 py-3">
                          <div className="font-medium text-foreground">
                            {user.account_name || "Unnamed Customer"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {user.email}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted">
                          {user.customer_no || "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted">
                          {user.phone_number || "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted">
                          {formatCreatedAt(user.created_at)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              isLocked(user)
                                ? "bg-danger/10 text-danger"
                                : user.profile === "Y"
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/10 text-warning",
                            )}
                          >
                            {isLocked(user)
                              ? "Locked"
                              : user.profile === "Y"
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-2">
                            {/* View: locked or active */}
                            {(isLocked(user) || user.profile === "Y") && (
                              <Link
                                href={{
                                  pathname: `/admin/users/${encodeURIComponent(routeId)}`,
                                  query: {
                                    name: user.account_name,
                                    email: user.email,
                                  },
                                }}
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  trackLabel={`View user:${user.account_name}`}
                                >
                                  View
                                </Button>
                              </Link>
                            )}

                            {/* Locked → Unlock */}
                            {isLocked(user) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-success/40 text-success hover:bg-success/10"
                                disabled={busyId === routeId}
                                onClick={() =>
                                  handleLockToggle(user, "unlock")
                                }
                              >
                                {busyId === routeId
                                  ? "Unlocking…"
                                  : "Unlock"}
                              </Button>
                            )}

                            {/* Active + not locked → Lock */}
                            {!isLocked(user) && user.profile === "Y" && (
                              <Button
                                size="sm"
                                className="bg-red-600 text-danger hover:bg-danger/10 hover:text-danger"
                                disabled={busyId === routeId}
                                onClick={() =>
                                  handleLockToggle(user, "lock")
                                }
                              >
                                {busyId === routeId ? "Locking…" : "Lock"}
                              </Button>
                            )}

                            {/* Inactive + not locked: no Activate here —
                                activation is on Associations page */}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {users && paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-6 text-center text-muted"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}

                  {!users && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-6 text-center text-muted"
                      >
                        Loading users...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {sortedUsers.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * PAGE_SIZE, sortedUsers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {sortedUsers.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
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
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
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
        </>
      )}

      {/* ===================== ADMINS ===================== */}
      {listMode === "admins" && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAdminPage(1);
              }}
              className="flex-1"
            >
              <Input
                placeholder="Search by name, email or role…"
                value={adminQuery}
                onChange={(e) => {
                  setAdminQuery(e.target.value);
                  setAdminPage(1);
                }}
              />
            </form>
            <div className="flex gap-2">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setAdminStatusFilter(s);
                    setAdminPage(1);
                  }}
                  className={clsx(
                    "rounded-brand border px-3 py-2 text-sm font-medium",
                    adminStatusFilter === s
                      ? "border-primary bg-background/10 text-primary"
                      : "border-border text-muted hover:bg-muted/10",
                  )}
                >
                  {s === "ALL"
                    ? "All"
                    : s === "ACTIVE"
                      ? "Active"
                      : "Inactive"}
                </button>
              ))}
            </div>
          </div>

          <Card className="mt-4 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <p className="text-sm text-muted">
                {admins
                  ? `${adminTotal || filteredAdmins.length} admin${
                      (adminTotal || filteredAdmins.length) === 1 ? "" : "s"
                    }`
                  : "Loading…"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshAdmins}
                disabled={adminRefreshing || !accessToken}
              >
                {adminRefreshing ? "Refreshing…" : "Refresh"}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">Role</th>
                    <th className="px-6 py-3 text-left font-medium">
                      Last login
                    </th>
                    <th className="px-6 py-3 text-left font-medium">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admins == null && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-6 text-center text-muted"
                      >
                        Loading admins…
                      </td>
                    </tr>
                  )}
                  {admins && paginatedAdmins.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-6 text-center text-muted"
                      >
                        No admins found.
                      </td>
                    </tr>
                  )}
                  {paginatedAdmins.map((admin) => {
                    const active = isAdminActive(admin);
                    return (
                      <tr key={admin.id} className="border-t border-border">
                        <td className="px-6 py-3">
                          <div className="font-medium text-foreground">
                            {admin.full_name || "—"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {admin.email}
                          </div>
                        </td>
                        <td className="px-6 py-3 capitalize text-muted">
                          {(admin.role || "—").replace(/_/g, " ")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted">
                          {formatCreatedAt(admin.last_login)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted">
                          {formatCreatedAt(admin.created_at)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              active
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning",
                            )}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAdmins.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(adminPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(adminPage * PAGE_SIZE, filteredAdmins.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {filteredAdmins.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                    disabled={adminPage === 1}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: adminTotalPages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setAdminPage(page)}
                      className={clsx(
                        "rounded-md px-3 py-1.5 text-sm",
                        adminPage === page
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-surface",
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAdminPage((p) =>
                        Math.min(adminTotalPages, p + 1),
                      )
                    }
                    disabled={adminPage === adminTotalPages}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Create only — no Activate modal on this page */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setShowCreateUser(false);
            if (listMode === "users") refreshUsers();
            else refreshAdmins();
          }}
        />
      )}

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

/* ============================================================
 * CREATE USER MODAL (unchanged behaviour)
 * ============================================================ */

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: session } = useSession();

  const [role, setRole] = useState<CreateRole>("viewer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
  });

  const isViewer = role === "viewer";

  const getAccessToken = () =>
    ((session as any)?.accessToken ||
      (session as any)?.access_token ||
      undefined) as string | undefined;

  const closeStatusDialog = () => {
    const wasSuccess = statusDialog.type === "success";
    setStatusDialog((prev) => ({ ...prev, open: false }));
    if (wasSuccess) {
      onCreated();
      onClose();
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = getAccessToken();
    if (!token) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Not authenticated",
        message: "You are not authenticated. Please log in again.",
        buttonText: "Close",
      });
      return;
    }

    if (!isViewer) {
      if (password !== confirmPassword) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Passwords do not match",
          message: "Please make sure both password fields are the same.",
          buttonText: "Close",
        });
        return;
      }
      if (password.length < 8) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Weak password",
          message: "Password must be at least 8 characters.",
          buttonText: "Close",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isViewer) {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim(),
        };

        const response = await fetch(
          `${ACCT_URL}api/v1/admin/customers/register`,
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

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "Unable to create user. Please try again.",
          );
        }

        setStatusDialog({
          open: true,
          type: "success",
          title: "User created",
          message:
            data?.message ||
            `${fullName.trim() || "The user"} has been registered successfully.`,
          buttonText: "Done",
        });
      } else {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirmPassword,
          role,
        };

        const response = await fetch(`${ACCT_URL}api/v1/admin/register`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "Unable to create admin user. Please try again.",
          );
        }

        setStatusDialog({
          open: true,
          type: "success",
          title: "Admin user created",
          message:
            data?.message ||
            `${fullName.trim() || "The user"} has been registered successfully.`,
          buttonText: "Done",
        });
      }
    } catch (err: any) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Creation failed",
        message: err?.message || "Unable to create user. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-brand border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isViewer ? "Create User" : "Create Admin User"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {isViewer
                ? "Register a new user account."
                : "Register a new administrator account."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-muted hover:text-foreground"
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CreateRole)}
                className="w-full rounded-brand border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="viewer">Customer User</option>
                <option value="super_admin">Admin User</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Full name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Firstname Lastname"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            {isViewer && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Phone number
                </label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08100008539"
                  maxLength={11}
                  required
                />
              </div>
            )}

            {!isViewer && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Confirm password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={8}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Creating…"
                : isViewer
                  ? "Create User"
                  : "Create Admin"}
            </Button>
          </div>
        </form>
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