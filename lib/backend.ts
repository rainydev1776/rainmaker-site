import { Buffer } from "buffer";
import { getSolanaRpcHttpUrl } from "./solanaRpc";

export const BACKEND_JWT_STORAGE_KEY = "rm_backend_jwt";

export function getBackendJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BACKEND_JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setBackendJwt(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKEND_JWT_STORAGE_KEY, token);
  } catch {}
}

export function clearBackendJwt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKEND_JWT_STORAGE_KEY);
  } catch {}
}

export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const tok = getBackendJwt();
  if (tok) headers.set("Authorization", `Bearer ${tok}`);

  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function backendFetchJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await backendFetch(path, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`backend_fetch_failed:${res.status}:${txt.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface BackendUser {
  id?: string;
  phantom_pubkey?: string;
  turnkey_address?: string | null;
}

export interface PhantomAuthResponse {
  token: string;
  user: BackendUser;
}

export type PhantomAuthSig = string | number[] | Uint8Array;

export type SolanaAuthProof =
  | { kind: "message"; sig: PhantomAuthSig }
  | { kind: "transaction"; signedTxBase64: string };

function bytesToBase64(bytes: Uint8Array): string {
  // Browser-safe base64 encoding without relying on global Buffer.
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base58Encode(bytes: Uint8Array): string {
  // Minimal base58 encoder (Bitcoin alphabet) to avoid adding deps in the frontend bundle.
  // Compatible with bs58.encode().
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if (!bytes?.length) return "";

  // Count leading zeros.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // Convert base256 -> base58.
  const digits: number[] = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      const x = digits[j] * 256 + carry;
      digits[j] = x % 58;
      carry = (x / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Leading zeros become leading "1".
  let out = "";
  for (let i = 0; i < zeros; i++) out += "1";
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}

function normalizeSignatureToBase58(sig: PhantomAuthSig): string {
  if (typeof sig === "string") return sig;
  if (sig instanceof Uint8Array) return base58Encode(sig);
  if (Array.isArray(sig)) return base58Encode(Uint8Array.from(sig));
  throw new Error("unsupported_signature_format");
}

async function trySignWithProvider(
  provider: unknown,
  bytes: Uint8Array
): Promise<PhantomAuthSig> {
  const p = provider as { signMessage?: (...args: any[]) => any } | null;
  if (!p?.signMessage) throw new Error("no_signMessage");

  // Wallet adapters vary: some accept (bytes), others accept (bytes, encoding)
  const out =
    (await p.signMessage(bytes, "utf8").catch(() => null)) ??
    (await p.signMessage(bytes));

  const sig = (out && typeof out === "object" && "signature" in out
    ? (out as any).signature
    : out) as unknown;

  if (typeof sig === "string") return sig;
  if (sig instanceof Uint8Array) return sig;
  if (Array.isArray(sig)) return sig as number[];
  throw new Error("unsupported_signature_format");
}

async function trySignTransactionWithProvider(
  provider: unknown,
  args: { feePayer: string; memo: string }
): Promise<string> {
  const p = provider as { signTransaction?: (...args: any[]) => any } | null;
  if (!p?.signTransaction) throw new Error("no_signTransaction");

  const { Connection, PublicKey, Transaction, TransactionInstruction } = await import(
    "@solana/web3.js"
  );

  const feePayer = new PublicKey(args.feePayer);
  const conn = new Connection(getSolanaRpcHttpUrl(), "confirmed");
  const { blockhash } = await conn.getLatestBlockhash("confirmed");

  const MEMO_PROGRAM_ID = new PublicKey(
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
  );

  const tx = new Transaction({
    feePayer,
    recentBlockhash: blockhash,
  }).add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      // web3.js expects Buffer here (not Uint8Array) in newer versions
      data: Buffer.from(String(args.memo), "utf8"),
    })
  );

  const signedTx = await p.signTransaction(tx);
  const serialized =
    signedTx?.serialize?.() instanceof Uint8Array
      ? (signedTx.serialize() as Uint8Array)
      : signedTx instanceof Transaction
        ? signedTx.serialize()
        : null;

  if (!serialized) throw new Error("unsupported_signed_tx_format");
  return bytesToBase64(serialized);
}

async function trySignExistingTransactionWithProvider(
  provider: unknown,
  tx: unknown
): Promise<any> {
  const p = provider as { signTransaction?: (...args: any[]) => any } | null;
  if (!p?.signTransaction) throw new Error("no_signTransaction");
  const signed = await p.signTransaction(tx as any);
  // Some wallets return the signed tx; others mutate the input and return void-ish.
  return signed ?? tx;
}

// Best-effort sign across Privy connector variations + Phantom injection fallback.
export async function signMessageBestEffort(args: {
  wallets?: unknown[];
  message: string;
}): Promise<PhantomAuthSig> {
  const bytes = new TextEncoder().encode(args.message);
  const walletsArr = Array.isArray(args.wallets) ? args.wallets : [];

  // 1) Try Privy wallet objects first
  for (const w of walletsArr) {
    const wallet = w as any;

    // Direct signer
    if (wallet?.signMessage) {
      try {
        return await trySignWithProvider(wallet, bytes);
      } catch {}
    }

    // Provider getter patterns (varies by Privy versions/connectors)
    for (const getter of ["getSolanaProvider", "getProvider"]) {
      if (typeof wallet?.[getter] === "function") {
        try {
          const provider = await wallet[getter]();
          return await trySignWithProvider(provider, bytes);
        } catch {}
      }
    }
  }

  // 2) Fallback: window.solana (Phantom injection)
  try {
    const sol = (window as any)?.solana;
    if (sol?.signMessage) {
      return await trySignWithProvider(sol, bytes);
    }
  } catch {}

  throw new Error("no_wallet_signer_available");
}

export async function signAndSendSolanaTxBase64BestEffort(args: {
  wallets?: unknown[];
  txBase64: string;
  rpcUrl?: string;
}): Promise<string> {
  const txB64 = String(args.txBase64 || "").trim();
  if (!txB64) throw new Error("missing_tx_base64");

  const { Connection, Transaction, VersionedTransaction } = await import("@solana/web3.js");

  const raw = Buffer.from(txB64, "base64");
  const isVersioned = (raw[0] & 0x80) !== 0;
  const tx: any = isVersioned
    ? VersionedTransaction.deserialize(raw)
    : Transaction.from(raw);

  // Sign with the best available wallet provider
  const walletsArr = Array.isArray(args.wallets) ? args.wallets : [];
  let signedTx: any | null = null;

  for (const w of walletsArr) {
    const wallet = w as any;
    if (wallet?.signTransaction) {
      try {
        signedTx = await trySignExistingTransactionWithProvider(wallet, tx);
        break;
      } catch {}
    }
    for (const getter of ["getSolanaProvider", "getProvider"]) {
      if (typeof wallet?.[getter] === "function") {
        try {
          const provider = await wallet[getter]();
          signedTx = await trySignExistingTransactionWithProvider(provider, tx);
          break;
        } catch {}
      }
    }
    if (signedTx) break;
  }

  if (!signedTx) {
    try {
      const sol = (window as any)?.solana;
      if (sol?.signTransaction) {
        signedTx = await trySignExistingTransactionWithProvider(sol, tx);
      }
    } catch {}
  }

  if (!signedTx) throw new Error("no_wallet_signer_available");

  const serialized: Uint8Array | Buffer | null =
    typeof signedTx?.serialize === "function"
      ? (signedTx.serialize() as any)
      : typeof tx?.serialize === "function"
        ? (tx.serialize() as any)
        : null;

  if (!serialized) throw new Error("unsupported_signed_tx_format");

  const conn = new Connection(
    String(args.rpcUrl || getSolanaRpcHttpUrl()),
    "confirmed"
  );
  const sig = await conn.sendRawTransaction(serialized, {
    skipPreflight: true,
    maxRetries: 2,
  });
  // Best-effort confirmation (don’t hard fail if RPC can’t confirm quickly)
  conn.confirmTransaction(sig, "confirmed").catch(() => {});
  return sig;
}

export async function createSolanaAuthProofBestEffort(args: {
  wallets?: unknown[];
  address: string;
  message: string;
}): Promise<SolanaAuthProof> {
  // 1) Prefer message signing (works for most non-Ledger wallets).
  try {
    const sig = await signMessageBestEffort({ wallets: args.wallets, message: args.message });
    return { kind: "message", sig };
  } catch {}

  // 2) Ledger fallback: sign a memo-only transaction.
  // Try Privy wallet providers first, then window.solana.
  const walletsArr = Array.isArray(args.wallets) ? args.wallets : [];
  for (const w of walletsArr) {
    const wallet = w as any;
    for (const getter of ["getSolanaProvider", "getProvider"]) {
      if (typeof wallet?.[getter] === "function") {
        try {
          const provider = await wallet[getter]();
          const signedTxBase64 = await trySignTransactionWithProvider(provider, {
            feePayer: args.address,
            memo: args.message,
          });
          return { kind: "transaction", signedTxBase64 };
        } catch {}
      }
    }

    if (wallet?.signTransaction) {
      try {
        const signedTxBase64 = await trySignTransactionWithProvider(wallet, {
          feePayer: args.address,
          memo: args.message,
        });
        return { kind: "transaction", signedTxBase64 };
      } catch {}
    }
  }

  // Fallback: window.solana (Phantom injection)
  try {
    const sol = (window as any)?.solana;
    if (sol?.signTransaction) {
      const signedTxBase64 = await trySignTransactionWithProvider(sol, {
        feePayer: args.address,
        memo: args.message,
      });
      return { kind: "transaction", signedTxBase64 };
    }
  } catch {}

  throw new Error("no_wallet_signer_available");
}

export async function backendLoginWithPhantomSig(args: {
  pubkey: string;
  msg: string;
  sig?: PhantomAuthSig;
  signedTxBase64?: string;
}): Promise<PhantomAuthResponse> {
  const { pubkey, msg, sig, signedTxBase64 } = args;

  const body: any = { pubkey, msg };
  if (signedTxBase64) {
    body.signedTxBase64 = signedTxBase64;
  } else {
    if (!sig) throw new Error("missing_signature");
    // Normalize signature into JSON-safe payload:
    // - string (base58/hex) is fine
    // - Uint8Array becomes number[]
    let sigPayload: string | number[];
    if (typeof sig === "string") sigPayload = sig;
    else if (sig instanceof Uint8Array) sigPayload = Array.from(sig);
    else sigPayload = sig as number[];
    body.sig = sigPayload;
  }

  const res = await fetch("/api/auth/phantom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const err = j?.error ? String(j.error) : `http_${res.status}`;
    const msgTxt = j?.message ? `:${String(j.message)}` : "";
    throw new Error(`phantom_auth_failed:${err}${msgTxt}`);
  }

  return (await res.json()) as PhantomAuthResponse;
}


