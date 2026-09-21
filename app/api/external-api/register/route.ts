import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().min(1, "Full name is required."),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string().min(1, "Phone number is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
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
            parsed.error.issues[0]?.message ||
            "Please check the form and try again.",
        },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
    } = parsed.data;

    const baseUrl = process.env.NEXT_DATA_AUTH_URL;

    if (!baseUrl) {
      console.error("NEXT_DATA_AUTH_URL is not configured");

      return NextResponse.json(
        {
          success: false,
          message: "Authentication service is unavailable.",
        },
        { status: 503 }
      );
    }

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/auth/register`;

    console.log("Calling register API:", apiUrl);
    console.log("Register email:", email.toLowerCase());

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: name,
        email: email.toLowerCase(),
        phone_number: phone,
        password,
        confirm_password: confirmPassword,
      }),
      cache: "no-store",
    });

    // Read as text first so an empty/non-JSON response
    // doesn't silently become null.
    const responseText = await response.text();

    console.log("External register status:", response.status);
    console.log("External register response:", responseText);

    let data: any = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      console.error("Failed to parse register response:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid response from authentication service.",
        },
        { status: 502 }
      );
    }

    // Empty response
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication service returned an empty response.",
        },
        { status: 502 }
      );
    }

    // Registration failed
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            data?.error ||
            "Unable to create your account.",
        },
        { status: response.status }
      );
    }

    // Registration successful
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Register API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to the authentication service.",
      },
      { status: 503 }
    );
  }
}