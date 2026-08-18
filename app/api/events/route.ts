import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  label: z.string().max(200),
  elementId: z.string().max(200).optional(),
  path: z.string().max(500),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

const bodySchema = z.object({
  sessionId: z.string(),
  events: z.array(eventSchema).min(1).max(50),
});

/**
 * Ingests batched UI-activity events (every button/link click across the
 * app — see lib/tracking.ts + components/ClickTracker.tsx) and writes them
 * to the DB. Works whether it's called from the browser directly or
 * relayed through an external gateway — it only needs a JSON body.
 */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  await prisma.clickEvent.createMany({
    data: parsed.data.events.map((e) => ({
      userId,
      sessionId: parsed.data.sessionId,
      label: e.label,
      elementId: e.elementId,
      path: e.path,
      metadata: e.metadata ? JSON.stringify(e.metadata) : null,
      createdAt: new Date(e.timestamp),
    })),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Lightweight read endpoint — handy for an admin activity view. Admin-only. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await prisma.clickEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ events });
}
