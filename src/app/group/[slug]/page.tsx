import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import HourlyPlayer from "@/components/HourlyPlayer";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const group = await prisma.group.findUnique({ where: { slug } });
  if (!group) return <p className="text-stone-400">Group not found.</p>;

  const userId = (session.user as { id: string; role: string }).id;
  const role = (session.user as { id: string; role: string }).role;

  const isLeader = group.leaderId === userId;
  const isMember = !!(await prisma.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  }));

  if (!isLeader && !isMember && role !== "SUPERADMIN") {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-stone-400">You are not a member of this group.</p>
        <p className="text-stone-500 text-sm">
          Ask your group leader to share the invite link.
        </p>
      </div>
    );
  }

  const inviteUrl = `${process.env.NEXTAUTH_URL}/register?group=${group.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-emerald-400">{group.name}</h1>
        {group.description && (
          <p className="text-stone-400 mt-1">{group.description}</p>
        )}
        {(isLeader || role === "SUPERADMIN") && (
          <div className="mt-4 p-4 bg-stone-900 rounded-xl border border-stone-800 space-y-1">
            <p className="text-xs text-stone-500 uppercase tracking-widest">
              Member invite link
            </p>
            <p className="text-sm text-stone-300 font-mono break-all">{inviteUrl}</p>
          </div>
        )}
      </div>

      {group.playlistUrl ? (
        <HourlyPlayer
          apiUrl={`/api/playlist?type=group&groupId=${group.id}`}
          label={`${group.name} practice — synced now`}
        />
      ) : (
        <div className="flex items-center justify-center h-48 bg-stone-900 rounded-xl border border-stone-800">
          <p className="text-stone-500">
            {isLeader || role === "SUPERADMIN"
              ? "No playlist set yet — add one in your leader settings."
              : "Your group leader hasn't set up a playlist yet."}
          </p>
        </div>
      )}

      {(isLeader || role === "SUPERADMIN") && (
        <div className="border-t border-stone-800 pt-6">
          <a
            href="/leader"
            className="text-sm text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Manage group settings →
          </a>
        </div>
      )}
    </div>
  );
}
