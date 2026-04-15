import "server-only";

import { NextRequest, NextResponse } from "next/server";

const NEO_COOKIE_NAME = "rm_neo_access";

export function neoPasscodeEnabled(): boolean {
  return Boolean(String(process.env.NEO_PASSCODE || "").trim());
}

export function hasNeoAccessCookie(req: NextRequest): boolean {
  const v = req.cookies.get(NEO_COOKIE_NAME)?.value;
  return v === "1";
}

export function requireNeoAccess(
  req: NextRequest
): { ok: true } | { ok: false; response: NextResponse } {
  if (!neoPasscodeEnabled()) return { ok: true };
  if (hasNeoAccessCookie(req)) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      { ok: false, message: "Neo is locked. Passcode required." },
      { status: 403 }
    ),
  };
}

export function setNeoAccessCookie(res: NextResponse): void {
  res.cookies.set({
    name: NEO_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}










