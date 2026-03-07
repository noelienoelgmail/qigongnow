import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/admin/users/[id] - change user role (superadmin only)
// Body: { role: "LEADER" | "MEMBER" }
export async function PATCH(
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
  const { role } = await req.json();
  if (role !== "LEADER" && role !== "MEMBER")
    return NextResponse.json({ error: "role must be LEADER or MEMBER" }, { status: 400 });

  const updated = await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ id: updated.id, role: updated.role });
}
