"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  createdAt: string;
  _count: { loans: number };
};

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "BORROWER" | "ADMIN">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (query) params.set("q", query);
    const res = await api.get<{ users: AdminUser[] }>(`/admin/users?${params.toString()}`);
    setUsers(res.users);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  async function toggleBlock(u: AdminUser) {
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { isBlocked: !u.isBlocked });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>
          <p className="mt-1 text-sm text-muted">Create, modify, block, or unblock user accounts.</p>
        </div>
        <Button trackLabel="Create user" onClick={() => setShowCreate(true)}>
          + Create User
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
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
              <th className="px-6 py-3 text-left font-medium">Name</th>
              <th className="px-6 py-3 text-left font-medium">Email</th>
              <th className="px-6 py-3 text-left font-medium">Role</th>
              <th className="px-6 py-3 text-left font-medium">Loans</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
              <th className="px-6 py-3 text-left font-medium">Joined</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-6 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    data-track-label={`View user:${u.name}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="px-6 py-3 text-muted">{u.email}</td>
                <td className="px-6 py-3">
                  <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs font-medium text-foreground">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-muted">{u._count.loans}</td>
                <td className="px-6 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      u.isBlocked ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                    )}
                  >
                    {u.isBlocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-3 text-muted">{fmtDate(u.createdAt)}</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/users/${u.id}`}>
                      <Button variant="secondary" size="sm" trackLabel={`Edit user:${u.name}`}>
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant={u.isBlocked ? "secondary" : "outline"}
                      size="sm"
                      disabled={busyId === u.id}
                      trackLabel={u.isBlocked ? `Unblock:${u.name}` : `Block:${u.name}`}
                      onClick={() => toggleBlock(u)}
                    >
                      {u.isBlocked ? "Unblock" : "Block"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-muted">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
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
