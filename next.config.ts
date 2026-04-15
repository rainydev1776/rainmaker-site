import type { NextConfig } from "next";
import path from "path";

// This app lives in a subdirectory in the repo (monorepo-style). Vercel sets output tracing
// root to the repo root (e.g. /vercel/path0). Turbopack's root must match it to avoid warnings.
const repoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  // Enable React Compiler for automatic optimizations (moved to top-level in Next.js 16)
  reactCompiler: true,

  // Align with Vercel's output tracing root so Next doesn't warn about mismatched roots.
  outputFileTracingRoot: repoRoot,

  // Turbopack configuration
  turbopack: {
    root: repoRoot,
  },

  // Performance optimizations
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
      },
    ],
  },

  // Enable compression
  compress: true,

  // Optimize packages
  transpilePackages: ["framer-motion", "@lifi/widget", "@lifi/sdk", "@lifi/wallet-management"],

  // Exclude problematic packages with test files from server bundle
  serverExternalPackages: ["thread-stream", "pino", "sonic-boom"],

  // Security headers for Privy authentication
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
