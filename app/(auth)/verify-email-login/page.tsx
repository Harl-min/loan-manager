"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import StatusDialog from "@/components/StatusDialog";

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title?: string;
  message?: string;
  buttonText?: string;
  onClose?: () => void;
};

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();

  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(180);

  const [statusDialog, setStatusDialog] =
    useState<StatusDialogState>({
      open: false,
      type: "success",
    });

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // ------------------------------------------------------------
  // OTP COUNTDOWN
  // ------------------------------------------------------------
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // ------------------------------------------------------------
  // OTP INPUT
  // ------------------------------------------------------------
  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;

    setDigits(next);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      e.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const next = [...digits];

    pasted.split("").forEach((digit, offset) => {
      if (index + offset < 6) {
        next[index + offset] = digit;
      }
    });

    setDigits(next);

    const nextIndex = Math.min(index + pasted.length, 5);
    inputsRef.current[nextIndex]?.focus();
  }

  const code = digits.join("");

  // ------------------------------------------------------------
  // COUNTDOWN FORMAT
  // ------------------------------------------------------------
  function formatCountdown(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  // ------------------------------------------------------------
  // VERIFY OTP
  // ------------------------------------------------------------
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (code.length < 6) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Invalid OTP",
        message: "Please enter the complete 6-digit verification code.",
        buttonText: "Close",
      });

      return;
    }

    if (!email.trim()) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Verification Error",
        message: "Your email address is missing. Please restart the verification process.",
        buttonText: "Close",
      });

      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        otp: code,
        purpose: "registration",
        redirect: false,
      });

      console.log("=================================");
      console.log("NextAuth signIn result");
      console.log("=================================");
      console.log(result);

      // ----------------------------------------------------------
      // NEXTAUTH ERROR
      // ----------------------------------------------------------
      if (!result || result.error) {
        const errorMessage =
          result?.error ||
          "That code didn't work. Please try again.";

        console.error("OTP verification failed:", errorMessage);

        setStatusDialog({
          open: true,
          type: "error",
          title: "Verification Failed",
          message: errorMessage,
          buttonText: "Close",
        });

        return;
      }

      // ----------------------------------------------------------
      // SUCCESS
      // ----------------------------------------------------------
      setStatusDialog({
        open: true,
        type: "success",
        title: "Login successful",
        message:
          "Your email has been verified successfully. You can now access your account.",
        buttonText: "Continue to Dashboard",
      });
    } catch (err: unknown) {
      console.error("OTP verification exception:", err);

      const message =
        err instanceof Error
          ? err.message
          : "That code didn't work. Please try again.";

      setStatusDialog({
        open: true,
        type: "error",
        title: "Verification Failed",
        message,
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // RESEND OTP
  // ------------------------------------------------------------
  async function resend() {
    if (countdown > 0 || loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          purpose: "login",
        }),
      });

      const contentType =
        response.headers.get("content-type") ?? "";

      let data: any = null;

      if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text();
        data = {
          message: text,
        };
      }

      console.log("OTP resend response:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error?.message ||
            data?.error ||
            "Unable to resend the code. Please try again.",
        );
      }

      // Clear OTP fields
      setDigits(["", "", "", "", "", ""]);

      // Restart countdown
      setCountdown(180);

      // Focus first input
      inputsRef.current[0]?.focus();

      setStatusDialog({
        open: true,
        type: "success",
        title: "Code Sent",
        message:
          "A new verification code has been sent to your email.",
        buttonText: "Continue",
      });
    } catch (err: unknown) {
      console.error("OTP resend failed:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to resend the code. Please try again.";

      setStatusDialog({
        open: true,
        type: "error",
        title: "Unable to Resend Code",
        message,
        buttonText: "Close",
        onClose: () => {
    setStatusDialog((prev) => ({ ...prev, open: false }));
    router.push("/login");
  },
      });
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // CLOSE STATUS DIALOG
  // ------------------------------------------------------------
  function closeStatusDialog() {
    const wasSuccess = statusDialog.type === "success";

    setStatusDialog((prev) => ({
      ...prev,
      open: false,
    }));

    if (wasSuccess) {
      router.push("/dashboard");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-brand bg-primary text-primary-foreground">
          ✉
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Verify your login email
        </h1>

        <p className="mt-1 text-sm text-muted">
          We sent a code to {email || "your email"}
        </p>
      </div>

      {/* OTP Card */}
      <Card>
        <form onSubmit={handleVerify}>
          {/* OTP Inputs */}
          <div className="mb-6 flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                value={digit}
                onChange={(e) =>
                  updateDigit(index, e.target.value)
                }
                onKeyDown={(e) =>
                  handleKeyDown(index, e)
                }
                onPaste={(e) =>
                  handlePaste(index, e)
                }
                inputMode="numeric"
                maxLength={1}
                autoComplete={
                  index === 0 ? "one-time-code" : "off"
                }
                className="h-12 w-11 rounded-brand border border-border text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ))}
          </div>

          {/* Verify Button */}
          <Button
            type="submit"
            trackLabel="Verify"
            className="w-full"
            disabled={loading || code.length < 6}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>

        {/* Countdown */}
        <p className="mt-3 text-center text-sm text-muted">
          OTP received expires in{" "}
          <span className="font-semibold text-foreground">
            {formatCountdown(countdown)}
          </span>
        </p>

        {/* Resend */}
        <p className="mt-2 text-center text-sm text-muted">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            data-track-label="Resend code"
            onClick={resend}
            disabled={countdown > 0 || loading}
            className={`font-semibold ${
              countdown > 0 || loading
                ? "cursor-not-allowed text-muted"
                : "text-foreground hover:underline"
            }`}
          >
            Resend
          </button>
        </p>
      </Card>

      {/* Generic Success/Error Dialog */}
      <StatusDialog
        open={statusDialog.open}
        type={statusDialog.type}
        title={statusDialog.title}
        message={statusDialog.message}
        buttonText={statusDialog.buttonText}
        onClose={closeStatusDialog}
      />
    </div>
  );
}

export default function VerifyEmailLoginPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
