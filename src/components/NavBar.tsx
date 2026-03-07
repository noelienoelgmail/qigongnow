"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [menuOpen, setMenuOpen] = useState(false);

  const links = session ? (
    <>
      <span className="text-stone-400">{session.user?.name}</span>
      {role === "SUPERADMIN" && (
        <Link href="/admin" className="text-amber-400 hover:text-amber-300" onClick={() => setMenuOpen(false)}>
          Admin
        </Link>
      )}
      {(role === "LEADER" || role === "SUPERADMIN") && (
        <Link href="/leader" className="text-sky-400 hover:text-sky-300" onClick={() => setMenuOpen(false)}>
          My Group
        </Link>
      )}
      <Link href="/dashboard" className="text-stone-300 hover:text-white" onClick={() => setMenuOpen(false)}>
        Dashboard
      </Link>
      <button
        onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
        className="text-stone-500 hover:text-stone-300"
      >
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link href="/login" className="text-stone-300 hover:text-white" onClick={() => setMenuOpen(false)}>
        Sign in
      </Link>
      <Link
        href="/register"
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg"
        onClick={() => setMenuOpen(false)}
      >
        Join
      </Link>
    </>
  );

  return (
    <nav className="bg-stone-950 border-b border-stone-800">
      <div className="px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-emerald-400 tracking-wide">
          QiGong Now
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5 text-sm">{links}</div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-stone-400 hover:text-white text-2xl leading-none"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-stone-800 px-6 py-4 flex flex-col gap-4 text-sm">
          {links}
        </div>
      )}
    </nav>
  );
}
