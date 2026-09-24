"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { brand } from "@/lib/brand";
import themelogo from "@/public/assets/images/BOI-Thematic.png";
import StatusDialog from "@/components/StatusDialog";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
  redirectPath?: string | null;
};

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // /forgot-password?admin=1  → admin API
  // /forgot-password          → customer API
  const isAdminMode = searchParams.get("admin") === "1";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
    redirectPath: null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Email required",
        message: "Please enter your email address.",
        buttonText: "Close",
        redirectPath: null,
      });
      return;
    }

    setLoading(true);

    const endpoint = isAdminMode
      ? `${ACCT_URL}api/v1/admin/forgot-password`
      : `${ACCT_URL}api/v1/auth/forgot-password`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await response.json().catch(() => null);
      console.log(`POST ${endpoint}:`, data);

      if (!response.ok || data?.success === false) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Request failed",
          message:
            data?.message ||
            data?.detail ||
            "Unable to start password reset. Please try again.",
          buttonText: "Close",
          redirectPath: null,
        });
        return;
      }

      const token =
        data?.token ||
        data?.data?.token ||
        data?.reset_token ||
        null;

      // Admin vs customer set-password path if you split them later
      const setPasswordBase = isAdminMode
        ? "/admin/set-password"
        : "/customer/set-password";

      const redirectPath = token
        ? `${setPasswordBase}?token=${encodeURIComponent(token)}`
        : `${setPasswordBase}?email=${encodeURIComponent(trimmed)}`;

      setStatusDialog({
        open: true,
        type: "success",
        title: "Check your email",
        message:
          data?.message ||
          "If an account exists for this email, password reset instructions have been sent.",
        buttonText: "Continue",
        redirectPath,
      });
    } catch (err) {
      console.error("forgot-password error:", err);
      setStatusDialog({
        open: true,
        type: "error",
        title: "Connection error",
        message:
          "Unable to reach the authentication service. Please try again.",
        buttonText: "Close",
        redirectPath: null,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDialogClose = () => {
    const path = statusDialog.redirectPath;
    setStatusDialog((prev) => ({
      ...prev,
      open: false,
      redirectPath: null,
    }));
    if (path) router.push(path);
  };

  const loginHref = isAdminMode ? "/login?admin=1" : "/login";

  return (
    <div>
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="flex min-h-screen w-full">
          <div className="hidden w-1/2 items-center justify-center lg:flex">
            <Image
              src={themelogo}
              alt=""
              width={400}
              height={400}
              className="h-[500px] w-[500px] object-contain opacity-90"
            />
          </div>

          <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <Image
                    src={brand.logo}
                    alt="Logo"
                    width={200}
                    height={40}
                  />
                </div>

                <h1 className="text-2xl font-semibold text-primary">
                  {isAdminMode
                    ? "Reset admin password"
                    : "Reset your password"}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Enter your email address and we&apos;ll send you a link to
                  reset your password.
                </p>
              </div>

              <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    trackLabel={
                      isAdminMode
                        ? "Admin reset password"
                        : "Reset password"
                    }
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Sending…" : "Reset password"}
                  </Button>
                </form>
              </Card>

              <p className="mt-6 text-center text-sm text-muted">
                Remember your password?{" "}
                <Link
                  href={loginHref}
                  className="font-semibold text-foreground underline hover:text-hover"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <StatusDialog
        open={statusDialog.open}
        type={statusDialog.type}
        title={statusDialog.title}
        message={statusDialog.message}
        buttonText={statusDialog.buttonText}
        onClose={handleDialogClose}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}