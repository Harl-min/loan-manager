import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AmortizationSchedule from "@/components/AmortizationSchedule";
import { Card } from "@/components/ui/Card";

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

type LoanScheduleResponse = {
  loanScheduledbReferenceOutput: LoanScheduleItem[];
};

export default async function SchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }
  const accountNo = params.id;
  const BASE_URL = process.env.NEXT_DATA_API_URL;

  let schedule: LoanScheduleItem[] = [];
  let apiError = false;
    if (BASE_URL && accountNo) {
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

    const data: LoanScheduleResponse = await response.json();
    console.log("Loan repayment schedule data:", data);
    schedule = data.loanScheduledbReferenceOutput ?? [];
  if (!data) {
        apiError = true;
      }
    } catch (error) {
      console.error(
        `Failed to fetch loan statistics for ${accountNo}:`,
        error
      );

      apiError = true;
    }
  } else {
    apiError = true;
  }

  return (
    <div>
      <h2 className="mb-3 font-semibold text-foreground">
        Amortization Schedule
      </h2>

      <AmortizationSchedule schedule={schedule} />
       {/* API UNAVAILABLE */}
      {apiError && (
        <Card className="border border-warning/30 bg-warning/10">
          <div className="text-sm font-medium text-foreground">
            Loan information unavailable
          </div>

          <p className="mt-1 text-sm text-muted">
            We could not retrieve the latest information
            for this account. Please try again later.
          </p>
        </Card>
      )}

    </div>
  );
}