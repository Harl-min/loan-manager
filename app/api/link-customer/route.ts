import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const BASE_URL = process.env.NEXT_DATA_AUTH_URL?.replace(/\/+$/, "");

  if (!BASE_URL) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication service is not configured.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);

  const accountNumber = searchParams.get("account_number")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email || !accountNumber) {
    return NextResponse.json(
      {
        success: false,
        message: "Email and account number are required.",
      },
      { status: 400 },
    );
  }

  try {
    const params = new URLSearchParams({
      account_number: accountNumber,
      email,
    });

    const url =
      `${BASE_URL}/api/v1/auth/link-customer-by-email?${params.toString()}`;

    console.log("---- LINK CUSTOMER API ----");
    console.log("Calling:", url);
    console.log("Account number:", accountNumber);
    console.log("Email:", email);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    console.log("Link customer status:", response.status);

    const contentType = response.headers.get("content-type");
    console.log("Link customer content-type:", contentType);

    const responseText = await response.text();

    console.log("Link customer response:", responseText);

    let data: any = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      console.error(
        "Link customer API returned non-JSON response:",
        responseText,
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ??
            responseText ??
            "Unable to link the customer account.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Failed to link customer by email:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to link customer account.",
      },
      { status: 500 },
    );
  }
}