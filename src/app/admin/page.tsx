"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  leader: { name: string; email: string };
  _count: { members: number };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  _count: { memberships: number; ledGroups: number };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [publicPlaylist, setPublicPlaylist] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userPages, setUserPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && role !== "SUPERADMIN") router.push("/dashboard");
  }, [status, role, router]);

  useEffect(() => {
    if (role !== "SUPERADMIN") return;
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setPublicPlaylist(d.publicPlaylist ?? ""));
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups);
  }, [role]);

  useEffect(() => {
    if (role !== "SUPERADMIN") return;
    fetch(`/api/admin/users?page=${userPage}&search=${encodeURIComponent(userSearch)}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setUserTotal(d.total ?? 0); setUserPages(d.pages ?? 1); });
  }, [role, userPage, userSearch]);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicPlaylist }),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved!" : "Save failed");
    setTimeout(() => setMessage(""), 3000);
  }

  async function approveGroup(id: string) {
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: true } : g)));
    }
  }

  async function rejectGroup(id: string) {
    if (!confirm("Reject and delete this group request? This cannot be undone.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  if (status === "loading") return null;

  const pendingGroups = groups.filter((g) => !g.isActive);
  const activeGroups = groups.filter((g) => g.isActive);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-amber-400">Superadmin Dashboard</h1>

      {/* Public playlist */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Public Broadcast</h2>
        <div>
          <label className="block text-sm text-stone-400 mb-1">
            YouTube Playlist URL (community hourly broadcast)
          </label>
          <input
            type="url"
            value={publicPlaylist}
            onChange={(e) => setPublicPlaylist(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        {message && (
          <p className={`text-sm ${message === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </section>

      {/* Pending groups */}
      {pendingGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-amber-300">Pending Approval</h2>
          <div className="space-y-3">
            {pendingGroups.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-stone-900 border border-amber-900 rounded-xl px-5 py-4">
                <div>
                  <p className="font-medium text-stone-200">{g.name}</p>
                  <p className="text-stone-500 text-xs">
                    /{g.slug} · requested by {g.leader.name} ({g.leader.email})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => approveGroup(g.id)}
                    className="text-xs px-3 py-1 rounded-full border border-emerald-700 text-emerald-400 hover:bg-emerald-950 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectGroup(g.id)}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Reject
                  </button>
                  <Link
                    href={`/admin/groups/${g.id}`}
                    className="text-xs px-3 py-1 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active groups */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">All Groups</h2>
        {activeGroups.length === 0 && (
          <p className="text-stone-500 text-sm">No active groups yet.</p>
        )}
        <div className="space-y-3">
          {activeGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-5 py-4">
              <div>
                <p className="font-medium text-stone-200">{g.name}</p>
                <p className="text-stone-500 text-xs">
                  /{g.slug} · {g._count.members} members · led by {g.leader.name}
                </p>
              </div>
              <Link
                href={`/admin/groups/${g.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* All members */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">All Members ({userTotal})</h2>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
        />
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-5 py-3">
              <div>
                <p className="text-sm font-medium text-stone-200">{u.name}</p>
                <p className="text-xs text-stone-500">{u.email} · {u.role.toLowerCase()} · {u._count.memberships} groups</p>
              </div>
              <Link
                href={`/admin/users/${u.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
        {userPages > 1 && (
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1}
              className="text-sm text-stone-400 hover:text-white disabled:opacity-40">← Prev</button>
            <span className="text-sm text-stone-500">Page {userPage} of {userPages}</span>
            <button onClick={() => setUserPage((p) => Math.min(userPages, p + 1))} disabled={userPage === userPages}
              className="text-sm text-stone-400 hover:text-white disabled:opacity-40">Next →</button>
          </div>
        )}
      </section>
    </div>
  );
}
