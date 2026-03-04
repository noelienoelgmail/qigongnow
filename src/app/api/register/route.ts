import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, email, password, groupSlug } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "MEMBER" },
  });

  // If registering via a group invite link, auto-join the group
  if (groupSlug) {
    const group = await prisma.group.findUnique({ where: { slug: groupSlug } });
    if (group) {
      await prisma.membership.create({
        data: { userId: user.id, groupId: group.id },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
