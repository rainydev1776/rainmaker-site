import { NextRequest, NextResponse } from "next/server";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rainmaker Godview"',
    },
  });
}

function decodeBasicAuth(
  authHeader: string | null
): { user: string; pass: string } | null {
  try {
    if (!authHeader) return null;
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "basic" || !encoded) return null;

    const decoded =
      typeof atob === "function"
        ? atob(encoded)
        : Buffer.from(encoded, "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const u = String(process.env.GODVIEW_USER || "").trim();
  const p = String(process.env.GODVIEW_PASS || "").trim();

  // If not configured, hide the route entirely.
  if (!(u && p)) return new NextResponse("Not found.", { status: 404 });

  const creds = decodeBasicAuth(req.headers.get("authorization"));
  if (!creds) return unauthorized();
  if (creds.user !== u || creds.pass !== p) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/godview/:path*", "/labview/:path*"],
};


