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
    <main className="mx-auto max-w-sm p-8 min-h-screen flex flex-col justify-center">
      <h1 className="text-2xl font-bold mb-6 text-center">FitTrack</h1>
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
          className="w-full bg-primary text-primary-foreground p-2.5 rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
