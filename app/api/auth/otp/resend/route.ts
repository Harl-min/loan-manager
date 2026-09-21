import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";
const schema = z.object({ email: z.string().email(), purpose: z.literal("registration") });
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { success: false, message: "Email is required." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await authApi.resendOtp(parsed.data.email.toLowerCase(), parsed.data.purpose),
    );
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
