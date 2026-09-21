import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { success: false, message: "Email and password are required." },
      { status: 400 },
    );
  try {
    await authApi.login(parsed.data.email.toLowerCase(), parsed.data.password);
    return NextResponse.json({
      success: true,
      data: { email: parsed.data.email.toLowerCase() },
    });
  } catch (error) {
    const status = error instanceof RemoteApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to sign in.",
      },
      { status },
    );
  }
}
