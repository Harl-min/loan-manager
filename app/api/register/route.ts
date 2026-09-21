import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authApi, RemoteApiError } from "@/lib/auth-api";
const schema = z
  .object({
    full_name: z.string().min(1),
    email: z.string().email(),
    phone_number: z.string().min(1),
    password: z.string().min(8),
    confirm_password: z.string().min(8),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
  });
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        success: false,
        message:
          parsed.error.issues[0]?.message ?? "Invalid registration details.",
      },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await authApi.register({
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
      }),
    );
  } catch (error) {
    const status = error instanceof RemoteApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to register.",
      },
      { status },
    );
  }
}
