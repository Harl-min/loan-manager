"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Image from "next/image";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error === "EMAIL_NOT_VERIFIED") {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }
    if (res?.error === "ACCOUNT_BLOCKED") {
      setError("This account has been blocked. Contact your administrator.");
      return;
    }
    if (res?.error) {
      setError("That email or password doesn't look right.");
      return;
    }
    // Root route inspects the session and routes admins to the admin
    // console, borrowers to their dashboard.
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center ">
          <Image src={brand.logo} alt="Logo" width={140} height={40} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to your account</p>
      </div>

      <Card>
        {/* <button
          type="button"
          data-track-label="Continue with Google"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-brand border border-border py-2.5 text-sm font-medium hover:bg-muted/10"
          onClick={() => signIn("google")}
        >
          <span aria-hidden>G</span> Continue with Google
        </button> */}

        {/* <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          OR
          <div className="h-px flex-1 bg-border" />
        </div> */}

        <form onSubmit={handleSubmit} className="space-y-10">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
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
              <Link href="#" className="flex justify-end mt-2 text-xs font-medium text-foreground underline">
                Forgot password?
              </Link>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" trackLabel="Log in" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
