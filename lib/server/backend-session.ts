import "server-only";

import { NextRequest, NextResponse } from "next/server";

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

export async function requireBackendSession(
  req: NextRequest
): Promise<
  | { ok: true; token: string }
  | { ok: false; response: NextResponse }
> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  // Validate token against the existing backend (/api/me is rewritten in Vercel).
  try {
    const meUrl = new URL("/api/me", req.url);
    const meRes = await fetch(meUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!meRes.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Invalid session. Reconnect your wallet." },
          { status: 401 }
        ),
      };
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Auth check failed. Please try again." },
        { status: 503 }
      ),
    };
  }

  return { ok: true, token };
}










