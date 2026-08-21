"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "BORROWER" | "ADMIN";
  isBlocked: boolean;
  emailVerified: boolean;
  phone: string | null;
  mailingAddress?: string | null;
  createdAt: string;
  _count: {
    loans: number;
  };
};

type SortKey = "name" | "email" | "role" | "loans" | "status" | "createdAt";

type SortDirection = "asc" | "desc";
type RoleFilter = "ALL" | "BORROWER" | "ADMIN";

type UserStatus = "active" | "inactive" | "blocked";

const PAGE_SIZE = 10;

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [currentPage, setCurrentPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);

  const [creatingUser, setCreatingUser] = useState(false);

  const [createError, setCreateError] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "BORROWER" as "BORROWER" | "ADMIN",
    phone: "",
    mailingAddress: "",
  });

  /*
   * ------------------------------------------------------------
   * LOAD USERS
   * ------------------------------------------------------------
   */

  const loadUsers = () => {
    api
      .get<{ users: AdminUser[] }>("/admin/users")
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /*
   * ------------------------------------------------------------
   * USER STATUS
   *
   * Blocked always takes priority.
   *
   * blocked
   *    ↓
   * BLOCKED
   *
   * otherwise:
   *
   * loans === 0
   *    ↓
   * INACTIVE
   *
   * loans > 0
   *    ↓
   * ACTIVE
   * ------------------------------------------------------------
   */

  const getUserStatus = (user: AdminUser): UserStatus => {
    if (user.isBlocked) {
      return "blocked";
    }

    if (user._count.loans === 0) {
      return "inactive";
    }

    return "active";
  };

  /*
   * ------------------------------------------------------------
   * SEARCH + ROLE FILTER
   * ------------------------------------------------------------
   */

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    const search = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);

      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, query, roleFilter]);

  /*
   * ------------------------------------------------------------
   * SORT
   * ------------------------------------------------------------
   */

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortKey) {
        case "name":
          valueA = a.name;
          valueB = b.name;
          break;

        case "email":
          valueA = a.email;
          valueB = b.email;
          break;

        case "role":
          valueA = a.role;
          valueB = b.role;
          break;

        case "loans":
          valueA = a._count.loans;
          valueB = b._count.loans;
          break;

        case "status":
          valueA = getUserStatus(a);
          valueB = getUserStatus(b);
          break;

        case "createdAt":
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
          break;
      }

      let comparison: number;

      if (typeof valueA === "number" && typeof valueB === "number") {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredUsers, sortKey, sortDirection]);

  /*
   * ------------------------------------------------------------
   * PAGINATION
   * ------------------------------------------------------------
   */

  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return sortedUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  /*
   * ------------------------------------------------------------
   * SORT HANDLER
   * ------------------------------------------------------------
   */

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);

      setSortDirection(key === "createdAt" ? "desc" : "asc");
    }

    setCurrentPage(1);
  };

  /*
   * ------------------------------------------------------------
   * SORT ARROW
   * ------------------------------------------------------------
   */

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  /*
   * ------------------------------------------------------------
   * SORT HEADER
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * CREATE USER FORM
   * ------------------------------------------------------------
   */

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreateError("");
    setCreatingUser(true);

    try {
      await api.post("/admin/users", {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        phone: createForm.phone || undefined,
        mailingAddress: createForm.mailingAddress || undefined,
      });

      // Reset form
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "BORROWER",
        phone: "",
        mailingAddress: "",
      });

      setShowCreateUser(false);

      // Refresh table
      loadUsers();

      // Start from first page
      setCurrentPage(1);
    } catch (error: any) {
      setCreateError(
        error?.message ?? "Unable to create user. Please try again.",
      );
    } finally {
      setCreatingUser(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * BLOCK / UNBLOCK
   * ------------------------------------------------------------
   */

  const toggleBlock = async (user: AdminUser) => {
    setBusyId(user.id);

    try {
      await api.patch(`/admin/users/${user.id}`, {
        isBlocked: !user.isBlocked,
      });

      loadUsers();
    } catch (error) {
      console.error("Failed to update blocked status", error);
    } finally {
      setBusyId(null);
    }
  };

  /*
   * ------------------------------------------------------------
   * ACTIVATE
   * ------------------------------------------------------------
   */

  const activateUser = async (user: AdminUser) => {
    setBusyId(user.id);

    try {
      await api.patch(`/admin/users/${user.id}`, {
        emailVerified: true,
      });

      loadUsers();
    } catch (error) {
      console.error("Failed to activate user", error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>

          <p className="mt-1 text-sm text-muted">
            Search and manage customer accounts.
          </p>
        </div>
        <Button trackLabel="Create user" onClick={() => setShowCreateUser(true)}>
          + Create User
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadUsers();
          }}
          className="flex-1"
        >
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          {(["ALL", "BORROWER", "ADMIN"] as const).map((r) => (
            <button
              key={r}
              type="button"
              data-track-label={`Role filter:${r}`}
              onClick={() => setRoleFilter(r)}
              className={clsx(
                "rounded-brand border px-3 py-2 text-sm font-medium",
                roleFilter === r
                  ? "border-foreground bg-muted/10 text-foreground"
                  : "border-border text-muted hover:bg-muted/10"
              )}
            >
              {r === "ALL" ? "All" : r === "BORROWER" ? "Customers" : "Admins"}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              {renderSortHeader("Name", "name", "w-[17%]")}

              {renderSortHeader("Email", "email", "w-[21%]")}

              {renderSortHeader("Role", "role", "w-[11%]")}

              {renderSortHeader("Loans", "loans", "w-[9%]")}

              {renderSortHeader("Status", "status", "w-[12%]")}

              {renderSortHeader("Joined", "createdAt", "w-[13%]")}

              <th className="w-[17%] px-6 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.map((user) => {
              const status = getUserStatus(user);

              return (
                <tr key={user.id} className="border-t border-border">
        <td className="px-6 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    data-track-label={`View user:${user.name}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {user.name}
                  </Link>
                </td>
                  {/* EMAIL */}

                  <td className="break-all px-6 py-3 text-muted">
                    {user.email}
                  </td>

                  {/* ROLE */}

                  <td className="px-6 py-3 text-muted">
                    {user.role === "BORROWER" ? "Borrower" : "Admin"}
                  </td>

                  {/* LOANS */}

                  <td className="px-6 py-3 text-muted">{user._count.loans}</td>

                  {/* STATUS */}

                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "blocked"
                          ? "bg-danger/10 text-danger"
                          : status === "inactive"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                      }`}
                    >
                      {status === "blocked"
                        ? "Blocked"
                        : status === "inactive"
                          ? "Inactive"
                          : "Active"}
                    </span>
                  </td>

                  {/* JOINED */}

                  <td className="whitespace-nowrap px-6 py-3 text-muted">
                    {fmtDate(user.createdAt)}
                  </td>

                  {/* ACTIONS */}

                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      {/* EDIT */}

                      <Link href={`/admin/users/${user.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          trackLabel={`Edit user:${user.name}`}
                        >
                          Edit
                        </Button>
                      </Link>

                      {/* BLOCKED → UNBLOCK */}

                      {status === "blocked" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === user.id}
                          trackLabel={`Unblock:${user.name}`}
                          onClick={() => toggleBlock(user)}
                        >
                          {busyId === user.id ? "Unblocking..." : "Unblock"}
                        </Button>
                      )}

                      {/* INACTIVE → ACTIVATE */}

                      {status === "inactive" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === user.id}
                          trackLabel={`Activate:${user.name}`}
                          onClick={() => activateUser(user)}
                        >
                          {busyId === user.id ? "Activating..." : "Activate"}
                        </Button>
                      )}

                      {/* ACTIVE → BLOCK */}

                      {status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === user.id}
                          trackLabel={`Block:${user.name}`}
                          onClick={() => toggleBlock(user)}
                        >
                          {busyId === user.id ? "Blocking..." : "Block"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users && paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-muted">
                  No users found.
                </td>
              </tr>
            )}

            {!users && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-muted">
                  Loading users...
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ======================================================
            PAGINATION
        ======================================================= */}

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
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-surface"
                    }`}
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
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setShowCreateUser(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"BORROWER" | "ADMIN">("BORROWER");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/admin/users", { name, email, password, role, phone });
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Couldn't create that user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Create User</h2>
          <button
            type="button"
            data-track-label="Close create user modal"
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Temporary password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
            <div className="flex gap-2">
              {(["BORROWER", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  data-track-label={`New user role:${r}`}
                  onClick={() => setRole(r)}
                  className={clsx(
                    "flex-1 rounded-brand border px-3 py-2 text-sm font-medium",
                    role === r
                      ? "border-foreground bg-muted/10 text-foreground"
                      : "border-border text-muted hover:bg-muted/10"
                  )}
                >
                  {r === "BORROWER" ? "Customer" : "Admin"}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" trackLabel="Submit new user" disabled={loading}>
              {loading ? "Creating…" : "Create user"}
            </Button>
            <Button type="button" variant="secondary" trackLabel="Cancel create user" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
