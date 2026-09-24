import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";

const schema = z.object({
  email: z.string().email(),
  // registration | login | admin_login (extend as needed)
  purpose: z.enum(["registration", "login", "admin_login"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Valid email and purpose are required.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const purpose = parsed.data.purpose;

  try {
    const data = await authApi.resendOtp(email, purpose);
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const status = error instanceof RemoteApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to resend OTP.",
      },
      { status },
    );
  }
}