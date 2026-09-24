import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";

const schema = z.object({
  email: z.string().email(),
  otp_code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  purpose: z.literal("registration").default("registration"),
  /** true when verifying an admin registration */
  isAdmin: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Email and OTP are required." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp_code;
  const purpose = parsed.data.purpose;
  const isAdmin = parsed.data.isAdmin;

  try {
    const data = isAdmin
      ? await authApi.verifyAdminRegistrationOtp(email, otp, purpose)
      : await authApi.verifyRegistrationOtp(email, otp, purpose);

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
          error instanceof Error ? error.message : "Unable to verify OTP.",
      },
      { status },
    );
  }
}