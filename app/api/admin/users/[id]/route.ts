import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users/[id] — customer profile + loan portfolio (for the
// admin's "View Customer Dashboard" screen).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, role: true, isBlocked: true, emailVerified: true,
      phone: true, mailingAddress: true, createdAt: true,
      loans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user });
}

// PATCH /api/admin/users/[id] — modify customer/user profile, role, or
// blocked status (block/unblock is just isBlocked: true/false).
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  mailingAddress: z.string().optional(),
  role: z.enum(["BORROWER", "ADMIN"]).optional(),
  isBlocked: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  if (params.id === (session!.user as any).id && parsed.data.isBlocked) {
    return NextResponse.json({ error: "You can't block your own account." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ user });
}
