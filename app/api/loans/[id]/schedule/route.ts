import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const loan = await prisma.loanAccount.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!loan) {
      return NextResponse.json(
        { error: "Loan not found" },
        { status: 404 }
      );
    }

    const url =
      `${process.env.NEXT_DATA_API_URL}` +
      `/loanRepaymentSchedule/loanScheduleRestService/loanSchedule` +
      `?loanAccount=${encodeURIComponent(loan.accountNumber)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to retrieve loan schedule" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      schedule: data.loanScheduledbReferenceOutput ?? [],
    });
  } catch (error) {
    console.error("Loan schedule API error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve loan schedule" },
      { status: 500 }
    );
  }
}