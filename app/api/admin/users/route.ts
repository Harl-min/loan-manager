import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users?role=BORROWER&q=jane — list/search users
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const role = req.nextUrl.searchParams.get("role");
  const q = req.nextUrl.searchParams.get("q");

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, isBlocked: true,
      emailVerified: true, phone: true, createdAt: true,
      _count: { select: { loans: true } },
    },
  });

  return NextResponse.json({ users });
}

// POST /api/admin/users — admin creates an end-user (or another admin)
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["BORROWER", "ADMIN"]).default("BORROWER"),
  phone: z.string().optional(),
  mailingAddress: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { name, email, password, role, phone, mailingAddress } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Admin-created accounts are pre-verified — no OTP hoop for staff to jump through.
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash, role, phone, mailingAddress, emailVerified: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
