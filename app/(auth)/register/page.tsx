"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Image from "next/image";
import { brand } from "@/lib/brand";
import StatusDialog from "@/components/StatusDialog";

type StatusDialogState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
  /** When set, closing the dialog navigates here */
  redirectEmail?: string | null;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Close",
    redirectEmail: null,
  });

  const closeStatusDialog = () => {
    const emailToVerify = statusDialog.redirectEmail;
    setStatusDialog((prev) => ({
      ...prev,
      open: false,
      redirectEmail: null,
    }));

    if (emailToVerify) {
      router.push(
        `/verify-email?email=${encodeURIComponent(emailToVerify)}`,
      );
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const registerEmail = email.trim().toLowerCase();

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          full_name: name,
          email: registerEmail,
          phone_number: phone,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => null);
      console.log("Register HTTP status:", response.status);
      console.log("Register response:", data);

      if (!data) {
        setError(
          "No valid response was received from the authentication service.",
        );
        return;
      }

      const message = String(data?.message ?? data?.detail ?? "");
      const registeredEmail =
        data?.data?.email || registerEmail;

      // Already registered, not verified — OTP resent → proceed to OTP page
      const isUnverifiedExisting =
        data?.success === false &&
        /already registered but not yet verified/i.test(message);

      if (isUnverifiedExisting) {
        setStatusDialog({
          open: true,
          type: "success",
          title: "Verification required",
          message:
            message ||
            "This email is already registered but not yet verified. A new OTP has been sent. Please verify your account.",
          buttonText: "Proceed",
          redirectEmail: registeredEmail,
        });
        return;
      }

      // Other failures
      if (!response.ok || data?.success === false) {
        setStatusDialog({
          open: true,
          type: "error",
          title: "Registration Failed",
          message:
            message ||
            "That email or password doesn't look right.",
          buttonText: "Close",
          redirectEmail: null,
        });
        return;
      }

      // Fresh registration success
      setStatusDialog({
        open: true,
        type: "success",
        title: "Registration successful",
        message:
          data?.message ||
          "A verification code has been sent to your email. Continue to enter the code.",
        buttonText: "Proceed",
        redirectEmail: registeredEmail,
      });
    } catch (err) {
      console.error("Register error:", err);
      setError(
        "Unable to connect to the authentication service. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-1 flex items-center justify-center">
          <Image src={brand.logo} alt="Logo" width={200} height={40} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted">
          Get started with your loan management account
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            type="text"
            label="Full name"
            placeholder="First and last name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="phoneNo"
            type="number"
            label="Phone Number"
            placeholder="Active Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <span className="flex flex-row gap-4">
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </span>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            trackLabel="Create account"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline"
        >
          Log in
        </Link>
      </p>

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