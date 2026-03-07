import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password)
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date())
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email: record.email }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
