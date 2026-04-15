import { NextRequest, NextResponse } from "next/server";
import { SOLANA_TRACKER_RPC_UPSTREAM_URL } from "@/lib/solanaRpc";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const upstream = await fetch(SOLANA_TRACKER_RPC_UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        Accept: request.headers.get("accept") || "application/json",
      },
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : "rpc_proxy_failed",
        },
        id: null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
