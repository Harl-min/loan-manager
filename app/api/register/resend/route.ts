import { remoteAuth, RemoteApiError } from "@/lib/auth-api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  try {
    await remoteAuth("/api/v1/otp/resend", {
      method: "POST",
      body: JSON.stringify({ email: parsed.data.email.toLowerCase() }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof RemoteApiError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to resend code.",
      },
      { status },
    );
  }
}
