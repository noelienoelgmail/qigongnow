import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/settings
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  return NextResponse.json(settings ?? { id: "singleton", publicPlaylist: null });
}

// PATCH /api/admin/settings
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { publicPlaylist } = await req.json();

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { publicPlaylist },
    create: { id: "singleton", publicPlaylist },
  });
  return NextResponse.json(settings);
}
