"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type ActivityEvent = {
  id: string;
  label: string;
  path: string;
  createdAt: string;
  user: { name: string; email: string } | null;
};

type AdminUserOption = { id: string; name: string; email: string };

export default function UserActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    api.get<{ users: AdminUserOption[] }>("/admin/users").then((r) => setUsers(r.users));
  }, []);

  useEffect(() => {
    const qs = userId ? `?userId=${userId}` : "";
    api.get<{ events: ActivityEvent[] }>(`/events${qs}`).then((r) => setEvents(r.events));
  }, [userId]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Activity</h1>
          <p className="mt-1 text-sm text-muted">
            Every button/link click across the app, captured automatically and logged to the database.
          </p>
        </div>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          data-track-label="Activity user filter"
          className="rounded-brand border border-border px-3 py-2 text-sm"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.email}
            </option>
          ))}
        </select>
      </div>

      <Card className="mt-6 p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="px-6 py-3 text-left font-medium">User</th>
              <th className="px-6 py-3 text-left font-medium">Action</th>
              <th className="px-6 py-3 text-left font-medium">Page</th>
              <th className="px-6 py-3 text-left font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {events?.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-6 py-3 text-muted">{e.user?.email ?? "anonymous"}</td>
                <td className="px-6 py-3 font-medium text-foreground">{e.label}</td>
                <td className="px-6 py-3 text-muted">{e.path}</td>
                <td className="px-6 py-3 text-muted">{fmtDate(e.createdAt)}</td>
              </tr>
            ))}
            {events?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-muted">
                  No activity logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
