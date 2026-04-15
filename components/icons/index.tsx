"use client";

import { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

export const XIcon = (props: IconProps) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const TelegramIcon = (props: IconProps) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

export const SolanaIcon = (props: IconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 397 311"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
      fill="url(#solana-gradient-1)"
    />
    <path
      d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
      fill="url(#solana-gradient-2)"
    />
    <path
      d="M332.1 120.9c-2.4-2.4-5.7-3.8-9.2-3.8H5.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
      fill="url(#solana-gradient-3)"
    />
    <defs>
      <linearGradient
        id="solana-gradient-1"
        x1="360.879"
        y1="-37.4553"
        x2="141.213"
        y2="383.294"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient
        id="solana-gradient-2"
        x1="264.829"
        y1="-87.6014"
        x2="45.163"
        y2="333.147"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient
        id="solana-gradient-3"
        x1="312.548"
        y1="-62.6883"
        x2="92.8822"
        y2="358.061"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
);

export const SolanaIconSimple = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.12 17.196a.654.654 0 01.463-.192h13.784a.327.327 0 01.231.558l-2.79 2.79a.654.654 0 01-.462.192H2.563a.327.327 0 01-.231-.558l2.789-2.79z"
      fill="currentColor"
    />
    <path
      d="M5.12 3.648A.67.67 0 015.583 3.456h13.784a.327.327 0 01.231.558l-2.79 2.79a.654.654 0 01-.462.192H2.563a.327.327 0 01-.231-.558l2.789-2.79z"
      fill="currentColor"
    />
    <path
      d="M18.88 10.367a.654.654 0 00-.463-.192H4.633a.327.327 0 00-.231.558l2.79 2.79c.122.123.288.192.462.192h13.783a.327.327 0 00.231-.558l-2.789-2.79z"
      fill="currentColor"
    />
  </svg>
);

