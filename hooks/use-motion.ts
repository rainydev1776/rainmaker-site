import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { MOTION_VARIANTS, MOTION_TRANSITION } from "@/lib/constants";

type VariantKey = keyof typeof MOTION_VARIANTS;

interface UseMotionOptions {
  variant?: VariantKey;
  delay?: number;
  duration?: number;
}

/**
 * Custom hook for motion variants that respects reduced motion preferences
 * Returns empty variants if user prefers reduced motion
 */
export const useMotion = ({
  variant = "fadeIn",
  delay = 0,
  duration,
}: UseMotionOptions = {}) => {
  const shouldReduceMotion = useReducedMotion();

  const motionProps = useMemo(() => {
    if (shouldReduceMotion) {
      return {
        initial: undefined,
        animate: undefined,
        variants: undefined,
        transition: undefined,
      };
    }

    return {
      initial: "hidden",
      animate: "visible",
      variants: MOTION_VARIANTS[variant],
      transition: {
        ...MOTION_TRANSITION,
        delay,
        ...(duration && { duration }),
      },
    };
  }, [shouldReduceMotion, variant, delay, duration]);

  return motionProps;
};

/**
 * Hook for staggered children animations
 */
export const useStaggerMotion = (staggerDelay = 0.1) => {
  const shouldReduceMotion = useReducedMotion();

  return useMemo(() => {
    if (shouldReduceMotion) {
      return {
        container: {},
        item: {},
      };
    }

    return {
      container: {
        initial: "hidden",
        animate: "visible",
        variants: {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        },
      },
      item: {
        variants: MOTION_VARIANTS.fadeInUp,
      },
    };
  }, [shouldReduceMotion, staggerDelay]);
};

