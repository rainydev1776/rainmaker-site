"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

interface PrivyProviderProps {
  children: ReactNode;
}

// Dynamically import the actual Privy wrapper with SSR disabled
// This completely prevents hydration issues from Privy's modal components
const PrivyWrapper = dynamic(
  () => import("./privy-wrapper").then((mod) => mod.PrivyWrapper),
  {
    ssr: false,
    loading: () => null,
  }
);

export const PrivyProvider = ({ children }: PrivyProviderProps) => {
  return <PrivyWrapper>{children}</PrivyWrapper>;
};
