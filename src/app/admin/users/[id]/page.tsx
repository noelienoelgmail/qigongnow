"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Group { id: string; name: string; slug: string; isActive: boolean }
interface Membership { id: string; group: { id: string; name: string; slug: string } }

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  memberships: Membership[];
  ledGroups: Group[];
}


export default function ManageUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const sessionUserId = (session?.user as { id?: string })?.id;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [leaderGroupId, setLeaderGroupId] = useState("");
  const [assigningLeader, setAssigningLeader] = useState(false);
  const [leaderMsg, setLeaderMsg] = useState("");

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && role !== "SUPERADMIN") router.push("/dashboard");
  }, [status, role, router]);

  useEffect(() => {
    if (role !== "SUPERADMIN") return;
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((u) => { setUser(u); setForm({ name: u.name, email: u.email, role: u.role }); });
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setAllGroups);
  }, [id, role]);

  async function saveInfo() {
    setSaving(true);
    setInfoMsg("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setUser((u) => u ? { ...u, ...data } : u);
      setInfoMsg("Saved!");
    } else {
      setInfoMsg(data.error ?? "Save failed");
    }
  }

  async function toggleMembership(groupId: string, isMember: boolean) {
    if (isMember) {
      await fetch(`/api/groups/${groupId}/members?userId=${id}`, { method: "DELETE" });
      setUser((u) => u ? { ...u, memberships: u.memberships.filter((m) => m.group.id !== groupId) } : u);
    } else {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email }),
      });
      if (res.ok) {
        const newM = await res.json();
        setUser((u) => u ? { ...u, memberships: [...u.memberships, newM] } : u);
      }
    }
  }

  async function assignLeader() {
    if (!leaderGroupId) return;
    setAssigningLeader(true);
    setLeaderMsg("");
    const res = await fetch(`/api/groups/${leaderGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderId: id }),
    });
    setAssigningLeader(false);
    if (res.ok) {
      const group = allGroups.find((g) => g.id === leaderGroupId);
      if (group) setUser((u) => u ? { ...u, ledGroups: [...u.ledGroups.filter((g) => g.id !== group.id), group] } : u);
      setLeaderGroupId("");
      setLeaderMsg("Assigned!");
    } else {
      setLeaderMsg("Failed to assign");
    }
    setTimeout(() => setLeaderMsg(""), 3000);
  }

  async function removeLeadership(groupId: string) {
    // Reassign leader to self (superadmin) as placeholder — admin should reassign properly
    if (!confirm("Remove this user as leader? You'll need to assign a new leader for the group.")) return;
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      setUser((u) => u ? { ...u, ledGroups: u.ledGroups.filter((g) => g.id !== groupId) } : u);
    }
  }

  if (status === "loading" || !user) return null;

  const memberGroupIds = new Set(user.memberships.map((m) => m.group.id));
  const ledGroupIds = new Set(user.ledGroups.map((g) => g.id));
  const assignableGroups = allGroups.filter((g) => !ledGroupIds.has(g.id));

  return (
    <div className="space-y-10 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-stone-500 hover:text-stone-300 text-sm">← Admin</Link>
        <h1 className="text-2xl font-bold text-amber-400">Manage User</h1>
      </div>

      {/* User info */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">User Info</h2>
        {[
          { label: "Name", key: "name", type: "text" },
          { label: "Email", key: "email", type: "email" },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="block text-sm text-stone-400 mb-1">{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        ))}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-stone-300">Superadmin</p>
            <p className="text-xs text-stone-500">Full access to all admin features</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, role: f.role === "SUPERADMIN" ? "MEMBER" : "SUPERADMIN" }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.role === "SUPERADMIN" ? "bg-amber-500" : "bg-stone-700"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.role === "SUPERADMIN" ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
        {infoMsg && <p className={`text-sm ${infoMsg === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>{infoMsg}</p>}
        <button onClick={saveInfo} disabled={saving}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors">
          {saving ? "Saving…" : "Save"}
        </button>
      </section>

      {/* Group memberships */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-stone-200">Group Memberships</h2>
        {allGroups.length === 0 && <p className="text-stone-500 text-sm">No groups exist yet.</p>}
        <div className="space-y-2">
          {allGroups.map((g) => {
            const isMember = memberGroupIds.has(g.id);
            return (
              <div key={g.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-stone-300">{g.name}</p>
                  <p className="text-xs text-stone-500">/{g.slug}</p>
                </div>
                <button
                  onClick={() => toggleMembership(g.id, isMember)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    isMember
                      ? "border-emerald-700 text-emerald-400 hover:bg-red-950 hover:border-red-700 hover:text-red-400"
                      : "border-stone-700 text-stone-500 hover:bg-stone-800"
                  }`}
                >
                  {isMember ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Group leadership */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Group Leadership</h2>
        {user.ledGroups.length === 0 && <p className="text-stone-500 text-sm">Not leading any groups.</p>}
        <div className="space-y-2">
          {user.ledGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-stone-300">{g.name}</p>
                <p className="text-xs text-stone-500">/{g.slug} · {g.isActive ? "Active" : "Pending"}</p>
              </div>
              <button onClick={() => removeLeadership(g.id)}
                className="text-xs text-red-500 hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          ))}
        </div>
        {assignableGroups.length > 0 && (
          <div className="flex gap-2 pt-2">
            <select
              value={leaderGroupId}
              onChange={(e) => setLeaderGroupId(e.target.value)}
              className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">Assign as leader of…</option>
              {assignableGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button onClick={assignLeader} disabled={!leaderGroupId || assigningLeader}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Assign
            </button>
          </div>
        )}
        {leaderMsg && <p className={`text-sm ${leaderMsg === "Assigned!" ? "text-emerald-400" : "text-red-400"}`}>{leaderMsg}</p>}
      </section>
    </div>
  );
}
