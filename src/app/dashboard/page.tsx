import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string; role: string }).id;
  const userRole = (session.user as { id: string; role: string }).role;

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { group: { include: { leader: { select: { name: true } } } } },
  });

  const ledGroups = await prisma.group.findMany({
    where: { leaderId: userId },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-emerald-400">
          Welcome, {session.user.name}
        </h1>
        <p className="text-stone-400 mt-1">Your practice groups</p>
      </div>

      {ledGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-stone-500">
            Groups you lead
          </h2>
          <div className="grid gap-3">
            {ledGroups.map((g: { id: string; name: string; slug: string; isActive: boolean; _count: { members: number } }) => (
              <Link
                key={g.id}
                href={`/${g.slug}`}
                className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-emerald-700 transition-colors"
              >
                <div>
                  <p className="font-semibold text-stone-100">{g.name}</p>
                  <p className="text-stone-500 text-sm">{g._count.members} members</p>
                </div>
                <div className="flex items-center gap-2">
                  {!g.isActive && (
                    <span className="text-xs bg-amber-900 text-amber-300 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  )}
                  <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded-full">
                    Leader
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {memberships.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-stone-500">
            Groups you&apos;re in
          </h2>
          <div className="grid gap-3">
            {memberships.map(({ group }: { group: { id: string; name: string; slug: string; leader: { name: string } } }) => (
              <Link
                key={group.id}
                href={`/${group.slug}`}
                className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-emerald-700 transition-colors"
              >
                <div>
                  <p className="font-semibold text-stone-100">{group.name}</p>
                  <p className="text-stone-500 text-sm">Led by {group.leader.name}</p>
                </div>
                <span className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded-full">
                  Member
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {memberships.length === 0 && ledGroups.length === 0 && (
        <div className="text-center py-16 text-stone-500 space-y-2">
          <p>You&apos;re not in any groups yet.</p>
          <p className="text-sm">
            Ask your group leader for an invite link, or{" "}
            <Link href="/" className="text-emerald-400 underline underline-offset-2">
              join the public practice
            </Link>
            .
          </p>
        </div>
      )}

      {userRole === "MEMBER" && (
        <div className="border-t border-stone-800 pt-8 text-center space-y-2">
          <p className="text-stone-500 text-sm">Want to lead your own practice group?</p>
          <Link href="/leader" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 text-sm">
            Request a group →
          </Link>
        </div>
      )}
    </div>
  );
}
