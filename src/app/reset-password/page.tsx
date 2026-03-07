"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push("/login?reset=1");
    } else {
      setError(data.error ?? "Failed to reset password");
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto pt-12 text-center space-y-4">
        <p className="text-red-400">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-stone-300 hover:text-white underline underline-offset-2 text-sm">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-400">Set new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">New password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Confirm password</label>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors">
          {loading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
