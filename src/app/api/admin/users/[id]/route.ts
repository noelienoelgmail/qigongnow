import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user) return null;
  return (session.user as { role: string }).role === "SUPERADMIN" ? session : null;
}

// GET /api/admin/users/[id] - full user details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperadmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      memberships: { include: { group: { select: { id: true, name: true, slug: true } } } },
      ledGroups: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/admin/users/[id] - update name, email, role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperadmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, email, role } = await req.json();

  if (role && !["MEMBER", "LEADER", "SUPERADMIN"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  // Prevent demoting the last superadmin
  if (role && role !== "SUPERADMIN") {
    const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (current?.role === "SUPERADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPERADMIN" } });
      if (count <= 1)
        return NextResponse.json({ error: "Cannot remove the only superadmin" }, { status: 400 });
    }
  }

  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
}
