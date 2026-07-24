"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Create the account
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(
        typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
      return;
    }

    // 2. Auto sign-in after signup
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please log in manually.");
      router.push("/login");
      return;
    }

    // 3. Go to onboarding (new user has no stats yet)
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="size-7 text-primary-foreground"
            >
              <path d="M6 20V4M18 20V4M6 12h12M6 6h12M6 18h12" />
              <path d="M9 4v4a3 3 0 006 0V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              FitTrack
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create your hunter profile
            </p>
          </div>
        </div>

        {/* Signup form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-destructive text-sm flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>{error}</span>
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary underline underline-offset-4 hover:text-primary/80 font-medium transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
