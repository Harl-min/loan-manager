import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import type {
  LoanScheduleItem,
  LoanScheduleResponse,
  LoanAccountHistoryItem,
  LoanAccountHistoryResponse,
} from "@/types/loan";

import {
  LoanStatistics,
  LoanStatisticsResponse,
} from "@/types/loanSummary";

import AdminLoanDetailClient from "@/components/AdminTabs";

type Props = {
  params: {
    id: string;
    loanId: string;
  };
};

export default async function AdminLoanDetailPage({
  params,
}: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  /*
   * IMPORTANT:
   *
   * loanId is NOT a Prisma loan ID anymore.
   *
   * It is the account number coming directly
   * from CustomerDetailPage.
   *
   * Example:
   *
   * /admin/users/123/loans/5000152687
   *
   * params.loanId = "5000152687"
   */
  const accountNo = params.loanId;

  if (!accountNo) {
    notFound();
  }

  const BASE_URL = process.env.NEXT_DATA_API_URL;

  let statistics: LoanStatistics | null = null;
  let transactions: LoanAccountHistoryItem[] = [];
  let schedule: LoanScheduleItem[] = [];

  let apiError = false;

  if (!BASE_URL) {
    console.error("NEXT_DATA_API_URL is not configured.");
    apiError = true;
  } else {
    /*
     * =========================================================
     * LOAN STATISTICS
     * =========================================================
     *
     * Uses the account number received from the account list.
     */
    try {
      const response = await fetch(
        `${BASE_URL}/loanStatistics/loanStatisticsRestService/execute?acctNum=${encodeURIComponent(
          accountNo
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Loan statistics API returned ${response.status}`
        );
      }

      const data: LoanStatisticsResponse =
        await response.json();

      statistics =
        data.loanstatisticsdbReferenceOutput?.[0] ?? null;

      if (!statistics) {
        apiError = true;
      }
    } catch (error) {
      console.error(
        `Failed to fetch loan statistics for ${accountNo}:`,
        error
      );

      apiError = true;
    }

    /*
     * =========================================================
     * ACCOUNT HISTORY
     * =========================================================
     */
    try {
      const response = await fetch(
        `${BASE_URL}/loanAccountHistory/loanAccountHistoryRestService/loanAccountHistory?LoanAccountNo=${encodeURIComponent(
          accountNo
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Loan account history API returned ${response.status}`
        );
      }

      const data: LoanAccountHistoryResponse =
        await response.json();

      transactions =
        data.loanAccountHistoryBusinessServiceOutput ?? [];
    } catch (error) {
      console.error(
        `Failed to fetch account history for ${accountNo}:`,
        error
      );

      /*
       * Keep the page available even if history fails.
       */
      transactions = [];
    }

    /*
     * =========================================================
     * REPAYMENT SCHEDULE
     * =========================================================
     */
    try {
      const response = await fetch(
        `${BASE_URL}/loanRepaymentSchedule/loanScheduleRestService/loanSchedule?loanAccount=${encodeURIComponent(
          accountNo
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Loan repayment schedule API returned ${response.status}`
        );
      }

      const data: LoanScheduleResponse =
        await response.json();

      schedule =
        data.loanScheduledbReferenceOutput ?? [];
    } catch (error) {
      console.error(
        `Failed to fetch repayment schedule for ${accountNo}:`,
        error
      );

      /*
       * Keep the page available even if schedule fails.
       */
      schedule = [];
    }
  }

  return (
    <AdminLoanDetailClient
      accountNo={accountNo}
      statistics={statistics}
      transactions={transactions}
      schedule={schedule}
      customerId={params.id}
      apiError={apiError}
    />
  );
}