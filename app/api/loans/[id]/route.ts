import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session.user as any).id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      documents: { orderBy: { date: "desc" } },
    },
  });

  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ loan });
}
