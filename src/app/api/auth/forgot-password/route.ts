import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Always return ok to avoid revealing whether the email exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your QiGong Now password",
    html: `
      <p>Hi ${user.name},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
