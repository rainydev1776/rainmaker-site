"use client";

import { useState } from "react";
import Image from "next/image";

interface SportIconProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  fallbackEmoji?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const emojiSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

// Match the selected sidebar tab background so icon tiles don't feel too dark.
const SPORT_TILE_STYLE = {
  background:
    "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.05)",
  boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
} as const;

export const SportIcon = ({
  src,
  alt,
  size = "md",
  fallbackEmoji = "🏈",
}: SportIconProps) => {
  const [hasError, setHasError] = useState(false);

  // Support emoji icons (e.g. "emoji:🏀") to keep all sport tiles consistent.
  if (String(src || "").startsWith("emoji:")) {
    const emoji = String(src).replace("emoji:", "") || fallbackEmoji;
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${sizeClasses[size]} ${emojiSizeClasses[size]}`}
        style={SPORT_TILE_STYLE}
        aria-label={alt}
      >
        {emoji}
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${sizeClasses[size]} ${emojiSizeClasses[size]}`}
        style={SPORT_TILE_STYLE}
      >
        {fallbackEmoji}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${sizeClasses[size]}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

