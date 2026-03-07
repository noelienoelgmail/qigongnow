"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupSlug = searchParams.get("group");
  const registered = searchParams.get("registered") === "1";
  const passwordReset = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(groupSlug ? `/${groupSlug}` : "/dashboard");
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <h1 className="text-2xl font-bold text-center text-emerald-400">Sign in</h1>
      {passwordReset && (
        <p className="text-emerald-400 text-sm text-center bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5">
          Password updated! Sign in with your new password.
        </p>
      )}
      {registered && (
        <p className="text-emerald-400 text-sm text-center bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5">
          Account created! Sign in to continue.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-stone-500 text-sm">
        <Link href="/forgot-password" className="text-stone-400 hover:text-white underline underline-offset-2">
          Forgot password?
        </Link>
      </p>
      <p className="text-center text-stone-500 text-sm">
        No account?{" "}
        <Link href="/register" className="text-stone-300 hover:text-white underline underline-offset-2">
          Register here
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
