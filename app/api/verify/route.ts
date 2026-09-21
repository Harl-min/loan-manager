import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";

const schema = z.object({
  email: z.string().email(),
  otp_code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  purpose: z.literal("registration"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            parsed.error.issues[0]?.message ??
            "Email and OTP are required.",
        },
        { status: 400 },
      );
    }

    const { email, otp_code, purpose } = parsed.data;

    console.log("=================================");
    console.log("REGISTRATION OTP VERIFICATION");
    console.log("=================================");
    console.log("Email:", email);
    console.log("OTP:", otp_code);
    console.log("Purpose:", purpose);

    const response = await authApi.verifyRegistrationOtp(
      email.toLowerCase(),
      otp_code,
      purpose,
    );

    console.log("Registration OTP API response:", response);

    return NextResponse.json(
      {
        success: true,
        ...response,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Registration OTP verification failed:",
      error,
    );

    /*
     * IMPORTANT:
     * This is a normal API route, NOT NextAuth authorize().
     *
     * Therefore, do NOT throw the error here.
     * Return the backend error message to the browser.
     */

    if (error instanceof RemoteApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.status || 400,
        },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify OTP. Please try again.",
      },
      { status: 500 },
    );
  }
}
