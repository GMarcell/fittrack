"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

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
    <main className="min-h-screen bg-gradient-to-br from-background via-navy-950 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2.5">
            <div className="size-3 rounded-full bg-navy-500 shadow-lg shadow-navy-500/40" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              FitTrack
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Log in to continue your journey
          </p>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border bg-background text-foreground p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border bg-background text-foreground p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-navy-500 text-white p-2.5 rounded-lg text-sm font-medium hover:bg-navy-400 transition-colors shadow-lg shadow-navy-500/20"
        >
          Log in
        </button>
      </form>
      </div>
    </main>
  );
}
