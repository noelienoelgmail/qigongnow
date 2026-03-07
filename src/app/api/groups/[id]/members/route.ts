import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/groups/[id]/members - superadmin or leader of this group
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionUser = session.user as { id: string; role: string };

  if (sessionUser.role !== "SUPERADMIN") {
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.leaderId !== sessionUser.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.membership.findMany({
    where: { groupId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return NextResponse.json(members);
}

// POST /api/groups/[id]/members - add user by email (superadmin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUser = session.user as { role: string };
  if (sessionUser.role !== "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "No user with that email" }, { status: 404 });

  const existing = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const membership = await prisma.membership.create({
    data: { userId: user.id, groupId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  return NextResponse.json(membership, { status: 201 });
}

// DELETE /api/groups/[id]/members?userId=xxx (superadmin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUser = session.user as { role: string };
  if (sessionUser.role !== "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await prisma.membership.delete({
    where: { userId_groupId: { userId, groupId: id } },
  });
  return NextResponse.json({ ok: true });
}
