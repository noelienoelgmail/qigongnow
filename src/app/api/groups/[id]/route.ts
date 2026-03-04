import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/groups/[id] - update group (leader of group or superadmin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as { id: string; role: string };
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "SUPERADMIN" && group.leaderId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const allowed = ["name", "description", "playlistUrl", "isActive"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.group.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/groups/[id] - superadmin only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as { id: string; role: string };
  if (user.role !== "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
