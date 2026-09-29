"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useSession } from "next-auth/react";
const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

type AuditRecord = {
  id: number;
  email: string;
  user_name: string;
  action: string;
  page: string;
  when_logged: string;
  created_at: string;
  ip_address: string;
};

type AuditLogsResponse = {
  total: number;
  page: number;
  page_size: number;
  records: AuditRecord[];
};

/** Normalized shape used by the table (same columns as before) */
type ActivityEvent = {
  id: string;
  label: string; // action
  path: string; // page
  createdAt: string; // when_logged or created_at
  user: { name: string; email: string } | null;
  ipAddress?: string;
};

type AdminUserOption = {
  id: string; // email used as stable key
  name: string;
  email: string;
};

type SortKey = "user" | "label" | "path" | "createdAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

export default function UserActivityPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accessToken =
    ((session as any)?.accessToken as string | undefined) ||
    ((session as any)?.access_token as string | undefined);

  const loadAuditLogs = useCallback(
    async (isRefresh = false) => {
      if (!ACCT_URL) {
        setError("Auth service URL is not configured.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!accessToken) {
        // Wait for session; don't hard-fail on first paint
        if (sessionStatus === "loading") return;
        setError("You must be signed in to view audit logs.");
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${ACCT_URL}api/v1/admin/audit-logs?page_num=1&page_size=2000`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load audit logs (${response.status})`);
        }

        const data = (await response.json()) as AuditLogsResponse;

        const mapped: ActivityEvent[] = (data.records ?? []).map((r) => ({
          id: String(r.id),
          label: r.action ?? "",
          path: r.page ?? "",
          createdAt: r.when_logged || r.created_at,
          user: r.email
            ? { name: r.user_name || r.email, email: r.email }
            : null,
          ipAddress: r.ip_address,
        }));

        setEvents(mapped);

        const byEmail = new Map<string, AdminUserOption>();
        for (const r of data.records ?? []) {
          if (!r.email) continue;
          if (!byEmail.has(r.email)) {
            byEmail.set(r.email, {
              id: r.email,
              name: r.user_name || r.email,
              email: r.email,
            });
          }
        }
        setUsers(
          Array.from(byEmail.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load audit logs.");
        if (!isRefresh) setEvents([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, sessionStatus],
  );

  // Initial load + reload when token becomes available
  useEffect(() => {
    if (sessionStatus === "loading") return;
    void loadAuditLogs(false);
  }, [loadAuditLogs, sessionStatus]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmail]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!selectedEmail) return events;
    return events.filter((e) => e.user?.email === selectedEmail);
  }, [events, selectedEmail]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortKey) {
        case "user":
          valueA = a.user?.email ?? "anonymous";
          valueB = b.user?.email ?? "anonymous";
          break;
        case "label":
          valueA = a.label;
          valueB = b.label;
          break;
        case "path":
          valueA = a.path;
          valueB = b.path;
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
  }, [filteredEvents, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / PAGE_SIZE));

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedEvents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedEvents, currentPage]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "createdAt" ? "desc" : "asc");
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

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Activity</h1>
          <p className="mt-1 text-sm text-muted">
            Log of actions across the app.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAuditLogs(true)}
            disabled={loading || refreshing}
            data-track-label="Refresh activity"
            className="inline-flex items-center gap-2 rounded-brand border border-border px-3 py-2 text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className={refreshing ? "inline-block animate-spin" : undefined}
              aria-hidden
            >
              ↻
            </span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <select
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            data-track-label="Activity user filter"
            className="rounded-brand border border-border px-3 py-2 text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name} — {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        {loading && (
          <div className="px-6 py-8 text-center text-sm text-muted">
            Loading audit logs…
          </div>
        )}

        {error && !loading && (
          <div className="px-6 py-8 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <table className="mt-[-1rem] w-full table-fixed text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  {renderSortHeader("User", "user", "w-[30%]")}
                  {renderSortHeader("Action", "label", "w-[25%]")}
                  {renderSortHeader("Page", "path", "w-[25%]")}
                  {renderSortHeader("When", "createdAt", "w-[25%]")}
                  <th className="w-[25%] px-6 py-3 text-left font-medium">
                    IP
                  </th>{" "}
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="break-words px-6 py-3 text-muted">
                      <div className="font-medium text-foreground">
                        {e.user?.name ?? "—"}
                      </div>
                      <div className="text-xs">
                        {e.user?.email ?? "anonymous"}
                      </div>
                    </td>
                    <td className="break-words px-6 py-3 font-medium text-foreground">
                      {e.label}
                    </td>
                    <td className="break-all px-6 py-3 text-muted">{e.path}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-muted">
                      {fmtDate(e.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-muted">
                      {e.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}

                {events?.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-6 text-center text-muted"
                    >
                      No activity logged yet.
                    </td>
                  </tr>
                )}

                {events && events.length > 0 && filteredEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-6 text-center text-muted"
                    >
                      No activity for the selected user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {sortedEvents.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * PAGE_SIZE, sortedEvents.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {sortedEvents.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
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
          </>
        )}
      </Card>
    </div>
  );
}
