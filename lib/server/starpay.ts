import "server-only";

const STARPAY_BASE_URL = "https://www.starpay.cards/api/v1";

export type StarpayCardType = "visa" | "mastercard";

export type StarpayCreateOrderArgs = {
  amount: number;
  cardType: StarpayCardType;
  email: string;
};

export type StarpayOrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | string;

export type StarpayOrderPayment = {
  address: string;
  amountSol: number;
  solPrice: number;
};

export type StarpayOrderPricing = {
  cardValue?: number;
  starpayFeePercent?: number;
  starpayFee?: number;
  resellerMarkup?: number;
  total?: number;
};

export type StarpayCreateOrderOk = {
  orderId: string;
  status: StarpayOrderStatus;
  payment: StarpayOrderPayment;
  pricing?: StarpayOrderPricing;
  feeTier?: string;
  expiresAt?: string;
  checkStatusUrl?: string;
};

export type StarpayError = {
  success: false;
  error?: string;
  message?: string;
  required?: number;
  available?: number;
};

export type StarpayCreateOrderResult =
  | { ok: true; data: StarpayCreateOrderOk }
  | { ok: false; status: number; error: StarpayError | null; message: string };

export type StarpayOrderStatusOk = {
  orderId: string;
  status: StarpayOrderStatus;
  payment?: StarpayOrderPayment;
  pricing?: StarpayOrderPricing;
  feeTier?: string;
  expiresAt?: string;
  checkStatusUrl?: string;
};

export type StarpayOrderStatusResult =
  | { ok: true; data: StarpayOrderStatusOk }
  | { ok: false; status: number; error: StarpayError | null; message: string };

export type StarpayAccountOk = {
  walletAddress?: string;
  projectName?: string;
  balance: number;
  markup?: number;
  totalCardsIssued?: number;
  totalVolume?: number;
  status?: string;
};

export type StarpayAccountResult =
  | { ok: true; data: StarpayAccountOk }
  | { ok: false; status: number; error: StarpayError | null; message: string };

function getStarpayApiKey(): string | null {
  const k = String(process.env.STARPAY_API_KEY || "").trim();
  return k ? k : null;
}

async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function starpayFetch(path: string, init: RequestInit): Promise<Response> {
  const apiKey = getStarpayApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "NOT_CONFIGURED", message: "Starpay is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");

  // Only set content-type if the caller provided a body.
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${STARPAY_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function starpayCreateOrder(
  args: StarpayCreateOrderArgs
): Promise<StarpayCreateOrderResult> {
  const res = await starpayFetch("/cards/order", {
    method: "POST",
    body: JSON.stringify({
      amount: args.amount,
      cardType: args.cardType,
      email: args.email,
    }),
  });

  const j = await safeJson(res);
  if (!res.ok) {
    const msg =
      String(j?.message || "").trim() ||
      `Starpay error (${res.status}).`;
    return { ok: false, status: res.status, error: j as StarpayError | null, message: msg };
  }

  // Expected (docs): { orderId, status, payment:{address,amountSol,solPrice}, pricing:{...}, ... }
  const orderId = String(j?.orderId || "").trim();
  const paymentAddress = String(j?.payment?.address || "").trim();
  const amountSol = Number(j?.payment?.amountSol);
  const solPrice = Number(j?.payment?.solPrice);
  if (!orderId) {
    return { ok: false, status: 502, error: null, message: "Unexpected Starpay response (missing orderId)." };
  }
  if (!paymentAddress || !Number.isFinite(amountSol) || amountSol <= 0 || !Number.isFinite(solPrice) || solPrice <= 0) {
    return { ok: false, status: 502, error: null, message: "Unexpected Starpay response (missing payment details)." };
  }

  return { ok: true, data: j as StarpayCreateOrderOk };
}

export async function starpayGetOrderStatus(
  args: { orderId: string }
): Promise<StarpayOrderStatusResult> {
  const orderId = String(args.orderId || "").trim();
  const url = `/cards/order/status?orderId=${encodeURIComponent(orderId)}`;

  const res = await starpayFetch(url, { method: "GET" });
  const j = await safeJson(res);
  if (!res.ok) {
    const msg =
      String(j?.message || "").trim() ||
      `Starpay error (${res.status}).`;
    return { ok: false, status: res.status, error: j as StarpayError | null, message: msg };
  }

  const out = j as StarpayOrderStatusOk;
  if (!String((out as any)?.orderId || "").trim()) {
    return { ok: false, status: 502, error: null, message: "Unexpected Starpay response (missing orderId)." };
  }

  return { ok: true, data: out };
}

export async function starpayGetAccount(): Promise<StarpayAccountResult> {
  const res = await starpayFetch("/me", { method: "GET" });
  const j = await safeJson(res);
  if (!res.ok) {
    const msg =
      String(j?.message || "").trim() ||
      `Starpay error (${res.status}).`;
    return { ok: false, status: res.status, error: j as StarpayError | null, message: msg };
  }

  const out = j as StarpayAccountOk;
  const bal = Number((out as any)?.balance);
  if (!Number.isFinite(bal)) {
    return { ok: false, status: 502, error: null, message: "Unexpected Starpay response (missing balance)." };
  }

  return { ok: true, data: { ...out, balance: bal } };
}


