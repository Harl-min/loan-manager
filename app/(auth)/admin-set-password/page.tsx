"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { brand } from "@/lib/brand";
import StatusDialog from "@/components/StatusDialog";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;
const SUCCESS_REDIRECT_MS = 2500;

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
};

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
  });

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer if the user leaves the page early
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const goToLogin = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    router.push("/login?admin=1");
  };

  const closeStatusDialog = () => {
    const wasSuccess = statusDialog.type === "success";
    setStatusDialog((prev) => ({ ...prev, open: false }));

    // If they click the button on success, go to login immediately
    // (timer may still be running; goToLogin clears it)
    if (wasSuccess) {
      goToLogin();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Invalid reset link",
        message:
          "This reset link is invalid or missing a token. Please use the link from your email.",
        buttonText: "Close",
      });
      return;
    }

    if (password.length < 8) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Weak password",
        message: "Password must be at least 8 characters.",
        buttonText: "Close",
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Passwords don't match",
        message: "Please make sure both password fields are the same.",
        buttonText: "Close",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        token,
        new_password: password,
        confirm_password: confirmPassword,
      };

      const response = await fetch(
        `${ACCT_URL}api/v1/admin/reset-password`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);
      console.log("set-password response:", data);

      if (!response.ok) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Reset failed",
          message:
            data?.detail ||
            data?.message ||
            data?.error ||
            "Unable to reset your password. Please try again.",
          buttonText: "Close",
        });
        return;
      }

      // Success dialog – user can read it; auto-redirect after timeout
      setStatusDialog({
        open: true,
        type: "success",
        title: "Password reset",
        message:
          data?.message ||
          "Your password has been reset successfully. You can now log in.",
        buttonText: "Continue to Login",
      });

      redirectTimerRef.current = setTimeout(() => {
        goToLogin();
      }, SUCCESS_REDIRECT_MS);
    } catch (err) {
      console.error("Set password error:", err);
      setStatusDialog({
        open: true,
        type: "error",
        title: "Connection error",
        message:
          "Unable to connect to the authentication service. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-1 flex items-center justify-center">
          <Image src={brand.logo} alt="Logo" width={240} height={140} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Reset Password</h1>
        <p className="mt-2 text-sm text-muted">
          Choose a new password for your account.
        </p>
      </div>

      <Card>
        {!token && (
          <div className="mb-4 rounded-brand border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            This page was opened without a valid reset token. Open the link from
            your email to continue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <Input
            id="password"
            type="password"
            label="New password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />

          <Button
            type="submit"
            trackLabel="Reset password"
            className="w-full"
            disabled={loading || !token}
          >
            {loading ? "Resetting password…" : "Reset Password"}
          </Button>
        </form>
      </Card>

      {/* <p className="mt-6 text-center text-sm text-muted">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline"
        >
          Log in
        </Link>
      </p> */}

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

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <SetPasswordForm />
    </Suspense>
  );
}