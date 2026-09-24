"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  goToApp?: boolean;
};

const EMAIL_KEY = "verify_login_email";
const ADMIN_KEY = "verify_login_admin";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Prefer URL, then sessionStorage (set on login redirect)
  const email = useMemo(() => {
    const fromUrl = params.get("email")?.trim() ?? "";
    if (fromUrl) {
      try {
        return decodeURIComponent(fromUrl).toLowerCase();
      } catch {
        return fromUrl.toLowerCase();
      }
    }
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem(EMAIL_KEY) || "").toLowerCase();
    }
    return "";
  }, [params]);

  const isAdmin = useMemo(() => {
    if (params.get("admin") === "1") return true;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(ADMIN_KEY) === "1";
    }
    return false;
  }, [params]);

  // Persist so refresh / client navigation keeps email
  useEffect(() => {
    if (email) sessionStorage.setItem(EMAIL_KEY, email);
    sessionStorage.setItem(ADMIN_KEY, isAdmin ? "1" : "0");
  }, [email, isAdmin]);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "success",
  });

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(
      () => setCountdown((s) => Math.max(s - 1, 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [countdown]);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
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
    pasted.split("").forEach((d, i) => {
      if (index + i < 6) next[index + i] = d;
    });
    setDigits(next);
    inputsRef.current[Math.min(index + pasted.length, 5)]?.focus();
  }

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

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

    const verifyEmail = email.trim().toLowerCase();
    if (!verifyEmail) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Verification Error",
        message: "Your email address is missing. Please restart login.",
        buttonText: "Close",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Verify OTP payload:", {
        email: verifyEmail,
        loginType: isAdmin ? "admin" : "customer",
        otpLength: code.length,
      });

      const result = await signIn("credentials", {
        email: verifyEmail,
        otp: code,
        purpose: "login",
        loginType: isAdmin ? "admin" : "customer",
        redirect: false,
      });

      console.log("signIn result:", result);

      if (!result || result.error) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Verification Failed",
          message: result?.error || "That code didn't work. Please try again.",
          buttonText: "Close",
        });
        return;
      }

      setStatusDialog({
        open: true,
        type: "success",
        title: "Login successful",
        message: isAdmin
          ? "You are signed in as an administrator."
          : "Your email has been verified. You can access your account.",
        buttonText: isAdmin ? "Continue to Admin" : "Continue to Dashboard",
        goToApp: true,
      });
    } catch (err: unknown) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Verification Failed",
        message:
          err instanceof Error
            ? err.message
            : "That code didn't work. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (countdown > 0 || loading) return;

    const verifyEmail = email.trim().toLowerCase();
    if (!verifyEmail) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Missing email",
        message: "Email is missing. Please log in again.",
        buttonText: "Close",
      });
      return;
    }

    setLoading(true);
    try {
      // Keep resend off the NextAuth catch-all
      const endpoint = isAdmin ? "/api/auth/otp/resend" : "/api/auth/otp/resend";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmail,
          purpose: "login",
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Unable to resend the code.",
        );
      }

      setDigits(["", "", "", "", "", ""]);
      setCountdown(1);
      inputsRef.current[0]?.focus();

      setStatusDialog({
        open: true,
        type: "success",
        title: "Code Sent",
        message: "A new verification code has been sent to your email.",
        buttonText: "Continue",
        goToApp: false,
      });
    } catch (err: unknown) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Unable to Resend Code",
        message:
          err instanceof Error
            ? err.message
            : "Unable to resend the code. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  }

  function closeStatusDialog() {
    const go = statusDialog.goToApp;
    setStatusDialog((p) => ({ ...p, open: false, goToApp: false }));
    if (!go) return;

    sessionStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(ADMIN_KEY);

    if (isAdmin) {
      router.push("/admin/users");
      router.refresh();
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-brand bg-primary text-primary-foreground">
          ✉
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? "Verify admin login email" : "Verify your login email"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          We sent a code to{" "}
          <span className="font-medium text-foreground">
            {email || "your email"}
          </span>
        </p>
      </div>

      <Card>
        <form onSubmit={handleVerify}>
          <div className="mb-6 flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                inputMode="numeric"
                maxLength={1}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                className="h-12 w-11 rounded-brand border border-border text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ))}
          </div>

          <Button
            type="submit"
            trackLabel="Verify"
            className="w-full"
            disabled={loading || code.length < 6 || !email}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <p className="mt-3 text-center text-sm text-muted">
          OTP expires in{" "}
          <span className="font-semibold text-foreground">
            {formatCountdown(countdown)}
          </span>
        </p>

        <p className="mt-2 text-center text-sm text-muted">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={countdown > 0 || loading || !email}
            className={`font-semibold ${
              countdown > 0 || loading || !email
                ? "cursor-not-allowed text-muted"
                : "text-foreground hover:underline"
            }`}
          >
            Resend
          </button>
        </p>
      </Card>

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
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <VerifyEmailForm />
    </Suspense>
  );
}