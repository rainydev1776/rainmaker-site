"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useSolanaLedgerPlugin } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { ReactNode } from "react";
import { getSolanaRpcHttpUrl, SOLANA_TRACKER_WS_URL } from "@/lib/solanaRpc";

// Ledger plugin component - must be inside PrivyProvider
const SolanaLedgerSetup = () => {
  useSolanaLedgerPlugin();
  return null;
};

interface PrivyWrapperProps {
  children: ReactNode;
}

// Configure Solana wallet connectors (Phantom, Solflare, etc.)
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

// Suppress Privy's invalid HTML nesting warnings immediately
// This is a known bug in Privy's modal components (<div> inside <p>)
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("cannot be a descendant of") ||
        message.includes("cannot contain") ||
        message.includes("validateDOMNesting") ||
        message.includes("Hydration"))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

// Detect Capacitor native shell (iOS/Android) where external wallet deep links don't work.
const isNativeApp =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();

export const PrivyWrapper = ({ children }: PrivyWrapperProps) => {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const solanaRpcUrl = getSolanaRpcHttpUrl();

  if (!appId) {
    console.error("Missing NEXT_PUBLIC_PRIVY_APP_ID environment variable");
    return <>{children}</>;
  }

  return (
    <Privy
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          logo: undefined,
          walletChainType: "solana-only",
        },
        loginMethods: isNativeApp ? ["email"] : ["wallet", "email"],
        externalWallets: isNativeApp
          ? undefined
          : {
              solana: {
                connectors: solanaConnectors,
              },
            },
        // Ensure Solana RPCs are explicitly configured for mainnet.
        // This improves reliability for standard wallet hooks + Ledger auth flow.
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                SOLANA_TRACKER_WS_URL
              ),
              blockExplorerUrl: "https://explorer.solana.com",
            },
          },
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <SolanaLedgerSetup />
      {children}
    </Privy>
  );
};
