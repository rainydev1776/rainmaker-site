"use client";

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export const RainmakerLogo = ({ className }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
    >
      <path
        d="M12 4C8.5 4 5.5 6.5 4.5 10C3.5 13.5 5 17 8 19C9.5 20 11 20.5 12 20.5C13 20.5 14.5 20 16 19C19 17 20.5 13.5 19.5 10C18.5 6.5 15.5 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4V2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 10C8 10 9.5 12 12 12C14.5 12 16 10 16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Alternative: Double peak mountain/umbrella style logo matching the reference
export const RainmakerLogoAlt = ({ className }: IconProps) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7", className)}
    >
      {/* Umbrella/cloud shape with two peaks */}
      <path
        d="M6 18C6 12 10 6 16 6C22 6 26 12 26 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11 18C11 14 13 10 16 10C19 10 21 14 21 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 18V26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 26C16 26 14 26 13 25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

