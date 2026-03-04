"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SyncData {
  videoId: string;
  title: string;
  seekSeconds: number;
  videoIndex: number;
  totalVideos: number;
}

interface HourlyPlayerProps {
  apiUrl: string; // e.g. "/api/playlist?type=public"
  label?: string;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars: Record<string, number | string>;
          events: {
            onReady: (e: { target: { seekTo: (s: number, b: boolean) => void; playVideo: () => void } }) => void;
          };
        }
      ) => void;
      loaded: number;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function HourlyPlayer({ apiUrl, label }: HourlyPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [sync, setSync] = useState<SyncData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSync = useCallback(async () => {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSync(data.sync ?? null);
      if (!data.sync && data.message) setError(data.message);
    } catch (e) {
      setError("Could not load playlist");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Reload at the top of every hour
  useEffect(() => {
    loadSync();
    const now = new Date();
    const msUntilNextHour =
      (3600 - (now.getMinutes() * 60 + now.getSeconds())) * 1000 -
      now.getMilliseconds();
    const timer = setTimeout(() => {
      loadSync();
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, [loadSync]);

  useEffect(() => {
    if (!sync || !playerRef.current) return;

    const initPlayer = () => {
      if (!playerRef.current) return;
      new window.YT.Player(playerRef.current, {
        videoId: sync.videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          start: Math.floor(sync.seekSeconds),
        },
        events: {
          onReady(e) {
            e.target.seekTo(sync.seekSeconds, true);
            e.target.playVideo();
          },
        },
      });
    };

    if (window.YT?.loaded) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById("yt-iframe-api")) {
        const script = document.createElement("script");
        script.id = "yt-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }
  }, [sync]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-stone-900 rounded-xl">
        <p className="text-stone-400 animate-pulse">Loading practice session…</p>
      </div>
    );
  }

  if (error || !sync) {
    return (
      <div className="flex items-center justify-center h-64 bg-stone-900 rounded-xl">
        <p className="text-stone-400">{error ?? "No playlist configured yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm text-stone-400 uppercase tracking-widest">{label}</p>
      )}
      <div className="text-lg font-medium text-stone-200">{sync.title}</div>
      <p className="text-xs text-stone-500">
        Video {sync.videoIndex + 1} of {sync.totalVideos} · synced to current hour
      </p>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <div ref={playerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
