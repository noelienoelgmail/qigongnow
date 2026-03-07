"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AccountPage() {
  const { status } = useSession();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords don't match"); return; }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage("Password updated!");
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setError(data.error ?? "Failed to update password");
    }
  }

  if (status === "loading") return null;

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <h1 className="text-2xl font-bold text-emerald-400">Account settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Current password</label>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">New password</label>
          <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Confirm new password</label>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-emerald-500" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-emerald-400 text-sm">{message}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
