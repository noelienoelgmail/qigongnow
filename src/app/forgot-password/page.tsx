"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-sm mx-auto pt-12 text-center space-y-4">
        <h1 className="text-2xl font-bold text-emerald-400">Check your email</h1>
        <p className="text-stone-400">
          If an account exists for <span className="text-stone-200">{email}</span>, we sent a reset link. Check your inbox.
        </p>
        <Link href="/login" className="text-stone-400 hover:text-white text-sm underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-400">Forgot password</h1>
        <p className="text-stone-400 mt-1 text-sm">Enter your email and we&apos;ll send a reset link.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-stone-500 text-sm">
        <Link href="/login" className="text-stone-300 hover:text-white underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
