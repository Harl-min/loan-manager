import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";
const schema = z.object({
  email: z.string().email(),
  otp_code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  purpose: z.literal("registration"),
});
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { success: false, message: "Email and OTP are required." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await authApi.verifyLoginOtp(
        parsed.data.email.toLowerCase(),
        parsed.data.otp_code,
        parsed.data.purpose,
      ),
    );
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
