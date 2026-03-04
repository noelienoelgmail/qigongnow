"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupSlug = searchParams.get("group") ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, groupSlug }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
    } else {
      router.push(`/login?registered=1${groupSlug ? `&group=${groupSlug}` : ""}`);
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <h1 className="text-2xl font-bold text-center text-emerald-400">
        {groupSlug ? `Join group: ${groupSlug}` : "Create account"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-center text-stone-500 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-stone-300 hover:text-white underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
