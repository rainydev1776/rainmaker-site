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
  lastModified?: string;
  originalPublishDate?: string;
  links?: {
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
        video?.links?.source?.HD?.href ||
          video?.links?.source?.href ||
          video?.links?.mobile?.source?.href ||
          video?.links?.source?.HLS?.HD?.href ||
          video?.links?.source?.HLS?.href
      );
    }) || sorted[0]
  );
}

function pickMp4Url(video: EspnVideo | null): string | null {
  if (!video) return null;
  return (
    video?.links?.source?.HD?.href ||
    video?.links?.source?.href ||
    video?.links?.mobile?.source?.href ||
    null
  );
}

function pickHlsUrl(video: EspnVideo | null): string | null {
  if (!video) return null;
  return (
    video?.links?.source?.HLS?.HD?.href ||
    video?.links?.source?.HLS?.href ||
    null
  );
}

async function tryFetchMp4(mp4Url: string): Promise<Response | null> {
  try {
    const res = await fetch(mp4Url, {
      headers: { "user-agent": "RainmakerC9/1.0" },
    });
    if (res.ok && res.body) return res;
    return null;
  } catch {
    return null;
  }
}

async function fetchHlsAsVideo(hlsUrl: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  try {
    const masterRes = await fetch(hlsUrl, {
      headers: { "user-agent": "Mozilla/5.0" },
    });
    if (!masterRes.ok) return null;
    const masterText = await masterRes.text();

    const baseUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf("/") + 1);

    // Pick the highest-bandwidth variant from the master playlist.
    const variantLines = masterText.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const subPlaylistUrl = variantLines.length
      ? variantLines[variantLines.length - 1].trim()
      : null;

    let segmentUrls: string[] = [];

    if (subPlaylistUrl) {
      const subUrl = subPlaylistUrl.startsWith("http") ? subPlaylistUrl : `${baseUrl}${subPlaylistUrl}`;
      const subRes = await fetch(subUrl, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!subRes.ok) return null;
      const subText = await subRes.text();
      const subBase = subUrl.substring(0, subUrl.lastIndexOf("/") + 1);
      segmentUrls = subText
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((seg) => (seg.startsWith("http") ? seg : `${subBase}${seg.trim()}`));
    } else {
      segmentUrls = masterText
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((seg) => (seg.startsWith("http") ? seg : `${baseUrl}${seg.trim()}`));
    }

    if (!segmentUrls.length) return null;

    const chunks: Uint8Array[] = [];
    for (const segUrl of segmentUrls) {
      const segRes = await fetch(segUrl, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!segRes.ok) return null;
      chunks.push(new Uint8Array(await segRes.arrayBuffer()));
    }

    const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }

    return { body: merged.buffer as ArrayBuffer, contentType: "video/mp2t" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get("sport")?.toUpperCase() || "NBA";
  const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";

  if (!eventId) {
    return NextResponse.json({ ok: false, message: "Missing eventId" }, { status: 400 });
  }

  const endpoint = SUMMARY_ENDPOINTS[sport];
  if (!endpoint) {
    return NextResponse.json({ ok: false, message: "Unsupported sport" }, { status: 400 });
  }

  try {
    const summaryUrl = `${endpoint}?event=${encodeURIComponent(eventId)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "RainmakerC9/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!summaryRes.ok) {
      return NextResponse.json(
        { ok: false, message: "ESPN highlight fetch failed" },
        { status: 502 }
      );
    }

    const data = await summaryRes.json();
    const videos = Array.isArray(data?.videos) ? (data.videos as EspnVideo[]) : [];
    const latest = pickLatestVideo(videos);

    if (!latest) {
      return NextResponse.json(
        { ok: false, message: "No highlight available yet" },
        { status: 404 }
      );
    }

    // 1) Try direct MP4 download first.
    const mp4Url = pickMp4Url(latest);
    if (mp4Url) {
      const mp4Res = await tryFetchMp4(mp4Url);
      if (mp4Res) {
        const contentType = mp4Res.headers.get("content-type") || "video/mp4";
        return new NextResponse(mp4Res.body, {
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=300",
          },
        });
      }
    }

    // 2) MP4 unavailable — fall back to HLS segment concatenation.
    const hlsUrl = pickHlsUrl(latest);
    if (hlsUrl) {
      const hlsResult = await fetchHlsAsVideo(hlsUrl);
      if (hlsResult) {
        return new NextResponse(hlsResult.body, {
          headers: {
            "content-type": hlsResult.contentType,
            "cache-control": "public, max-age=300",
          },
        });
      }
    }

    return NextResponse.json(
      { ok: false, message: "No playable highlight found" },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: `highlight_video_error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
