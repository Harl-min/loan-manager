import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ACCT_URL = process.env.NEXT_DATA_AUTH_URL; 

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

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event payload" },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  const accessToken =
    (session as any)?.accessToken ||
    (session as any)?.access_token ||
    undefined;

  if (!ACCT_URL) {
    return NextResponse.json(
      { error: "Auth service URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${ACCT_URL.replace(/\/$/, "")}/api/v1/admin/user-activity`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          sessionId: parsed.data.sessionId,
          events: parsed.data.events,
          // optional context if the API accepts it
          userId: (session?.user as any)?.id,
          email: session?.user?.email ?? undefined,
        }),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.message ||
            data?.error ||
            "Failed to record activity",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: 201 });
  } catch (error) {
    console.error("user-activity proxy error:", error);
    return NextResponse.json(
      { error: "Unable to reach activity service." },
      { status: 502 },
    );
  }
} 