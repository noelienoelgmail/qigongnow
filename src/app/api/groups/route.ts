import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/groups - list groups (superadmin: all, leader: own, member: joined)
export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, role } = session.user as { id: string; role: string };

  if (role === "SUPERADMIN") {
    const groups = await prisma.group.findMany({
      include: { leader: { select: { name: true, email: true } }, _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  }

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { leaderId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: { leader: { select: { name: true, email: true } }, _count: { select: { members: true } } },
  });
  return NextResponse.json(groups);
}

// POST /api/groups - create a group (leader or superadmin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  if (user.role !== "LEADER" && user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, slug, description, playlistUrl } = await req.json();
  if (!name || !slug)
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });

  const existing = await prisma.group.findUnique({ where: { slug } });
  if (existing)
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });

  const group = await prisma.group.create({
    data: { name, slug, description, playlistUrl, leaderId: user.id },
  });

  return NextResponse.json(group, { status: 201 });
}
