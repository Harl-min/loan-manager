import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  method: z.string(),
  allocation: z.enum(["standard", "principal_only", "custom"]),
  amount: z.number().positive(),
  scheduledAt: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session.user as any).id },
  });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  const { method, allocation, amount, scheduledAt } = parsed.data;

  const payment = await prisma.payment.create({
    data: { loanId: loan.id, method, allocation, amount, scheduledAt: new Date(scheduledAt) },
  });

  await prisma.transaction.create({
    data: {
      loanId: loan.id,
      type: "payment",
      label: "Monthly payment",
      amount: -amount,
      date: new Date(scheduledAt),
    },
  });

  const principalPortion = allocation === "principal_only" ? amount : amount * 0.92;
  await prisma.loanAccount.update({
    where: { id: loan.id },
    data: {
      principal: Math.max(0, loan.principal - principalPortion),
      ytdPrincipalPaid: loan.ytdPrincipalPaid + principalPortion,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
