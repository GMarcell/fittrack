"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      window.location.href = "/";
    }
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
              Continue your hunter journey
            </p>
          </div>
        </div>

        {/* Login form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter your password"
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

              <Button type="submit" className="w-full" size="lg">
                Log in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary underline underline-offset-4 hover:text-primary/80 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
