// app/api/admin/customer-accounts/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_DATA_API_URL;

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json(
      { success: false, message: "Loan API base URL is not configured", accounts: [] },
      { status: 503 }
    );
  }

  const custNum = request.nextUrl.searchParams.get("custNum");

  if (!custNum) {
    return NextResponse.json(
      { success: false, message: "custNum is required", accounts: [] },
      { status: 400 }
    );
  }

  try {
    const loanListResponse = await fetch(
      `${BASE_URL}/loanList/loanListRestService/loanList?custNum=${encodeURIComponent(custNum)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!loanListResponse.ok) {
      throw new Error(`Loan list API returned ${loanListResponse.status}`);
    }

    const loanListData = await loanListResponse.json();
    const accounts = loanListData.loanListdbReferenceOutput ?? [];

    const accountsWithStatistics = await Promise.all(
      accounts.map(async (account: any) => {
        try {
          const statisticsResponse = await fetch(
            `${BASE_URL}/loanStatistics/loanStatisticsRestService/execute?acctNum=${encodeURIComponent(
              account.ACCT_NO
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

          if (!statisticsResponse.ok) {
            throw new Error(`Statistics API returned ${statisticsResponse.status}`);
          }

          const statisticsData = await statisticsResponse.json();
          const statistics =
            statisticsData.loanstatisticsdbReferenceOutput?.[0] ?? null;

          return { ...account, statistics };
        } catch (error) {
          console.error(`Failed to fetch statistics for account ${account.ACCT_NO}:`, error);
          return { ...account, statistics: null };
        }
      })
    );

    return NextResponse.json({
      success: true,
      accounts: accountsWithStatistics,
    });
  } catch (error) {
    console.error("Failed to fetch customer accounts:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve customer loan accounts",
        accounts: [],
      },
      { status: 503 }
    );
  }
}