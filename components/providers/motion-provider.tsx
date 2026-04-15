"use client";

import { LazyMotion, domAnimation } from "framer-motion";

interface MotionProviderProps {
  children: React.ReactNode;
}

/**
 * LazyMotion provider for performance optimization
 * Uses domAnimation for reduced bundle size (~16kb vs ~25kb)
 * Switch to domMax if you need advanced features like layout animations
 */
export const MotionProvider = ({ children }: MotionProviderProps) => {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
};

