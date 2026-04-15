import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUMMARY_ENDPOINTS: Record<string, string> = {
  NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary",
  MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary",
  NHL: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary",
};

type EspnVideo = {
  id?: string | number;
  headline?: string;
  description?: string;
  thumbnail?: string;
  duration?: number | string;
  lastModified?: string;
  originalPublishDate?: string;
  links?: {
    web?: { href?: string };
    source?: {
      href?: string;
      HD?: { href?: string };
      HLS?: { href?: string; HD?: { href?: string } };
    };
    mobile?: {
      source?: { href?: string };
    };
  };
};

function toTimestamp(value: unknown): number {
  const ts = new Date(String(value || "")).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function pickLatestVideo(videos: EspnVideo[]): EspnVideo | null {
  if (!videos.length) return null;

  const sorted = [...videos].sort((a, b) => {
    return (
      toTimestamp(b?.lastModified || b?.originalPublishDate) -
      toTimestamp(a?.lastModified || a?.originalPublishDate)
    );
  });

  return (
    sorted.find((video) => {
      return Boolean(
        video?.links?.source?.HLS?.HD?.href ||
          video?.links?.source?.HLS?.href ||
          video?.links?.source?.HD?.href ||
          video?.links?.source?.href ||
          video?.links?.mobile?.source?.href
      );
    }) || sorted[0]
  );
}

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get("sport")?.toUpperCase() || "NBA";
  const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";

  if (!eventId) {
    return NextResponse.json(
      { ok: false, message: "Missing eventId", highlight: null },
      { status: 400 }
    );
  }

  const endpoint = SUMMARY_ENDPOINTS[sport];
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, message: "Unsupported sport", highlight: null },
      { status: 400 }
    );
  }

  try {
    const url = `${endpoint}?event=${encodeURIComponent(eventId)}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "RainmakerC9/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: "ESPN highlight fetch failed", highlight: null },
        { status: 502 }
      );
    }

    const data = await res.json();
    const videos = Array.isArray(data?.videos) ? (data.videos as EspnVideo[]) : [];
    const latest = pickLatestVideo(videos);

    if (!latest) {
      return NextResponse.json({
        ok: true,
        highlight: null,
        message: "No highlights available yet",
      });
    }

    const highlight = {
      id: String(latest.id || ""),
      headline: latest.headline || "Latest highlight",
      description: latest.description || "",
      thumbnail: latest.thumbnail || null,
      durationSec: Number(latest.duration || 0) || 0,
      hlsUrl:
        latest.links?.source?.HLS?.HD?.href ||
        latest.links?.source?.HLS?.href ||
        null,
      mp4Url:
        latest.links?.source?.HD?.href ||
        latest.links?.source?.href ||
        latest.links?.mobile?.source?.href ||
        null,
      webUrl: latest.links?.web?.href || null,
      publishedAt: latest.lastModified || latest.originalPublishDate || null,
    };

    return NextResponse.json({ ok: true, highlight });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: `ESPN highlight error: ${(error as Error).message}`,
        highlight: null,
      },
      { status: 500 }
    );
  }
}
