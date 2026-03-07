"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  playlistUrl: string | null;
}

interface Member {
  id: string;
  user: { id: string; name: string; email: string; role: string };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function LeaderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", playlistUrl: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups);
  }, [status]);

  useEffect(() => {
    if (!selected) { setMembers([]); return; }
    fetch(`/api/groups/${selected.id}/members`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setMembers(data) : setMembers([]));
  }, [selected]);

  function selectGroup(g: Group) {
    setSelected(g);
    setForm({
      name: g.name,
      slug: g.slug,
      description: g.description ?? "",
      playlistUrl: g.playlistUrl ?? "",
    });
    setMessage("");
  }

  async function saveGroup() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSelected(updated);
      setMessage("Saved!");
    } else {
      setMessage("Save failed");
    }
  }

  async function createGroup() {
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (res.ok) {
      const g = await res.json();
      setGroups((prev) => [g, ...prev]);
      selectGroup(g);
      if (role === "MEMBER") {
        setMessage("Group request submitted! An admin will review and activate it soon.");
      }
    } else {
      const d = await res.json();
      setMessage(d.error ?? "Failed to create group");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (status === "loading") return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-sky-400">Group Settings</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Group list */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-stone-500">Your groups</p>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGroup(g)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selected?.id === g.id
                  ? "border-sky-600 bg-sky-950"
                  : "border-stone-800 bg-stone-900 hover:border-stone-600"
              }`}
            >
              <p className="font-medium text-stone-200 text-sm">{g.name}</p>
              <p className="text-stone-500 text-xs">/{g.slug}</p>
            </button>
          ))}
          <button
            onClick={() => {
              setSelected(null);
              setForm({ name: "", slug: "", description: "", playlistUrl: "" });
              setMessage("");
            }}
            className="w-full text-left px-4 py-3 rounded-lg border border-dashed border-stone-700 text-stone-500 hover:text-stone-300 text-sm transition-colors"
          >
            + New group
          </button>
        </div>

        {/* Edit form */}
        <div className="md:col-span-2 space-y-4">
          {[
            { label: "Group name", key: "name", type: "text" },
            { label: "URL slug", key: "slug", type: "text" },
            { label: "Description", key: "description", type: "text" },
            { label: "YouTube playlist URL", key: "playlistUrl", type: "url" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm text-stone-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          ))}

          {message && (
            <p className={`text-sm ${message === "Saved!" || message.startsWith("Group request") ? "text-emerald-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <button
            onClick={selected ? saveGroup : createGroup}
            disabled={saving || creating}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {saving || creating ? "Saving…" : selected ? "Save changes" : role === "MEMBER" ? "Request group" : "Create group"}
          </button>

          {selected && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-500">Invite link:</p>
                <p className="text-xs font-mono text-stone-400 flex-1 truncate">
                  {origin}/register?group={selected.slug}
                </p>
                <CopyButton text={`${origin}/register?group=${selected.slug}`} />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-500">Public link:</p>
                <p className="text-xs font-mono text-stone-400 flex-1 truncate">
                  {origin}/{selected.slug}
                </p>
                <CopyButton text={`${origin}/${selected.slug}`} />
              </div>
            </div>
          )}

          {/* Members section */}
          {selected && members.length > 0 && (
            <div className="border-t border-stone-800 pt-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-stone-500">Members</p>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-sm text-stone-300">{m.user.name}</span>
                    <span className="text-xs text-stone-500 ml-2">{m.user.email}</span>
                  </div>
                  {(m.user.role === "LEADER" || m.user.role === "SUPERADMIN") && (
                    <span className="text-xs bg-sky-900 text-sky-300 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
