import { NextRequest, NextResponse } from "next/server";
import { requireNeoAccess } from "@/lib/server/neo-gate";
import { starpayCreateOrder, starpayGetOrderStatus } from "@/lib/server/starpay";
const BACKEND_URL = "https://walrus-app-tddno.ondigitalocean.app";

/**
 * POST /api/neo/issue-card
 * 
 * Flow:
 * 1. Create a Starpay order (returns a generated SOL payment address + amountSol)
 * 2. Withdraw SOL from user's Turnkey wallet to that payment address
 * 3. UI polls Starpay order status until completed (card emailed automatically)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check Neo passcode gate
  const gate = requireNeoAccess(req);
  if (!gate.ok) {
    return gate.response;
  }

  // Forward auth header to backend
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader) {
    return NextResponse.json(
      { ok: false, message: "Missing authorization" },
      { status: 401 }
    );
  }

  let body: {
    // Prepare
    amount?: number;
    cardType?: string;
    email?: string;
    // Confirm
    orderId?: string;
    stepUp?: { msg?: string; sig?: any; signedTxBase64?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const providedOrderId = String((body as any)?.orderId || "").trim() || null;

  const mkStepUpMessage = (args: { orderId: string; toAddress: string; amountSol: number }) => {
    const nonce =
      (globalThis as any)?.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expMs = Date.now() + 2 * 60_000;
    const lamports = Math.round(Number(args.amountSol) * 1_000_000_000);
    return [
      "RM_STEPUP",
      "v:1",
      "op:svm_sol_transfer",
      "chain:svm",
      "token:SOL",
      `to:${String(args.toAddress || "").trim()}`,
      `raw:${String(lamports)}`,
      `nonce:${nonce}`,
      `exp:${expMs}`,
      "ctx:neo_issue_card",
      `order:${String(args.orderId || "").trim()}`,
    ].join("|");
  };

  // ----------------------------------------------------------------------------
  // CONFIRM: pay an existing Starpay order (requires step-up signature in body.stepUp)
  // ----------------------------------------------------------------------------
  if (providedOrderId) {
    const orderId = providedOrderId;

    // Fetch current order details (source of truth)
    const statusOut = await starpayGetOrderStatus({ orderId });
    if (!statusOut.ok) {
      return NextResponse.json(
        { ok: false, message: `Starpay status failed: ${statusOut.message}`, orderId },
        { status: statusOut.status || 500 }
      );
    }

    const order = statusOut.data as any;
    const payAddress = String(order?.payment?.address || "").trim();
    const payAmountSol = Number(order?.payment?.amountSol);
    if (!payAddress || !Number.isFinite(payAmountSol) || payAmountSol <= 0) {
      return NextResponse.json(
        { ok: false, message: "Starpay order is missing payment details.", orderId },
        { status: 502 }
      );
    }

    const stepUpMessage = mkStepUpMessage({ orderId, toAddress: payAddress, amountSol: payAmountSol });
    const stepUp = (body as any)?.stepUp || null;
    const stepUpMsg = String(stepUp?.msg || "").trim();
    if (!stepUp || !stepUpMsg) {
      return NextResponse.json(
        {
          ok: true,
          needsStepUp: true,
          order,
          orderId,
          stepUpMessage,
          message: "Signature required to pay this order.",
        },
        { status: 200 }
      );
    }

    // NOTE: Signature is verified by the backend /api/withdraw endpoint.
    // We only forward the stepUp proof and payment details derived from Starpay.
    let withdrawTxSig: string | null = null;
    try {
      const wdRes = await fetch(`${BACKEND_URL}/api/withdraw`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toAddress: payAddress,
          amountSol: payAmountSol,
          stepUp,
        }),
      });
      if (!wdRes.ok) {
        const txt = await wdRes.text().catch(() => "");
        return NextResponse.json(
          { ok: false, message: `SOL transfer failed: ${txt.slice(0, 200)}`, orderId },
          { status: 500 }
        );
      }
      const wdJson = await wdRes.json().catch(() => null);
      withdrawTxSig = wdJson?.txSig || null;

      if (!withdrawTxSig) {
        return NextResponse.json(
          { ok: false, message: "Transfer succeeded but no txSig returned", orderId },
          { status: 500 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { ok: false, message: `Transfer error: ${(e as Error).message}`, orderId },
        { status: 500 }
      );
    }

    // One immediate status check (UI will continue polling)
    let orderStatus = order;
    const statusOut2 = await starpayGetOrderStatus({ orderId });
    if (statusOut2.ok) orderStatus = { ...order, ...statusOut2.data } as any;

    return NextResponse.json(
      {
        ok: true,
        needsStepUp: false,
        order: orderStatus,
        orderId,
        withdrawTxSig,
      },
      { status: 200 }
    );
  }

  // ----------------------------------------------------------------------------
  // PREPARE: create a new order and return a step-up message to sign
  // ----------------------------------------------------------------------------
  const amount = Number(body.amount);
  const cardType = String(body.cardType || "visa").toLowerCase();
  const email = String(body.email || "").trim();

  if (!Number.isFinite(amount) || amount < 5 || amount > 10000) {
    return NextResponse.json(
      { ok: false, message: "Amount must be between $5 and $10,000" },
      { status: 400 }
    );
  }
  if (!["visa", "mastercard"].includes(cardType)) {
    return NextResponse.json(
      { ok: false, message: "cardType must be visa or mastercard" },
      { status: 400 }
    );
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, message: "Valid email required" },
      { status: 400 }
    );
  }

  // Step 1: Create Starpay order (returns payment address + required SOL amount)
  const orderOut = await starpayCreateOrder({
    amount,
    cardType: cardType as "visa" | "mastercard",
    email,
  });
  if (!orderOut.ok) {
    return NextResponse.json(
      { ok: false, message: `Starpay order failed: ${orderOut.message}`, starpayError: orderOut.error },
      { status: orderOut.status || 500 }
    );
  }

  const order = orderOut.data;
  const orderId = String(order?.orderId || "").trim();
  const payAddress = String(order?.payment?.address || "").trim();
  const payAmountSol = Number((order as any)?.payment?.amountSol);
  if (!orderId || !payAddress || !Number.isFinite(payAmountSol) || payAmountSol <= 0) {
    return NextResponse.json(
      { ok: false, message: "Unexpected Starpay response (missing order payment details)." },
      { status: 502 }
    );
  }

  // Step 2: Check user's SOL balance
  let balanceSol = 0;
  try {
    const balRes = await fetch(`${BACKEND_URL}/moonpay/balance`, {
      method: "GET",
      headers: { Authorization: authHeader },
    });
    if (!balRes.ok) {
      const txt = await balRes.text().catch(() => "");
      return NextResponse.json(
        { ok: false, message: `Failed to check balance: ${txt.slice(0, 100)}` },
        { status: 500 }
      );
    }
    const balJson = await balRes.json();
    balanceSol = Number(balJson?.balance_sol || 0);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: `Balance check failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  if (!Number.isFinite(balanceSol) || balanceSol <= 0 || balanceSol < payAmountSol) {
    return NextResponse.json(
      {
        ok: false,
        message: `Insufficient SOL. Need ${payAmountSol.toFixed(6)} SOL, have ${balanceSol.toFixed(6)} SOL.`,
        balanceSol,
        solNeeded: payAmountSol,
        orderId,
      },
      { status: 400 }
    );
  }

  // Return a step-up signature challenge (client signs + re-calls with {orderId, stepUp}).
  const stepUpMessage = mkStepUpMessage({ orderId, toAddress: payAddress, amountSol: payAmountSol });
  return NextResponse.json(
    {
      ok: true,
      needsStepUp: true,
      message: "Signature required to pay this order.",
      order,
      orderId,
      stepUpMessage,
    },
    { status: 200 }
  );
}

