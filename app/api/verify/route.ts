import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email(), code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, code },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "That code is invalid or has expired." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await prisma.otpCode.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
