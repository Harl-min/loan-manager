"use client";

import { useEffect, useMemo, useState } from "react";
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

type AdminUserOption = {
  id: string;
  name: string;
  email: string;
};

type SortKey = "user" | "label" | "path" | "createdAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

export default function UserActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [userId, setUserId] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api
      .get<{ users: AdminUserOption[] }>("/admin/users")
      .then((r) => setUsers(r.users));
  }, []);

  useEffect(() => {
    setCurrentPage(1);

    const qs = userId ? `?userId=${userId}` : "";

    api
      .get<{ events: ActivityEvent[] }>(`/events${qs}`)
      .then((r) => setEvents(r.events));
  }, [userId]);

  const sortedEvents = useMemo(() => {
    if (!events) return [];

    return [...events].sort((a, b) => {
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
  }, [events, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedEvents.length / PAGE_SIZE);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedEvents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedEvents, currentPage]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);

      // Dates default to descending.
      // Text columns default to ascending.
      setSortDirection(key === "createdAt" ? "desc" : "asc");
    }

    setCurrentPage(1);
  };

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  const renderSortHeader = (
    label: string,
    key: SortKey,
    width: string
  ) => (
    <th className={`${width} px-6 py-3 text-left font-medium`}>
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
      >
        <span>{label}</span>
        <span className="text-[11px]">
          {getSortArrow(key)}
        </span>
      </button>
    </th>
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            User Activity
          </h1>

          <p className="mt-1 text-sm text-muted">
            Every button/link click across the app, captured automatically
            and logged to the database.
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

      <Card className="mt-6 overflow-hidden p-0">
        <table className="w-full mt-[-1rem] table-fixed text-sm">
          <thead className="text-xs text-muted">
            <tr>
              {renderSortHeader("User", "user", "w-[25%]")}
              {renderSortHeader("Action", "label", "w-[25%]")}
              {renderSortHeader("Page", "path", "w-[25%]")}
              {renderSortHeader("When", "createdAt", "w-[25%]")}
            </tr>
          </thead>

          <tbody>
            {paginatedEvents.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="break-words px-6 py-3 text-muted">
                  {e.user?.email}
                </td>

                <td className="break-words px-6 py-3 font-medium text-foreground">
                  {e.label}
                </td>

                <td className="break-all px-6 py-3 text-muted">
                  {e.path}
                </td>

                <td className="whitespace-nowrap px-6 py-3 text-muted">
                  {fmtDate(e.createdAt)}
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
                {Math.min(
                  currentPage * PAGE_SIZE,
                  sortedEvents.length
                )}
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

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (
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
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
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
    </div>
  );
}