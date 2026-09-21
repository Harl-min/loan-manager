"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { brand } from "@/lib/brand"; // adjust if needed
import themelogo from "@/public/assets/images/BOI-Thematic.png"; // adjust if needed
import StatusDialog from "@/components/StatusDialog";

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Only active when URL is /login?admin=1
  const isAdminMode = searchParams.get("admin") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
  });

  const closeStatusDialog = () => {
    setStatusDialog((prev) => ({ ...prev, open: false }));
  };

  // ----------------------------------------------------------
  // CUSTOMER → existing API then OTP page
  // ----------------------------------------------------------
  async function handleCustomerLogin() {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Login Failed",
        message:
          data?.message ??
          data?.detail ??
          "That email or password doesn't look right.",
        buttonText: "Close",
      });
      return;
    }

    setStatusDialog({
      open: true,
      type: "success",
      title: "Login successful",
      message:
        "A verification code has been sent to your email. Continue to enter the code.",
      buttonText: "Continue",
    });
  }

  // ----------------------------------------------------------
  // ADMIN → NextAuth signIn (creates session with role: admin)
  // ----------------------------------------------------------
  async function handleAdminLogin() {
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      loginType: "admin",
      redirect: false,
    });

    console.log("Admin signIn result:", result);

    if (!result || result.error) {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Admin Login Failed",
        message:
          result?.error ?? "Invalid admin credentials. Please try again.",
        buttonText: "Close",
      });
      return;
    }

    setStatusDialog({
      open: true,
      type: "success",
      title: "Admin login successful",
      message: "You have been signed in as an administrator.",
      buttonText: "Continue to Admin",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isAdminMode) {
        await handleAdminLogin();
      } else {
        await handleCustomerLogin();
      }
    } catch {
      setStatusDialog({
        open: true,
        type: "error",
        title: "Connection Error",
        message:
          "Unable to reach the authentication service. Please try again.",
        buttonText: "Close",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDialogClose = () => {
    const wasSuccess = statusDialog.type === "success";
    const targetEmail = email.trim().toLowerCase();

    closeStatusDialog();

    if (!wasSuccess) return;

    if (isAdminMode) {
      router.push("/admin/users");
      router.refresh(); // so middleware sees the new session
    } else if (targetEmail) {
      router.push(
        `/verify-email-login?email=${encodeURIComponent(targetEmail)}`,
      );
    }
  };

  return (
    <div>
 <div className="relative left-1/2 w-screen -translate-x-1/2">
  <div className="flex min-h-screen w-full">
    {/* LEFT - Theme image */}
    <div className="hidden w-1/2 items-center justify-center lg:flex">
      <Image
        src={themelogo}
        alt=""
        width={400}
        height={400}
        className="h-[500px] w-[500px] object-contain opacity-90"
      />
    </div>

    {/* RIGHT - Login */}
    <div className="login flex w-full items-center justify-center px-8 lg:w-1/2">
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
            {isAdminMode ? "Admin Sign In" : "Welcome to Loan Manager"}
          </h1>

          <p className="mt-1 text-sm text-muted">
            {isAdminMode
              ? "Sign in with your administrator credentials."
              : "Sign in to access your loan management dashboard."}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-10">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
              </div>

              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {!isAdminMode && (
                <Link
                  href="#"
                  className="mt-2 flex justify-end text-xs font-medium text-foreground underline hover:text-hover"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <Button
              type="submit"
              trackLabel={isAdminMode ? "Admin log in" : "Log in"}
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Logging in…"
                : isAdminMode
                  ? "Admin Log in"
                  : "Log in"}
            </Button>
          </form>
        </Card>

        {!isAdminMode && (
          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-foreground underline hover:text-hover"
            >
              Create one
            </Link>
          </p>
        )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}