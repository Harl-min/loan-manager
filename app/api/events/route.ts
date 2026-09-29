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

  if (!ACCT_URL) {
    return NextResponse.json(
      { error: "Auth service URL is not configured." },
      { status: 503 },
    );
  }

  const session = await getServerSession(authOptions);
  const accessToken =
    (session as { accessToken?: string; access_token?: string } | null)
      ?.accessToken ||
    (session as { accessToken?: string; access_token?: string } | null)
      ?.access_token;

  // Backend derives email / user_name / ip from the Bearer token + request.
  // We only forward action, page, when (one call per event).
  const base = ACCT_URL.replace(/\/$/, "");
  const auditUrl = `${base}/api/v1/auth/audit-log`;

  const results: { ok: boolean; status: number; body?: unknown }[] = [];

  try {
    for (const event of parsed.data.events) {
      const body = {
        action: event.label,
        page: event.path,
        when: event.timestamp, // ISO string from the client
      };

      const response = await fetch(auditUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      results.push({
        ok: response.ok,
        status: response.status,
        body: data,
      });

      // Fail the whole batch on first non-2xx so the client can retry if needed
      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              (data as { detail?: string; message?: string; error?: string })
                ?.detail ||
              (data as { message?: string })?.message ||
              (data as { error?: string })?.error ||
              "Failed to record activity",
            results,
          },
          { status: response.status },
        );
      }
    }

    return NextResponse.json(
      { ok: true, recorded: results.length },
      { status: 201 },
    );
  } catch (error) {
    console.error("user-activity proxy error:", error);
    return NextResponse.json(
      { error: "Unable to reach activity service." },
      { status: 502 },
    );
  }
}