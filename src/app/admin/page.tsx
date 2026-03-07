"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  leader: { name: string; email: string };
  _count: { members: number };
}

interface Member {
  id: string;
  user: { id: string; name: string; email: string };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [publicPlaylist, setPublicPlaylist] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [memberMessage, setMemberMessage] = useState("");

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

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (expandedGroupId === id) setExpandedGroupId(null);
  }

  async function toggleGroup(id: string, isActive: boolean) {
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: updated.isActive } : g)));
    }
  }

  async function toggleMembers(groupId: string) {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    const res = await fetch(`/api/groups/${groupId}/members`);
    const data = await res.json();
    setMembers(data);
    setExpandedGroupId(groupId);
    setAddEmail("");
    setMemberMessage("");
  }

  async function addMember(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers((prev) => [...prev, data]);
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, _count: { members: g._count.members + 1 } } : g));
      setAddEmail("");
      setMemberMessage("");
    } else {
      setMemberMessage(data.error ?? "Failed to add member");
    }
  }

  async function removeMember(groupId: string, userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, _count: { members: g._count.members - 1 } } : g));
    }
  }

  if (status === "loading") return null;

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

      {/* All groups */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">All Groups</h2>
        {groups.length === 0 && (
          <p className="text-stone-500 text-sm">No groups registered yet.</p>
        )}
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-stone-200">{g.name}</p>
                  <p className="text-stone-500 text-xs">
                    /group/{g.slug} · {g._count.members} members · led by {g.leader.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleMembers(g.id)}
                    className="text-xs px-3 py-1 rounded-full border border-stone-700 text-stone-400 hover:bg-stone-800 transition-colors"
                  >
                    {expandedGroupId === g.id ? "Hide members" : "Members"}
                  </button>
                  <button
                    onClick={() => toggleGroup(g.id, g.isActive)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      g.isActive
                        ? "border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                        : "border-stone-700 text-stone-500 hover:bg-stone-800"
                    }`}
                  >
                    {g.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedGroupId === g.id && (
                <div className="border-t border-stone-800 px-5 py-4 space-y-3">
                  {members.length === 0 && (
                    <p className="text-stone-500 text-sm">No members yet.</p>
                  )}
                  {members.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-300">{m.user.name}</p>
                        <p className="text-xs text-stone-500">{m.user.email}</p>
                      </div>
                      <button
                        onClick={() => removeMember(g.id, m.user.id)}
                        className="text-xs text-red-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMember(g.id)}
                      className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => addMember(g.id)}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {memberMessage && <p className="text-red-400 text-xs">{memberMessage}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
