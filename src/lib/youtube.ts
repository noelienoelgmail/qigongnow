export interface PlaylistVideo {
  videoId: string;
  title: string;
  durationSeconds: number;
}

/** Extract playlist ID from a YouTube playlist URL */
export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

/** Parse ISO 8601 duration (e.g. PT4M13S) to seconds */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

/** Fetch all videos + durations from a YouTube playlist via Data API v3 */
export async function fetchPlaylistVideos(
  playlistId: string
): Promise<PlaylistVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  const videos: PlaylistVideo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`
    );
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();

    // Fetch video durations in a batch
    const videoIds: string[] = data.items.map(
      (item: { contentDetails: { videoId: string } }) =>
        item.contentDetails.videoId
    );
    const durParams = new URLSearchParams({
      part: "contentDetails",
      id: videoIds.join(","),
      key: apiKey,
    });
    const durRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${durParams}`
    );
    if (!durRes.ok) throw new Error(`YouTube API error: ${durRes.status}`);
    const durData = await durRes.json();

    const durationMap: Record<string, number> = {};
    for (const v of durData.items) {
      durationMap[v.id] = parseDuration(v.contentDetails.duration);
    }

    for (const item of data.items) {
      const videoId = item.contentDetails.videoId;
      videos.push({
        videoId,
        title: item.snippet.title,
        durationSeconds: durationMap[videoId] ?? 0,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return videos;
}

export interface SyncPosition {
  videoId: string;
  title: string;
  seekSeconds: number;
  videoIndex: number;
  totalVideos: number;
}

/**
 * Given a list of videos and the current UTC time,
 * calculate which video should be playing and at what offset.
 * The playlist resets at the top of every hour.
 */
export function calcHourlySync(videos: PlaylistVideo[]): SyncPosition | null {
  if (!videos.length) return null;

  const now = new Date();
  // Seconds elapsed since the top of the current UTC hour
  const elapsedSeconds = now.getUTCMinutes() * 60 + now.getUTCSeconds();

  // Total playlist duration
  const totalDuration = videos.reduce((s, v) => s + v.durationSeconds, 0);
  if (totalDuration === 0) return null;

  // Wrap elapsed time within playlist length
  const position = elapsedSeconds % totalDuration;

  let accumulated = 0;
  for (let i = 0; i < videos.length; i++) {
    accumulated += videos[i].durationSeconds;
    if (position < accumulated) {
      const seekSeconds =
        position - (accumulated - videos[i].durationSeconds);
      return {
        videoId: videos[i].videoId,
        title: videos[i].title,
        seekSeconds,
        videoIndex: i,
        totalVideos: videos.length,
      };
    }
  }

  // Fallback to first video
  return {
    videoId: videos[0].videoId,
    title: videos[0].title,
    seekSeconds: 0,
    videoIndex: 0,
    totalVideos: videos.length,
  };
}
