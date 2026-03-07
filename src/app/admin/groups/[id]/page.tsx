"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface GroupDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  playlistUrl: string | null;
  isActive: boolean;
  leaderId: string;
  leader: { id: string; name: string; email: string };
}

interface Member {
  id: string;
  user: { id: string; name: string; email: string; role: string };
}

export default function ManageGroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const isSuperadmin = sessionUser?.role === "SUPERADMIN";

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", playlistUrl: "", leaderId: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [memberMsg, setMemberMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/groups/${id}`)
      .then((r) => {
        if (!r.ok) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((g) => {
        if (!g) return;
        // Redirect if not superadmin and not the leader
        if (sessionUser?.role !== "SUPERADMIN" && g.leaderId !== sessionUser?.id) {
          router.push("/dashboard");
          return;
        }
        setGroup(g);
        setForm({
          name: g.name,
          slug: g.slug,
          description: g.description ?? "",
          playlistUrl: g.playlistUrl ?? "",
          leaderId: g.leaderId,
        });
      });
    fetch(`/api/groups/${id}/members`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) ? setMembers(d) : setMembers([]));
  }, [id, status, sessionUser?.id, sessionUser?.role, router]);

  async function saveGroup() {
    setSaving(true);
    setSaveMsg("");
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      playlistUrl: form.playlistUrl,
    };
    if (isSuperadmin) {
      payload.slug = form.slug;
      payload.leaderId = form.leaderId;
    }
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setGroup((g) => g ? { ...g, ...updated } : g);
      setSaveMsg("Saved!");
    } else {
      const d = await res.json();
      setSaveMsg(d.error ?? "Save failed");
    }
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function toggleActive() {
    if (!group) return;
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !group.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGroup((g) => g ? { ...g, isActive: updated.isActive } : g);
    }
  }

  async function deleteGroup() {
    if (!confirm("Delete this group permanently? This cannot be undone.")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  async function addMember() {
    if (!addEmail.trim()) return;
    setMemberMsg("");
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers((prev) => [...prev, data]);
      setAddEmail("");
    } else {
      setMemberMsg(data.error ?? "Failed to add");
    }
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/groups/${id}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.user.id !== userId));
  }

  async function changeRole(userId: string, newRole: "LEADER" | "MEMBER") {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => m.user.id === userId ? { ...m, user: { ...m.user, role: newRole } } : m)
      );
    }
  }

  if (status === "loading" || !group) return null;

  const backHref = isSuperadmin ? "/admin" : "/leader";

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={backHref} className="text-stone-500 hover:text-stone-300 text-sm">← Back</Link>
        <h1 className="text-2xl font-bold text-amber-400">Manage Group</h1>
        {!group.isActive && (
          <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">Pending</span>
        )}
      </div>

      {/* Group params */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Group Settings</h2>
        {[
          { label: "Group name", key: "name", type: "text" },
          { label: "URL slug", key: "slug", type: "text", superadminOnly: true },
          { label: "Description", key: "description", type: "text" },
          { label: "YouTube playlist URL", key: "playlistUrl", type: "url" },
        ].map(({ label, key, type, superadminOnly }) => {
          const disabled = superadminOnly && !isSuperadmin;
          return (
            <div key={key}>
              <label className="block text-sm text-stone-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                disabled={disabled}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          );
        })}
        {isSuperadmin && (
          <div>
            <label className="block text-sm text-stone-400 mb-1">Leader ID (superadmin only)</label>
            <input
              type="text"
              value={form.leaderId}
              onChange={(e) => setForm((f) => ({ ...f, leaderId: e.target.value }))}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-stone-600 mt-1">Current leader: {group.leader.name} ({group.leader.email})</p>
          </div>
        )}
        {saveMsg && (
          <p className={`text-sm ${saveMsg === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>{saveMsg}</p>
        )}
        <button
          onClick={saveGroup}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </section>

      {/* Members */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.length === 0 && <p className="text-stone-500 text-sm">No members yet.</p>}
          {members.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-stone-300">{m.user.name}</p>
                  <p className="text-xs text-stone-500">{m.user.email}</p>
                </div>
                {(m.user.role === "LEADER" || m.user.role === "SUPERADMIN") && (
                  <span className="text-xs bg-sky-900 text-sky-300 px-2 py-0.5 rounded-full">
                    {m.user.role === "SUPERADMIN" ? "Superadmin" : "Leader"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isSuperadmin && m.user.role === "MEMBER" && (
                  <button
                    onClick={() => changeRole(m.user.id, "LEADER")}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Make Leader
                  </button>
                )}
                {isSuperadmin && m.user.role === "LEADER" && (
                  <button
                    onClick={() => changeRole(m.user.id, "MEMBER")}
                    className="text-xs text-stone-400 hover:text-stone-300 transition-colors"
                  >
                    Revoke Leader
                  </button>
                )}
                <button
                  onClick={() => removeMember(m.user.id)}
                  className="text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <input
            type="email"
            placeholder="user@example.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={addMember}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        {memberMsg && <p className="text-red-400 text-xs">{memberMsg}</p>}
      </section>

      {/* Danger zone - superadmin only */}
      {isSuperadmin && (
        <section className="bg-stone-900 border border-red-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">
                {group.isActive ? "Suspend group" : "Reactivate group"}
              </p>
              <p className="text-xs text-stone-500">
                {group.isActive
                  ? "Members won't be able to access the group."
                  : "Group will become accessible to members again."}
              </p>
            </div>
            <button
              onClick={toggleActive}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                group.isActive
                  ? "border-amber-700 text-amber-400 hover:bg-amber-950"
                  : "border-emerald-700 text-emerald-400 hover:bg-emerald-950"
              }`}
            >
              {group.isActive ? "Suspend" : "Reactivate"}
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-red-900 pt-4">
            <div>
              <p className="text-sm text-stone-300">Delete group</p>
              <p className="text-xs text-stone-500">Permanently removes the group and all memberships.</p>
            </div>
            <button
              onClick={deleteGroup}
              className="text-sm px-4 py-2 rounded-lg border border-red-700 text-red-400 hover:bg-red-950 transition-colors"
            >
              Delete
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
