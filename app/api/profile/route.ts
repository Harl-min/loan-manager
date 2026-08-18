import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      name: true, email: true, phone: true, mailingAddress: true, emailVerified: true,
      paperlessBilling: true, remindPaymentDue: true, notifyPaymentPosted: true, notifySecurityAlerts: true,
    },
  });
  return NextResponse.json({ user });
}

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  mailingAddress: z.string().optional(),
  paperlessBilling: z.boolean().optional(),
  remindPaymentDue: z.boolean().optional(),
  notifyPaymentPosted: z.boolean().optional(),
  notifySecurityAlerts: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: parsed.data,
  });

  return NextResponse.json({ user });
}
