import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function authorizeLeaderOrAdmin(groupId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { id: string; role: string };
  if (user.role === "SUPERADMIN") return user;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (group?.leaderId === user.id) return user;
  return null;
}

// GET /api/groups/[id]/members - superadmin or leader of this group
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await authorizeLeaderOrAdmin(id);
  if (!user)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.membership.findMany({
    where: { groupId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return NextResponse.json(members);
}

// POST /api/groups/[id]/members - add user by email (superadmin or group leader)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await authorizeLeaderOrAdmin(id);
  if (!user)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "No user with that email" }, { status: 404 });

  const existing = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: target.id, groupId: id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const membership = await prisma.membership.create({
    data: { userId: target.id, groupId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  return NextResponse.json(membership, { status: 201 });
}

// DELETE /api/groups/[id]/members?userId=xxx (superadmin or group leader)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await authorizeLeaderOrAdmin(id);
  if (!user)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await prisma.membership.delete({
    where: { userId_groupId: { userId, groupId: id } },
  });
  return NextResponse.json({ ok: true });
}
