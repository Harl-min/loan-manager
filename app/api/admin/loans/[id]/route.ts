import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/loans/[id] — a customer's loan, unscoped by the caller's
// own userId (unlike the borrower-facing /api/loans/[id] route), since an
// admin needs to be able to view any customer's loan.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const loan = await prisma.loanAccount.findUnique({
    where: { id: params.id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      documents: { orderBy: { date: "desc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ loan });
}
