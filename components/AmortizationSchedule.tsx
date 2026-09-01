"use client";

import { useMemo, useState } from "react";
import { fmtCurrency } from "@/lib/format";
import { Card } from "./ui/Card";

type LoanScheduleItem = {
  InstallmentNo: number;
  LoanAccount: string;
  DueDate: string;
  EventType: string;
  CurrencyCode: string;
  PrincipalAmount: number;
  InterestAmount: number;
  FeeAmount: number;
  LateFeeAmount: number;
  TotalAmount: number;
  ServicedAmount: number;
  UnservicedAmount: number;
  ServicedDate: string | null;
};

type AmortizationScheduleProps = {
  schedule: LoanScheduleItem[];
};

type SortField = "date" | "balance";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function AmortizationSchedule({
  schedule,
}: AmortizationScheduleProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  const sortedSchedule = useMemo(() => {
    return [...schedule].sort((a, b) => {
      let comparison = 0;

      if (sortField === "date") {
        // API date format: DD-MM-YYYY
        const [aDay, aMonth, aYear] = a.DueDate.split("-").map(Number);
        const [bDay, bMonth, bYear] = b.DueDate.split("-").map(Number);

        const aDate = new Date(aYear, aMonth - 1, aDay).getTime();
        const bDate = new Date(bYear, bMonth - 1, bDay).getTime();

        comparison = aDate - bDate;
      }

      if (sortField === "balance") {
        comparison = a.UnservicedAmount - b.UnservicedAmount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [schedule, sortField, sortDirection]);

  const totalPages = Math.ceil(
    sortedSchedule.length / ITEMS_PER_PAGE
  );

  const paginatedSchedule = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return sortedSchedule.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [sortedSchedule, currentPage]);

  const startItem =
    sortedSchedule.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(
    currentPage * ITEMS_PER_PAGE,
    sortedSchedule.length
  );

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return "↕";
    }

    return sortDirection === "asc" ? "↑" : "↓";
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
  };

  if (schedule.length === 0) {
    return (
      <div className="rounded-brand border border-border px-6 py-8 text-center text-sm text-muted">
        No repayment schedule found.
      </div>
    );
  }

  return (
    <Card className="py-3">
      <div className="max-h-90 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-xs text-muted">
            <tr>
              <th className="px-6 py-2 text-left font-medium">
                #
              </th>

              <th className="px-6 py-2 text-left font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("date")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Date
                  <span className="text-[11px]">
                    {getSortIcon("date")}
                  </span>
                </button>
              </th>

              <th className="px-6 py-2 text-right font-medium">
                Principal
              </th>

              <th className="px-6 py-2 text-right font-medium">
                Interest
              </th>

               <th className="px-6 py-2 text-right font-medium">
                Monthly Payment
              </th>

              <th className="px-6 py-2 text-right font-medium">
                Amount Paid
              </th>

              <th className="px-6 py-2 text-right font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("balance")}
                  className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
                >
                  Outstanding
                  <span className="text-[11px]">
                    {getSortIcon("balance")}
                  </span>
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedSchedule.map((r, index) => (
              <tr
                key={`${r.InstallmentNo}-${r.DueDate}-${r.EventType}-${index}`}
                className="border-t border-border"
              >
                <td className="px-6 py-2.5 text-muted">
                  {r.InstallmentNo}
                </td>

                <td className="px-6 py-2.5">
                  {r.DueDate}
                </td>

                <td className="px-6 py-2.5 text-right">
                  {fmtCurrency(r.PrincipalAmount)}
                </td>

                <td className="px-6 py-2.5 text-right text-muted">
                  {fmtCurrency(r.InterestAmount)}
                </td>

                <td className="px-6 py-2.5 text-right font-semibold text-foreground">
                  {fmtCurrency(r.TotalAmount)}
                </td>
                <td className="px-6 py-2.5 text-right  text-foreground">
                  {fmtCurrency(r.ServicedAmount)}
                </td>
                <td className="px-6 py-2.5 text-right font-semibold text-foreground">
                  {fmtCurrency(r.UnservicedAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <p className="text-xs text-muted">
          Showing {startItem}-{endItem} of{" "}
          {sortedSchedule.length}
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-brand border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-40"
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
              onClick={() => goToPage(page)}
              className={`min-w-[32px] rounded-brand px-2 py-1.5 text-xs font-medium transition ${
                currentPage === page
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-muted/20"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-brand border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}