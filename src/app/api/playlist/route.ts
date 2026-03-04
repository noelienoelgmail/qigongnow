import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  extractPlaylistId,
  fetchPlaylistVideos,
  calcHourlySync,
} from "@/lib/youtube";

// GET /api/playlist?type=public
// GET /api/playlist?type=group&groupId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");

  let playlistUrl: string | null = null;

  if (type === "public") {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    playlistUrl = settings?.publicPlaylist ?? null;
  } else if (type === "group") {
    const groupId = searchParams.get("groupId");
    if (!groupId)
      return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify membership or leader/superadmin
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const isSuperadmin = session.user.role === "SUPERADMIN";
    const isLeader = group.leaderId === session.user.id;
    const isMember = !!(await prisma.membership.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId } },
    }));

    if (!isSuperadmin && !isLeader && !isMember)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    playlistUrl = group.playlistUrl;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (!playlistUrl) {
    return NextResponse.json({ sync: null, message: "No playlist configured" });
  }

  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    return NextResponse.json(
      { error: "Invalid playlist URL" },
      { status: 400 }
    );
  }

  try {
    const videos = await fetchPlaylistVideos(playlistId);
    const sync = calcHourlySync(videos);
    return NextResponse.json({ sync, videos });
  } catch (err) {
    console.error("Playlist fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}
