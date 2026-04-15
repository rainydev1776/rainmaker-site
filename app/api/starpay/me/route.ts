import { NextRequest, NextResponse } from "next/server";
import { requireBackendSession } from "@/lib/server/backend-session";
import { requireNeoAccess } from "@/lib/server/neo-gate";
import { starpayGetAccount } from "@/lib/server/starpay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const neo = requireNeoAccess(req);
  if (!neo.ok) return neo.response;

  const auth = await requireBackendSession(req);
  if (!auth.ok) return auth.response;

  const out = await starpayGetAccount();
  if (!out.ok) {
    return NextResponse.json(
      { ok: false, message: out.message, error: out.error },
      { status: out.status || 500 }
    );
  }

  return NextResponse.json({ ok: true, account: out.data }, { status: 200 });
}


