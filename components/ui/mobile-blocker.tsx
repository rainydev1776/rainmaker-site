"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const TABLET_BREAKPOINT = 940;

export const MobileBlocker = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < TABLET_BREAKPOINT);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center bg-[#08080B] px-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/rainmaker-logo.svg"
            alt="Rainmaker"
            width={48}
            height={48}
            className="mb-6"
          />
          <h1 className="mb-3 text-xl font-semibold text-white">
            Desktop Experience
          </h1>
          <p className="max-w-[280px] text-sm text-zinc-400">
            Use on desktop for the most optimal experience.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
