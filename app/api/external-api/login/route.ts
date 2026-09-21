import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RemoteApiError, remoteAuth } from "@/lib/auth-api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    await remoteAuth("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase(),
        password,
      }),
    });
    return NextResponse.json({ success: true, data: { email: email.toLowerCase() } });
  } catch (error) {
    const status = error instanceof RemoteApiError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to sign in." },
      { status }
    );
  }
}
