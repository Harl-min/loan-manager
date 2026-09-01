"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import Image from "next/image";
import { brand } from "@/lib/brand";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/register", { name: name || email.split("@")[0], email, phone, password });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-1 flex items-center justify-center ">
                <Image src={brand.logo} alt="Logo" width={140} height={40} />
              </div>
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-2 text-sm text-muted">    Get started with your loan management account
</p>
      </div>

      <Card>
        {/* <button
          type="button"
          data-track-label="Continue with Google"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-brand border border-border py-2.5 text-sm font-medium hover:bg-muted/10"
        >
          <span aria-hidden>G</span> Continue with Google
        </button> */}
{/* 
        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          OR
          <div className="h-px flex-1 bg-border" />
        </div> */}

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
          /> <Input
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

          <Button type="submit" trackLabel="Create account" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
