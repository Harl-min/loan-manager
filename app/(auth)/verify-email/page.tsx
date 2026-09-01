"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }

  const code = digits.join("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/verify", { email, code });
      // Auto sign the user in now that they're verified. Demo OTP is
      // logged server-side by /api/register — see console output.
      router.push("/login");
    } catch (err: any) {
      setError(err.message ?? "That code didn't work — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    await api.post("/register/resend", { email });
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-brand bg-primary text-primary-foreground">
          ✉
        </div>
        <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
        <p className="mt-1 text-sm text-muted">We sent a code to {email || "your email"}</p>
      </div>

      <Card>
        <form onSubmit={handleVerify}>
          <div className="mb-6 flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                value={d}
                onChange={(e) => updateDigit(i, e.target.value)}
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-11 rounded-brand border border-border text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ))}
          </div>

          {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            trackLabel="Verify"
            className="w-full"
            disabled={loading || code.length < 6}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>
                <p className="mt-3 text-center text-muted text-sm">OTP received expires in <span className="text-foreground font-semibold">10Mins</span></p>

        <p className="mt-2 text-center text-sm text-muted">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            data-track-label="Resend code"
            onClick={resend}
            className="font-semibold text-foreground hover:underline"
          >
            Resend
          </button>
        </p>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
