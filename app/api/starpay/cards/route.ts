import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  starpayCreateOrder,
  starpayGetOrderStatus,
  type StarpayCardType,
} from "@/lib/server/starpay";
import { requireBackendSession } from "@/lib/server/backend-session";
import { requireNeoAccess } from "@/lib/server/neo-gate";

export const dynamic = "force-dynamic";

const CreateOrderSchema = z.object({
  amount: z.coerce.number().finite().min(5).max(10_000),
  cardType: z.enum(["visa", "mastercard"]) as z.ZodType<StarpayCardType>,
  email: z.string().trim().email(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const neo = requireNeoAccess(req);
  if (!neo.ok) return neo.response;

  const auth = await requireBackendSession(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const out = await starpayCreateOrder(parsed.data);
  if (!out.ok) {
    return NextResponse.json(
      { ok: false, message: out.message, error: out.error },
      { status: out.status || 500 }
    );
  }

  return NextResponse.json({ ok: true, order: out.data }, { status: 200 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const neo = requireNeoAccess(req);
  if (!neo.ok) return neo.response;

  const auth = await requireBackendSession(req);
  if (!auth.ok) return auth.response;

  // Back-compat: allow ?cardId=... but treat it as Starpay orderId
  const orderId = String(
    req.nextUrl.searchParams.get("orderId") ||
      req.nextUrl.searchParams.get("cardId") ||
      ""
  ).trim();
  if (!orderId) {
    return NextResponse.json(
      { ok: false, message: "orderId is required." },
      { status: 400 }
    );
  }

  const out = await starpayGetOrderStatus({ orderId });
  if (!out.ok) {
    return NextResponse.json(
      { ok: false, message: out.message, error: out.error },
      { status: out.status || 500 }
    );
  }

  return NextResponse.json({ ok: true, order: out.data }, { status: 200 });
}


