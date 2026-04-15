import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  hasNeoAccessCookie,
  neoPasscodeEnabled,
  setNeoAccessCookie,
} from "@/lib/server/neo-gate";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  passcode: z.string().trim().min(1),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const enabled = neoPasscodeEnabled();
  const unlocked = enabled ? hasNeoAccessCookie(req) : true;
  return NextResponse.json({ ok: true, enabled, unlocked }, { status: 200 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!neoPasscodeEnabled()) {
    return NextResponse.json(
      { ok: true, enabled: false, unlocked: true },
      { status: 200 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Passcode required." },
      { status: 400 }
    );
  }

  const expected = String(process.env.NEO_PASSCODE || "").trim();
  const got = parsed.data.passcode;

  if (got !== expected) {
    return NextResponse.json(
      { ok: false, message: "Wrong passcode." },
      { status: 401 }
    );
  }

  const res = NextResponse.json(
    { ok: true, enabled: true, unlocked: true },
    { status: 200 }
  );
  setNeoAccessCookie(res);
  return res;
}










