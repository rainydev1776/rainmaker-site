"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Copy, Check, Upload, X, Share2 } from "lucide-react";
import Image from "next/image";
import Hls from "hls.js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface SharePnlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pnlAmount: number;
  pnlPercentage: number;
  invested: number;
  position: number;
  displayName?: string;
  profileImage?: string;
  autoHighlightEventId?: string | null;
  autoHighlightSport?: string;
  matchName?: string | null;
  modelLabel?: string | null;
  teamLogo?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeAbbr?: string | null;
  awayAbbr?: string | null;
  period?: string | null;
  clock?: string | null;
}

const STORAGE_KEY = "rainmaker-pnl-backgrounds";
const MAX_SAVED_BACKGROUNDS = 3;
const DEFAULT_BACKGROUND = "/pnl-default-bg.png";

type SavedBackground =
  | {
      kind: "image";
      src: string;
    }
  | {
      kind: "video";
      src: string; // blob:... URL or HLS m3u8 URL
      hlsUrl?: string; // original HLS playlist URL (for hls.js playback)
      source?: "user" | "auto";
      highlightEventId?: string;
      highlightSport?: string;
    };

function isVideoBackground(bg: SavedBackground | null | undefined): bg is SavedBackground & { kind: "video"; src: string } {
  return !!bg && bg.kind === "video";
}

function attachHlsToVideo(
  video: HTMLVideoElement,
  url: string,
  options?: { autoPlay?: boolean; debugLabel?: string }
): (() => void) | null {
  const autoPlay = options?.autoPlay ?? false;
  const debugLabel = options?.debugLabel || "share-pnl";
  const isHls = url.includes(".m3u8");

  video.crossOrigin = "anonymous";

  const tryPlay = () => {
    if (!autoPlay) return;
    void video.play().catch((error) => {
      console.debug(`[${debugLabel}] autoplay blocked/failed`, error);
    });
  };

  if (!isHls) {
    video.src = url;
    const onReady = () => tryPlay();
    video.addEventListener("loadedmetadata", onReady, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", onReady);
    };
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    const onReady = () => tryPlay();
    video.addEventListener("loadedmetadata", onReady, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", onReady);
    };
  }

  if (Hls.isSupported()) {
    // Use the lowest rendition for reliability. This background is heavily dimmed,
    // so consistent playback matters more than high resolution.
    const hls = new Hls({
      enableWorker: false,
      startLevel: 0,
      autoStartLoad: true,
      capLevelToPlayerSize: true,
      backBufferLength: 0,
      maxBufferLength: 8,
    });

    const onMediaAttached = () => {
      hls.loadSource(url);
    };

    const onManifestParsed = () => {
      try {
        hls.autoLevelCapping = 0;
        hls.currentLevel = 0;
        hls.nextLevel = 0;
        hls.loadLevel = 0;
      } catch {}
      tryPlay();
    };

    const onError = (_event: string, data: any) => {
      console.error(`[${debugLabel}] hls error`, data);
      if (!data?.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
        return;
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
        return;
      }
      hls.destroy();
    };

    hls.on(Hls.Events.MEDIA_ATTACHED, onMediaAttached);
    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.ERROR, onError);
    hls.attachMedia(video);

    return () => {
      try {
        hls.destroy();
      } catch {}
    };
  }

  video.src = url;
  const onReady = () => tryPlay();
  video.addEventListener("loadedmetadata", onReady, { once: true });
  return () => {
    video.removeEventListener("loadedmetadata", onReady);
  };
}

function HlsVideo({
  src,
  hlsUrl,
  className,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  preload,
}: {
  src: string;
  hlsUrl?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const destroy = attachHlsToVideo(video, hlsUrl || src, {
      autoPlay,
      debugLabel: "share-preview",
    });

    return () => {
      try {
        destroy?.();
      } catch {}
    };
  }, [src, hlsUrl, autoPlay]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload={preload}
      className={className}
    />
  );
}

function supportsCanvasVideoExport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof (HTMLCanvasElement.prototype as any).captureStream === "function"
  );
}

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Mac; use touchpoints to differentiate.
  const isIPadOS = ua.includes("Mac") && (navigator.maxTouchPoints || 0) > 1;
  return /iPhone|iPad|iPod/i.test(ua) || isIPadOS;
}

function supportsClipboardImage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.write === "function" &&
    "ClipboardItem" in window
  );
}

// Helper to load an image
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));

  // Prefer native API when available.
  const ctxWithRoundRect = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number) => void;
  };
  if (typeof ctxWithRoundRect.roundRect === "function") {
    ctxWithRoundRect.roundRect(x, y, w, h, radius);
    return;
  }

  // Fallback for older Safari/iOS: arcTo-based rounded rectangle.
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) return resolve(blob);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          fetch(dataUrl)
            .then((r) => r.blob())
            .then(resolve)
            .catch(reject);
        } catch (e) {
          reject(e);
        }
      },
      "image/png",
      1
    );
  });
}

type PnlCardAssets = {
  logo: HTMLImageElement | null;
  profile: HTMLImageElement | null;
  teamLogo: HTMLImageElement | null;
};

function getCanvasSourceSize(src: CanvasImageSource): { w: number; h: number } | null {
  const anySrc = src as any;
  const w = Number(anySrc.videoWidth || anySrc.naturalWidth || anySrc.width || 0);
  const h = Number(anySrc.videoHeight || anySrc.naturalHeight || anySrc.height || 0);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { w, h };
  return null;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  canvasW: number,
  canvasH: number,
  alpha: number
) {
  const size = getCanvasSourceSize(src);
  if (!size) return;

  const imgRatio = size.w / size.h;
  const canvasRatio = canvasW / canvasH;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (imgRatio > canvasRatio) {
    // Wider: fit by height, crop width.
    drawHeight = canvasH;
    drawWidth = canvasH * imgRatio;
    offsetX = (canvasW - drawWidth) / 2;
    offsetY = 0;
  } else {
    // Taller: fit by width, crop height.
    drawWidth = canvasW;
    drawHeight = canvasW / imgRatio;
    offsetX = 0;
    offsetY = (canvasH - drawHeight) / 2;
  }

  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(src, offsetX, offsetY, drawWidth, drawHeight);
  ctx.globalAlpha = prevAlpha;
}

async function preloadPnlCardAssets(profileImageSrc: string, teamLogoSrc?: string | null): Promise<PnlCardAssets> {
  const [logo, profile, teamLogo] = await Promise.all([
    loadImage("/rainmaker-logo.svg").catch(() => null),
    loadImage(profileImageSrc).catch(() => null),
    teamLogoSrc ? loadImage(teamLogoSrc).catch(() => null) : Promise.resolve(null),
  ]);
  return { logo, profile, teamLogo };
}

interface GameInfo {
  matchName?: string | null;
  modelLabel?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeAbbr?: string | null;
  awayAbbr?: string | null;
  period?: string | null;
  clock?: string | null;
}

function drawPnlCardFrame(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  bg: CanvasImageSource | null;
  pnlAmount: number;
  pnlPercentage: number;
  invested: number;
  position: number;
  displayName: string;
  assets: PnlCardAssets;
  gameInfo?: GameInfo | null;
}) {
  const {
    ctx,
    width,
    height,
    bg,
    pnlAmount,
    pnlPercentage,
    invested,
    position,
    displayName,
    assets,
    gameInfo,
  } = args;

  const isPositive = pnlAmount >= 0;
  const pnlColor = isPositive ? "#0EE957" : "#FF0066";

  // Background.
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, width, height);

  if (bg) {
    drawCover(ctx, bg, width, height, 0.6);
  }

  // Gradient overlay.
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.4)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header - Logo (top left).
  if (assets.logo) {
    const logoHeight = 16;
    const logoWidth = (assets.logo.width / assets.logo.height) * logoHeight;
    ctx.drawImage(assets.logo, 40, 36, logoWidth, logoHeight);
  } else {
    ctx.beginPath();
    ctx.arc(52, 48, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#0EA5E9";
    ctx.fill();
  }

  // Header - rainmaker text (top right).
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("rainmaker", width - 40, 55);

  // Game info strip (only for individual position shares).
  const hasGame = gameInfo?.matchName;
  if (hasGame) {
    const gY = 80;
    let gX = 40;

    if (assets.teamLogo) {
      const logoSize = 24;
      ctx.save();
      ctx.beginPath();
      ctx.arc(gX + logoSize / 2, gY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(assets.teamLogo, gX, gY, logoSize, logoSize);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(gX + logoSize / 2, gY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      gX += logoSize + 8;
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const gMid = gY + 12;

    if (gameInfo.homeScore != null && gameInfo.awayScore != null && gameInfo.awayAbbr && gameInfo.homeAbbr) {
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "600 13px system-ui, sans-serif";
      const scoreText = `${gameInfo.awayAbbr} ${gameInfo.awayScore} – ${gameInfo.homeAbbr} ${gameInfo.homeScore}`;
      ctx.fillText(scoreText, gX, gMid);
      gX += ctx.measureText(scoreText).width + 8;
    } else if (gameInfo.matchName) {
      ctx.fillStyle = "#d4d4d8";
      ctx.font = "500 13px system-ui, sans-serif";
      ctx.fillText(gameInfo.matchName, gX, gMid);
      gX += ctx.measureText(gameInfo.matchName).width + 8;
    }

    if (gameInfo.period) {
      ctx.fillStyle = "#71717a";
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillText("·", gX, gMid);
      gX += ctx.measureText("· ").width;
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(gameInfo.period, gX, gMid);
      gX += ctx.measureText(gameInfo.period).width + 6;
    }

    if (gameInfo.clock && gameInfo.clock !== "Live") {
      ctx.fillStyle = "#71717a";
      ctx.font = "400 12px system-ui, sans-serif";
      ctx.fillText("·", gX, gMid);
      gX += ctx.measureText("· ").width;
      ctx.fillStyle = "#FF0066";
      ctx.fillText(gameInfo.clock, gX, gMid);
      gX += ctx.measureText(gameInfo.clock).width + 10;
    }

    if (gameInfo.modelLabel) {
      ctx.font = "500 10px system-ui, sans-serif";
      const badgeText = gameInfo.modelLabel;
      const badgeW = ctx.measureText(badgeText).width + 12;
      const badgeH = 18;
      const badgeX = gX + 4;
      const badgeY = gMid - badgeH / 2;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#a1a1aa";
      ctx.textAlign = "center";
      ctx.fillText(badgeText, badgeX + badgeW / 2, gMid);
    }
  }

  // PNL Amount background pill.
  const pnlYOffset = hasGame ? 30 : 0;
  const pnlText = `${isPositive ? "+" : "-"}$${Math.abs(pnlAmount).toFixed(2)}`;
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.textAlign = "left";
  const pillWidth = ctx.measureText(pnlText).width + 40;

  ctx.fillStyle = isPositive ? "rgba(14, 233, 87, 0.15)" : "rgba(255, 0, 102, 0.15)";
  ctx.beginPath();
  roundedRectPath(ctx, 40, height - 240 + pnlYOffset, pillWidth, 60, 12);
  ctx.fill();

  // PNL Amount text.
  ctx.fillStyle = pnlColor;
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText(pnlText, 60, height - 195 + pnlYOffset);

  // Stats.
  const statsY = height - 130;
  ctx.font = "400 14px system-ui, sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.fillText("PNL", 40, statsY);
  ctx.fillText("Invested", 160, statsY);
  ctx.fillText("Position", 300, statsY);

  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillStyle = pnlColor;
  ctx.fillText(`${isPositive ? "+" : ""}${pnlPercentage.toFixed(2)}%`, 40, statsY + 28);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(`$${invested.toFixed(2)}`, 160, statsY + 28);
  ctx.fillText(`$${position.toFixed(2)}`, 300, statsY + 28);

  // User info - Profile image.
  const profileSize = 32;
  const profileX = 40;
  const profileY = height - 55;

  if (assets.profile) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      profileX + profileSize / 2,
      profileY + profileSize / 2,
      profileSize / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();
    ctx.drawImage(assets.profile, profileX, profileY, profileSize, profileSize);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(
      profileX + profileSize / 2,
      profileY + profileSize / 2,
      profileSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#27272a";
    ctx.fill();

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      displayName.charAt(0).toUpperCase(),
      profileX + profileSize / 2,
      profileY + profileSize / 2
    );
  }

  // User info - Username text.
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`@${displayName}`, profileX + profileSize + 10, profileY + profileSize / 2);
}

function pickBestMediaRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

function extForVideoMime(mime: string): "mp4" | "webm" {
  const m = String(mime || "").toLowerCase();
  return m.includes("mp4") ? "mp4" : "webm";
}

async function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 12_000): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return;
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("video_load_timeout"));
    }, timeoutMs);

    const onReady = () => {
      if (done) return;
      if (!(video.videoWidth > 0 && video.videoHeight > 0)) return;
      done = true;
      cleanup();
      resolve();
    };
    const onErr = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("video_load_failed"));
    };
    const cleanup = () => {
      window.clearTimeout(t);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onErr);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onErr);
  });
}

async function generatePnlVideoBlob(args: {
  videoSrc: string;
  hlsUrl?: string | null;
  pnlAmount: number;
  pnlPercentage: number;
  invested: number;
  position: number;
  displayName: string;
  profileImageSrc: string;
  teamLogoSrc?: string | null;
  gameInfo?: GameInfo | null;
  durationMs?: number;
  fps?: number;
}): Promise<Blob> {
  const {
    videoSrc,
    hlsUrl,
    pnlAmount,
    pnlPercentage,
    invested,
    position,
    displayName,
    profileImageSrc,
    teamLogoSrc,
    gameInfo,
    durationMs = 20_000,
    fps = 30,
  } = args;

  if (!supportsCanvasVideoExport()) {
    throw new Error("video_export_unsupported");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  const width = 800;
  const height = 500;
  canvas.width = width;
  canvas.height = height;

  const assets = await preloadPnlCardAssets(profileImageSrc, teamLogoSrc);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = "auto";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  // iOS Safari is more reliable when the video is in the DOM, even if hidden.
  video.style.position = "fixed";
  video.style.left = "-99999px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  document.body.appendChild(video);

  const destroyHls = attachHlsToVideo(video, hlsUrl || videoSrc, {
    autoPlay: false,
    debugLabel: "share-export",
  });

  const mimeType = pickBestMediaRecorderMimeType();
  const stream = (canvas as any).captureStream(fps) as MediaStream;
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (e: any) => {
      const data = e?.data as Blob | undefined;
      if (data && data.size > 0) chunks.push(data);
    });
    recorder.addEventListener("error", () => reject(new Error("record_failed")));
    recorder.addEventListener("stop", () => {
      const blobType =
        (chunks[0] as any)?.type || recorder.mimeType || mimeType || "video/webm";
      resolve(new Blob(chunks, { type: blobType }));
    });
  });

  try {
    await waitForVideoReady(video);
    // Some browsers require the play() call to happen after the video has data.
    try {
      await video.play();
    } catch (e) {
      throw new Error((e as any)?.message || "video_play_failed");
    }

    recorder.start();

    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now();
        const elapsed = now - start;

        drawPnlCardFrame({
          ctx,
          width,
          height,
          bg: video,
          pnlAmount,
          pnlPercentage,
          invested,
          position,
          displayName,
          assets,
          gameInfo,
        });

        if (elapsed >= durationMs) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });

    try {
      recorder.stop();
    } catch {}

    return await stopped;
  } finally {
    try {
      video.pause();
    } catch {}
    try {
      video.removeAttribute("src");
      video.load();
    } catch {}
    try {
      destroyHls?.();
    } catch {}
    try {
      video.remove();
    } catch {}
    try {
      for (const t of stream.getTracks()) t.stop();
    } catch {}
  }
}

// Canvas-based image generation
const generatePnlImageBlob = async (
  bgSrc: string | null,
  pnlAmount: number,
  pnlPercentage: number,
  invested: number,
  position: number,
  displayName: string,
  profileImageSrc: string,
  teamLogoSrc?: string | null,
  gameInfo?: GameInfo | null,
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const width = 800;
  const height = 500;
  canvas.width = width;
  canvas.height = height;

  const assets = await preloadPnlCardAssets(profileImageSrc, teamLogoSrc);

  let bg: HTMLImageElement | null = null;
  if (bgSrc) {
    bg = await loadImage(bgSrc).catch(() => null);
  }

  drawPnlCardFrame({
    ctx,
    width,
    height,
    bg,
    pnlAmount,
    pnlPercentage,
    invested,
    position,
    displayName,
    assets,
    gameInfo,
  });

  return await canvasToPngBlob(canvas);
};

export const SharePnlDialog = ({
  open,
  onOpenChange,
  pnlAmount,
  pnlPercentage,
  invested,
  position,
  displayName = "rainmaker_user",
  profileImage = "/rainmaker-pfp.png",
  autoHighlightEventId,
  autoHighlightSport = "NBA",
  matchName,
  modelLabel,
  teamLogo,
  homeScore,
  awayScore,
  homeAbbr,
  awayAbbr,
  period,
  clock,
}: SharePnlDialogProps) => {
  const cardGameInfo: GameInfo | null = matchName
    ? { matchName, modelLabel, homeScore, awayScore, homeAbbr, awayAbbr, period, clock }
    : null;

  const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
  const [selectedBgIndex, setSelectedBgIndex] = useState<number>(-1); // -1 = default background
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "shared">(
    "idle"
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevBackgroundsRef = useRef<SavedBackground[]>([]);

  const isPositive = pnlAmount >= 0;

  // Load saved backgrounds from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Back-compat: stored as string[] of image data URLs.
            const imgs = parsed
              .filter((x: any) => typeof x === "string" && x.length > 0)
              .map((src: string) => ({ kind: "image" as const, src }));
            setSavedBackgrounds(imgs);
          } else {
            setSavedBackgrounds([]);
          }
          // Keep default selected (-1), user can switch to custom if they want
        } catch {
          setSavedBackgrounds([]);
        }
      }
    }
  }, []);

  // Track which event IDs we've already fetched so the effect doesn't loop.
  const autoHighlightFetchedRef = useRef<string | null>(null);

  // Auto-load latest highlight video as a selectable background when available.
  useEffect(() => {
    if (!open) {
      autoHighlightFetchedRef.current = null;
      return;
    }
    const eventId = String(autoHighlightEventId || "").trim();
    if (!eventId) return;
    const sport = String(autoHighlightSport || "NBA").toUpperCase().trim() || "NBA";
    const fetchKey = `${sport}:${eventId}`;

    if (autoHighlightFetchedRef.current === fetchKey) return;
    autoHighlightFetchedRef.current = fetchKey;

    let cancelled = false;
    (async () => {
      try {
        const metaRes = await fetch(
          `/api/c9/highlights?sport=${encodeURIComponent(sport)}&eventId=${encodeURIComponent(eventId)}`
        ).catch(() => null);
        const meta = metaRes?.ok ? await metaRes.json().catch(() => null) : null;
        const hlsUrl = meta?.highlight?.hlsUrl ? String(meta.highlight.hlsUrl) : null;
        const mp4Url = meta?.highlight?.mp4Url ? String(meta.highlight.mp4Url) : null;
        if ((!hlsUrl && !mp4Url) || cancelled) return;

        // Use HLS URL directly (played via hls.js / native HLS).
        // Fall back to the proxy endpoint only if HLS is unavailable.
        const videoUrl = hlsUrl || `/api/c9/highlight-video?sport=${encodeURIComponent(sport)}&eventId=${encodeURIComponent(eventId)}`;

        if (cancelled) return;

        setSavedBackgrounds((prev) => {
          const withoutAuto = prev.filter(
            (b) =>
              !(
                b.kind === "video" &&
                b.source === "auto" &&
                b.highlightEventId === eventId &&
                (b.highlightSport || sport) === sport
              )
          );
          const autoBg: SavedBackground = {
            kind: "video",
            src: videoUrl,
            hlsUrl: hlsUrl || undefined,
            source: "auto",
            highlightEventId: eventId,
            highlightSport: sport,
          };
          return [autoBg, ...withoutAuto].slice(0, MAX_SAVED_BACKGROUNDS);
        });
        setSelectedBgIndex(0);
      } catch {
        // non-critical
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoHighlightEventId, autoHighlightSport]);

  // Revoke blob: URLs for video backgrounds when they get removed.
  useEffect(() => {
    const prev = prevBackgroundsRef.current;
    const prevVideo = prev.filter(isVideoBackground).map((b) => b.src);
    const nextVideo = savedBackgrounds.filter(isVideoBackground).map((b) => b.src);
    for (const src of prevVideo) {
      if (!nextVideo.includes(src) && src.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(src);
        } catch {}
      }
    }
    prevBackgroundsRef.current = savedBackgrounds;
  }, [savedBackgrounds]);

  useEffect(() => {
    return () => {
      for (const bg of prevBackgroundsRef.current) {
        if (isVideoBackground(bg) && bg.src.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(bg.src);
          } catch {}
        }
      }
    };
  }, []);

  // Save backgrounds to localStorage
  const saveBackgrounds = useCallback((backgrounds: SavedBackground[]) => {
    if (typeof window !== "undefined") {
      // Persist only images; videos are stored as blob: URLs and won't survive reloads.
      const imgs = backgrounds.filter((b) => b.kind === "image").map((b) => b.src);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imgs));
    }
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        const src = URL.createObjectURL(file);
        const newBg: SavedBackground = { kind: "video", src, source: "user" };
        const newBackgrounds = [newBg, ...savedBackgrounds].slice(0, MAX_SAVED_BACKGROUNDS);
        setSavedBackgrounds(newBackgrounds);
        saveBackgrounds(newBackgrounds);
        setSelectedBgIndex(0);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          const newBg: SavedBackground = { kind: "image", src };
          // Add to front, keep max 3
          const newBackgrounds = [newBg, ...savedBackgrounds].slice(
            0,
            MAX_SAVED_BACKGROUNDS
          );
          setSavedBackgrounds(newBackgrounds);
          saveBackgrounds(newBackgrounds);
          setSelectedBgIndex(0);
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveBackground = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBackgrounds = savedBackgrounds.filter((_, i) => i !== index);
    setSavedBackgrounds(newBackgrounds);
    saveBackgrounds(newBackgrounds);

    // Adjust selection - go back to default if current was removed
    if (selectedBgIndex === index) {
      setSelectedBgIndex(-1); // Go back to default
    } else if (selectedBgIndex > index) {
      setSelectedBgIndex(selectedBgIndex - 1);
    }
  };

  const selectedBg: SavedBackground | { kind: "image"; src: string } =
    selectedBgIndex === -1
      ? { kind: "image", src: DEFAULT_BACKGROUND }
      : savedBackgrounds[selectedBgIndex] || { kind: "image", src: DEFAULT_BACKGROUND };
  const selectedIsVideo = isVideoBackground(selectedBg);
  const bgSrcForExport = selectedIsVideo ? null : selectedBg.src;

  // Pre-render the image whenever the dialog opens or inputs change.
  // Mobile Safari often blocks clipboard/download actions if the image generation is awaited inside the click handler.
  useEffect(() => {
    if (!open) return;

    if (selectedIsVideo) {
      setRenderedBlob(null);
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setRenderedBlob(null);

    (async () => {
      try {
        const blob = await generatePnlImageBlob(
          bgSrcForExport,
          pnlAmount,
          pnlPercentage,
          invested,
          position,
          displayName,
          profileImage,
          teamLogo,
          cardGameInfo,
        );
        if (cancelled) return;
        setRenderedBlob(blob);
      } catch (e) {
        if (cancelled) return;
        setRenderedBlob(null);
        console.error("Failed to render PnL image:", e);
      } finally {
        if (cancelled) return;
        setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    bgSrcForExport,
    pnlAmount,
    pnlPercentage,
    invested,
    position,
    displayName,
    profileImage,
    selectedIsVideo,
  ]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (selectedIsVideo) {
        if (!supportsCanvasVideoExport()) return;
        const blob = await generatePnlVideoBlob({
          videoSrc: selectedBg.src,
          hlsUrl: isVideoBackground(selectedBg) ? selectedBg.hlsUrl : undefined,
          pnlAmount,
          pnlPercentage,
          invested,
          position,
          displayName,
          profileImageSrc: profileImage,
          teamLogoSrc: teamLogo,
          gameInfo: cardGameInfo,
        });

        const mime = blob.type || pickBestMediaRecorderMimeType() || "video/webm";
        const ext = extForVideoMime(mime);
        const filename = `rainmaker-pnl-${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: mime });

        const nav = navigator as unknown as {
          share?: (data: { files: File[]; title?: string }) => Promise<void>;
          canShare?: (data: { files: File[]; title?: string }) => boolean;
        };
        const shareData: { files: File[]; title?: string } = {
          files: [file],
          title: "rainmaker P&L",
        };
        const canShareFiles =
          typeof nav.share === "function" &&
          (typeof nav.canShare !== "function" || nav.canShare(shareData));

        if (isAppleMobile() && canShareFiles) {
          try {
            if (typeof nav.share === "function") {
              await nav.share(shareData);
            }
          } catch {
            // user-cancel or platform error; no-op
          }
          return;
        }

        const url = URL.createObjectURL(file);
        if (isAppleMobile()) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          const link = document.createElement("a");
          link.download = filename;
          link.href = url;
          link.rel = "noopener";
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        window.setTimeout(
          () => URL.revokeObjectURL(url),
          isAppleMobile() ? 60_000 : 2_000
        );
        return;
      }

      if (!renderedBlob) return;

      const filename = `rainmaker-pnl-${Date.now()}.png`;
      const file = new File([renderedBlob], filename, {
        type: renderedBlob.type || "image/png",
      });

      const nav = navigator as unknown as {
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
        canShare?: (data: { files: File[]; title?: string }) => boolean;
      };
      const shareData: { files: File[]; title?: string } = {
        files: [file],
        title: "rainmaker P&L",
      };
      const canShareFiles =
        typeof nav.share === "function" &&
        (typeof nav.canShare !== "function" || nav.canShare(shareData));

      // iOS-friendly: share sheet (includes "Save Image"). Don't fall back after awaiting share.
      if (isAppleMobile() && canShareFiles) {
        try {
          if (typeof nav.share === "function") {
            await nav.share(shareData);
          }
        } catch {
          // user-cancel or platform error; no-op
        }
        return;
      }

      const url = URL.createObjectURL(file);
      if (isAppleMobile()) {
        // iOS Safari ignores download; opening the blob lets users long-press save.
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        // Desktop/Android-friendly: download.
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Give iOS a bit longer to load the blob in a new tab before revoking.
      window.setTimeout(
        () => URL.revokeObjectURL(url),
        isAppleMobile() ? 60_000 : 2_000
      );
    } catch (error) {
      console.error("Failed to download:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      if (selectedIsVideo) {
        if (!supportsCanvasVideoExport()) return;
        const blob = await generatePnlVideoBlob({
          videoSrc: selectedBg.src,
          hlsUrl: isVideoBackground(selectedBg) ? selectedBg.hlsUrl : undefined,
          pnlAmount,
          pnlPercentage,
          invested,
          position,
          displayName,
          profileImageSrc: profileImage,
          teamLogoSrc: teamLogo,
          gameInfo: cardGameInfo,
        });

        const mime = blob.type || pickBestMediaRecorderMimeType() || "video/webm";
        const ext = extForVideoMime(mime);
        const filename = `rainmaker-pnl-${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: mime });

        const nav = navigator as unknown as {
          share?: (data: { files: File[]; title?: string }) => Promise<void>;
          canShare?: (data: { files: File[]; title?: string }) => boolean;
        };
        const shareData: { files: File[]; title?: string } = {
          files: [file],
          title: "rainmaker P&L",
        };
        const canShareFiles =
          typeof nav.share === "function" &&
          (typeof nav.canShare !== "function" || nav.canShare(shareData));
        if (canShareFiles) {
          try {
            if (typeof nav.share === "function") {
              await nav.share(shareData);
            }
            setCopyStatus("shared");
            setTimeout(() => setCopyStatus("idle"), 2000);
          } catch {
            // user-cancel or platform error; no-op
          }
          return;
        }

        // Fallback: download.
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
        setCopyStatus("shared");
        setTimeout(() => setCopyStatus("idle"), 2000);
        return;
      }

      if (!renderedBlob) return;

      const filename = `rainmaker-pnl-${Date.now()}.png`;
      const file = new File([renderedBlob], filename, {
        type: renderedBlob.type || "image/png",
      });

      // Best effort: copy image to clipboard (desktop Chromium, some Safari versions).
      if (supportsClipboardImage()) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [file.type]: renderedBlob,
          }),
        ]);

        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2000);
        return;
      }

      // Mobile fallback: share sheet.
      const nav = navigator as unknown as {
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
        canShare?: (data: { files: File[]; title?: string }) => boolean;
      };
      const shareData: { files: File[]; title?: string } = {
        files: [file],
        title: "rainmaker P&L",
      };
      const canShareFiles =
        typeof nav.share === "function" &&
        (typeof nav.canShare !== "function" || nav.canShare(shareData));
      if (canShareFiles) {
        try {
          if (typeof nav.share === "function") {
            await nav.share(shareData);
          }
          setCopyStatus("shared");
          setTimeout(() => setCopyStatus("idle"), 2000);
        } catch {
          // user-cancel or platform error; no-op
        }
        return;
      }

      // Last resort: copy a text summary.
      const text = `${isPositive ? "+" : "-"}${formatCurrency(
        Math.abs(pnlAmount)
      )} (${isPositive ? "+" : "-"}${pnlPercentage.toFixed(2)}%) on rainmaker`;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    } finally {
      setIsCopying(false);
    }
  };

  const currentBg = selectedBg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[480px] border-0 p-0 gap-0"
        style={{
          borderRadius: "12px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
          boxShadow: "0 0 0 1px #292929, 0 0 0 2px #0A0A0A",
        }}
        showCloseButton={false}
      >
        <div className="px-5 pt-5 pb-0">
          <DialogTitle className="text-lg font-semibold text-white">
            Share P&L Card
          </DialogTitle>
          <p className="mt-1 text-sm text-[#757575]">
            Customize and share your performance
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* PNL Card Preview */}
          <div
            className="relative aspect-[16/10] w-full overflow-hidden rounded-xl"
            style={{
              background: "#0a0a0c",
            }}
          >
            {/* Background (image or video) */}
            {isVideoBackground(currentBg) ? (
              <HlsVideo
                src={currentBg.src}
                hlsUrl={currentBg.hlsUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60"
                style={{
                  backgroundImage: `url('${currentBg.src}')`,
                }}
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex h-full flex-col justify-between p-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Image
                  src="/rainmaker-logo.svg"
                  alt="Rainmaker"
                  width={28}
                  height={28}
                  className="opacity-90"
                />
                <span className="text-sm font-medium text-white/80">
                  rainmaker
                </span>
              </div>

              {/* Main Stats */}
              <div className="space-y-4">
                {/* Game Info Strip */}
                {matchName && (
                  <div className="flex items-center gap-2">
                    {teamLogo && (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#121214]">
                        <Image src={teamLogo} alt="" fill sizes="24px" className="object-contain p-0.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs">
                      {homeScore != null && awayScore != null && awayAbbr && homeAbbr ? (
                        <span className="font-semibold text-zinc-200">
                          {awayAbbr} {awayScore} – {homeAbbr} {homeScore}
                        </span>
                      ) : (
                        <span className="font-medium text-zinc-300">{matchName}</span>
                      )}
                      {period && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-400">{period}</span>
                        </>
                      )}
                      {clock && clock !== "Live" && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-[#FF0066]">{clock}</span>
                        </>
                      )}
                    </div>
                    {modelLabel && (
                      <span className="ml-auto shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium leading-none text-zinc-400">
                        {modelLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* PNL Amount */}
                <div>
                  <div
                    className="inline-block rounded-lg px-3 py-1.5"
                    style={{
                      background: isPositive
                        ? "rgba(14, 233, 87, 0.15)"
                        : "rgba(255, 0, 102, 0.15)",
                    }}
                  >
                    <span
                      className="text-2xl font-bold"
                      style={{ color: isPositive ? "#0EE957" : "#FF0066" }}
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(Math.abs(pnlAmount))}
                    </span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-[#757575]">PNL</p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isPositive ? "#0EE957" : "#FF0066" }}
                    >
                      {isPositive ? "+" : ""}
                      {pnlPercentage.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757575]">Invested</p>
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(invested)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757575]">Position</p>
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(position)}
                    </p>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="relative h-6 w-6 overflow-hidden rounded-full">
                    <Image
                      src={profileImage}
                      alt="Profile"
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-sm text-zinc-400">@{displayName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Background Selection */}
          <div>
            <p className="mb-3 text-xs font-medium text-zinc-400">Background</p>
            <div className="flex items-center gap-2 justify-between w-full">
              <div className="flex items-center gap-2">
                {/* Default background */}
                <button
                  onClick={() => setSelectedBgIndex(-1)}
                  className={`relative h-14 w-20 overflow-hidden rounded-lg transition-all ${
                    selectedBgIndex === -1
                      ? "ring-2 ring-cyan-500"
                      : "ring-1 ring-white/10 hover:ring-white/20"
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${DEFAULT_BACKGROUND}')` }}
                  />
                </button>

                {/* Saved background slots */}
                {savedBackgrounds
                  .slice(0, MAX_SAVED_BACKGROUNDS)
                  .map((bg, index) => {
                    const isSelected = selectedBgIndex === index;

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedBgIndex(index)}
                        className={`relative h-14 w-20 overflow-hidden rounded-lg transition-all ${
                          isSelected
                            ? "ring-2 ring-cyan-500"
                            : "ring-1 ring-white/10 hover:ring-white/20"
                        }`}
                      >
                        {bg.kind === "video" ? (
                          <HlsVideo
                            src={bg.src}
                            hlsUrl={bg.hlsUrl}
                            muted
                            playsInline
                            loop
                            autoPlay={false}
                            preload="metadata"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${bg.src}')` }}
                          />
                        )}
                        {/* Remove button */}
                        <button
                          onClick={(e) => handleRemoveBackground(index, e)}
                          className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white/70 transition-opacity hover:bg-black/80 hover:text-white"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </button>
                    );
                  })}
              </div>

              {/* Upload Button */}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-lg ring-1 ring-white/10 transition-all hover:ring-white/20"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <Upload className="h-4 w-4 text-[#757575]" />
                  <span className="text-[10px] text-[#757575]">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={
                isDownloading ||
                isRendering ||
                (!selectedIsVideo && !renderedBlob) ||
                (selectedIsVideo && !supportsCanvasVideoExport())
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-zinc-300 transition-all hover:text-white disabled:opacity-50"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
              }}
            >
              <Download className="h-4 w-4" />
              {selectedIsVideo
                ? isDownloading
                  ? "Recording…"
                  : "Download video"
                : isRendering
                  ? "Preparing..."
                  : isDownloading
                    ? "Saving..."
                    : "Download"}
            </button>
            <button
              onClick={handleCopy}
              disabled={
                isCopying ||
                isRendering ||
                (selectedIsVideo ? !supportsCanvasVideoExport() : !renderedBlob)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
              style={{
                background: "#0EA5E9",
                boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
              }}
            >
              {copyStatus !== "idle" ? (
                <>
                  <Check className="h-4 w-4" />
                  {copyStatus === "copied" ? "Copied!" : "Shared!"}
                </>
              ) : (
                <>
                  {selectedIsVideo ? (
                    <Share2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {selectedIsVideo ? (isCopying ? "Working..." : "Share video") : isCopying ? "Working..." : "Copy"}
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
