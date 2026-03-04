"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  return (
    <nav className="bg-stone-950 border-b border-stone-800 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold text-emerald-400 tracking-wide">
        QiGong Together
      </Link>
      <div className="flex items-center gap-5 text-sm">
        {session ? (
          <>
            <span className="text-stone-400">{session.user?.name}</span>
            {role === "SUPERADMIN" && (
              <Link href="/admin" className="text-amber-400 hover:text-amber-300">
                Admin
              </Link>
            )}
            {(role === "LEADER" || role === "SUPERADMIN") && (
              <Link href="/leader" className="text-sky-400 hover:text-sky-300">
                My Group
              </Link>
            )}
            <Link href="/dashboard" className="text-stone-300 hover:text-white">
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-stone-500 hover:text-stone-300"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-stone-300 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg"
            >
              Join
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
